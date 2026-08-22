"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react"
import { CHAPTERS, UPGRADES, upgradeCost, BADGES, type ResourceKey, type Resources } from "./game-data"
import type { Lang } from "./i18n"
import { getGameUser, loadGameState, saveGameState, trackGameEvent, type SyncStatus } from "./supabase"
import { audio } from "./audio"

interface GameState {
  lang: Lang; displayName: string; resources: Resources; rates: Resources; upgradeLevels: Record<string, number>
  currentChapter: number; completedChapters: number[]; battlesFought: number; score: number
  answeredTrivia: number[]; referredBy: string | null; hydrated: boolean
  audioMuted: boolean; sniperHits: number; sniperShots: number
}
const STARTING: GameState = {
  lang: "en", displayName: "Arbegna", resources: { fighters: 12, provisions: 40, morale: 20 },
  rates: { fighters: 0, provisions: 0, morale: 0 }, upgradeLevels: {}, currentChapter: 1,
  completedChapters: [], battlesFought: 0, score: 0, answeredTrivia: [], referredBy: null, hydrated: false,
  audioMuted: false, sniperHits: 0, sniperShots: 0,
}
type Action =
  | { type: "HYDRATE"; payload: Partial<GameState> } | { type: "SET_LANG"; lang: Lang } | { type: "SET_NAME"; name: string }
  | { type: "TICK"; dt: number } | { type: "GATHER"; resource: ResourceKey } | { type: "BUY_UPGRADE"; id: string }
  | { type: "WIN_BATTLE"; chapterId: number } | { type: "LOSE_BATTLE" } | { type: "TRIVIA_REWARD"; questionId: number }
  | { type: "REFERRAL_BONUS"; ref: string } | { type: "SET_AUDIO_MUTED"; muted: boolean }
  | { type: "SNIPER_HIT" } | { type: "SNIPER_SHOT" }
function computeRates(levels: Record<string, number>): Resources {
  const rates: Resources = { fighters: 0, provisions: 0, morale: 0 }
  for (const u of UPGRADES) rates[u.resource] += u.baseRate * (levels[u.id] ?? 0)
  return rates
}
function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE": { const next = { ...state, ...action.payload, hydrated: true }; next.rates = computeRates(next.upgradeLevels); return next }
    case "SET_LANG": return { ...state, lang: action.lang }
    case "SET_NAME": return { ...state, displayName: action.name.trim() || "Arbegna" }
    case "TICK": return { ...state, resources: Object.fromEntries(Object.entries(state.resources).map(([k, v]) => [k, v + state.rates[k as ResourceKey] * action.dt])) as Resources }
    case "GATHER": { const gain = action.resource === "provisions" ? 3 : action.resource === "fighters" ? 1 : 2; return { ...state, resources: { ...state.resources, [action.resource]: state.resources[action.resource] + gain } } }
    case "BUY_UPGRADE": {
      const def = UPGRADES.find((u) => u.id === action.id); if (!def) return state
      const level = state.upgradeLevels[action.id] ?? 0; const cost = upgradeCost(def, level)
      if (state.resources[def.costResource] < cost) return state
      const upgradeLevels = { ...state.upgradeLevels, [action.id]: level + 1 }
      return { ...state, resources: { ...state.resources, [def.costResource]: state.resources[def.costResource] - cost }, upgradeLevels, rates: computeRates(upgradeLevels), score: state.score + 5 }
    }
    case "WIN_BATTLE": {
      if (state.completedChapters.includes(action.chapterId)) return state
      const chapter = CHAPTERS.find((c) => c.id === action.chapterId); if (!chapter) return state
      const resources = { ...state.resources }; for (const [key, amount] of Object.entries(chapter.reward)) resources[key as ResourceKey] += amount as number
      return { ...state, resources, completedChapters: [...state.completedChapters, action.chapterId], currentChapter: Math.min(action.chapterId + 1, CHAPTERS.length), battlesFought: state.battlesFought + 1, score: state.score + chapter.scoreReward }
    }
    case "LOSE_BATTLE": return { ...state, battlesFought: state.battlesFought + 1 }
    case "TRIVIA_REWARD": return state.answeredTrivia.includes(action.questionId) ? state : { ...state, resources: { fighters: state.resources.fighters + 10, provisions: state.resources.provisions + 40, morale: state.resources.morale + 25 }, answeredTrivia: [...state.answeredTrivia, action.questionId], score: state.score + 50 }
    case "REFERRAL_BONUS": return state.referredBy ? state : { ...state, referredBy: action.ref, resources: { fighters: state.resources.fighters + 15, provisions: state.resources.provisions + 50, morale: state.resources.morale + 30 } }
    case "SET_AUDIO_MUTED": return { ...state, audioMuted: action.muted }
    case "SNIPER_HIT": return { ...state, sniperHits: state.sniperHits + 1 }
    case "SNIPER_SHOT": return { ...state, sniperShots: state.sniperShots + 1 }
  }
}
interface GameContextValue extends GameState {
  telegramId: string; referralLink: string; syncStatus: SyncStatus; setLang: (lang: Lang) => void; setName: (name: string) => void
  gather: (resource: ResourceKey) => void; buyUpgrade: (id: string) => void; winBattle: (chapterId: number, formation: string) => void; loseBattle: (chapterId: number, formation: string) => void
  triviaReward: (questionId: number) => void; unlockedBadges: string[]; canAfford: (id: string) => boolean
  toggleAudio: () => void; sniperHit: () => void; sniperShot: () => void
  sniperAccuracy: number
}
const GameContext = createContext<GameContextValue | null>(null)
const STORAGE_KEY = "zemene_arbegnoch_save_v3"
const persistable = (state: GameState) => ({ ...state, hydrated: undefined, rates: undefined })

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, STARTING)
  const lastTick = useRef(Date.now()), telegramId = useRef("demo_player"), userId = useRef<string | null>(null)
  const stateRef = useRef(state)
  const [syncStatus, setSyncStatus] = useReducer((_: SyncStatus, next: SyncStatus) => next, "connecting")
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      let saved: Partial<GameState> = {}
      try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) saved = JSON.parse(raw) } catch {}
      // Hydrate audio mute preference
      try {
        saved.audioMuted = localStorage.getItem("zemene_audio_muted") === "true"
      } catch {}
      audio.init()
      if (!saved.audioMuted) audio.setMuted(false)
      else audio.setMuted(true)
      const resumeAudio = () => {
        audio.resume()
        document.removeEventListener("click", resumeAudio)
        document.removeEventListener("touchstart", resumeAudio)
      }
      document.addEventListener("click", resumeAudio, { once: true })
      document.addEventListener("touchstart", resumeAudio, { once: true })
      const tg = (window as any).Telegram?.WebApp
      if (tg?.initDataUnsafe?.user?.id) { telegramId.current = String(tg.initDataUnsafe.user.id); const user = tg.initDataUnsafe.user; saved.displayName ||= user.first_name || user.username; try { tg.ready?.(); tg.expand?.() } catch {} }
      const params = new URLSearchParams(window.location.search)
      const param = tg?.initDataUnsafe?.start_param || params.get("startapp") || params.get("ref")
      if (param?.startsWith("ref_") && !saved.referredBy) (saved as Record<string, unknown>).__pendingRef = param
      try {
        const user = await getGameUser(telegramId.current, saved.displayName)
        if (user) { userId.current = user.id; const remote = await loadGameState(user.id); if (remote?.state && typeof remote.state === "object") saved = { ...saved, ...(remote.state as Partial<GameState>) }; if (!cancelled) setSyncStatus("saved") }
        else if (!cancelled) setSyncStatus("offline")
      } catch { if (!cancelled) setSyncStatus("offline") }
      if (!cancelled) { dispatch({ type: "HYDRATE", payload: saved }); const pendingRef = (saved as Record<string, unknown>).__pendingRef; if (typeof pendingRef === "string") dispatch({ type: "REFERRAL_BONUS", ref: pendingRef }) }
    }
    void hydrate(); return () => { cancelled = true }
  }, [])
  useEffect(() => { const timer = window.setInterval(() => { const now = Date.now(); dispatch({ type: "TICK", dt: (now - lastTick.current) / 1000 }); lastTick.current = now }, 1000); return () => clearInterval(timer) }, [])
  useEffect(() => { if (state.hydrated) try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(state))) } catch {} }, [state])
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => {
    if (!state.hydrated || !userId.current) return
    const timer = window.setInterval(() => { const id = userId.current; if (id) void saveGameState(id, persistable(stateRef.current)).then(() => setSyncStatus("saved")).catch(() => setSyncStatus("offline")) }, 10000)
    return () => clearInterval(timer)
  }, [state.hydrated])
  const event = useCallback((eventType: string, payload: Record<string, unknown> = {}) => { const id = userId.current; if (id) void trackGameEvent(id, eventType, payload).catch(() => undefined) }, [])
  const setLang = useCallback((lang: Lang) => { dispatch({ type: "SET_LANG", lang }); event("language_changed", { lang }) }, [event])
  const setName = useCallback((name: string) => dispatch({ type: "SET_NAME", name }), [])
  const gather = useCallback((resource: ResourceKey) => { dispatch({ type: "GATHER", resource }); event("gathered", { resource }); audio.play("gather") }, [event])
  const buyUpgrade = useCallback((id: string) => { dispatch({ type: "BUY_UPGRADE", id }); event("upgrade_attempted", { id }); audio.play("upgrade") }, [event])
  const winBattle = useCallback((chapterId: number, formation: string) => { dispatch({ type: "WIN_BATTLE", chapterId }); event("battle_won", { chapterId, formation }) }, [event])
  const loseBattle = useCallback((chapterId: number, formation: string) => { dispatch({ type: "LOSE_BATTLE" }); event("battle_lost", { chapterId, formation }) }, [event])
  const triviaReward = useCallback((questionId: number) => { dispatch({ type: "TRIVIA_REWARD", questionId }); event("trivia_correct", { questionId }); audio.play("triviaCorrect") }, [event])
  const toggleAudio = useCallback(() => { const muted = !state.audioMuted; dispatch({ type: "SET_AUDIO_MUTED", muted }); audio.setMuted(muted); event("audio_toggled", { muted }) }, [state.audioMuted, event])
  const sniperHit = useCallback(() => { dispatch({ type: "SNIPER_HIT" }); event("sniper_hit") }, [event])
  const sniperShot = useCallback(() => { dispatch({ type: "SNIPER_SHOT" }); event("sniper_shot") }, [event])
  const unlockedBadges = useMemo(() => BADGES.filter((b) => state.completedChapters.includes(b.chapterRequired)).map((b) => b.id), [state.completedChapters])
  const canAfford = useCallback((id: string) => { const def = UPGRADES.find((u) => u.id === id); return !!def && state.resources[def.costResource] >= upgradeCost(def, state.upgradeLevels[id] ?? 0) }, [state.resources, state.upgradeLevels])
  const referralLink = `https://t.me/ermurrybot/ZemeneArbegnoch?startapp=ref_${telegramId.current}`
  const sniperAccuracy = state.sniperShots > 0 ? Math.round((state.sniperHits / state.sniperShots) * 100) : 0
  return <GameContext.Provider value={{ ...state, telegramId: telegramId.current, referralLink, syncStatus, setLang, setName, gather, buyUpgrade, winBattle, loseBattle, triviaReward, unlockedBadges, canAfford, toggleAudio, sniperHit, sniperShot, sniperAccuracy }}>{children}</GameContext.Provider>
}
export function useGame() { const context = useContext(GameContext); if (!context) throw new Error("useGame must be used within GameProvider"); return context }
