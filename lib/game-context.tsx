"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { UPGRADES, type ResourceKey, type Resources } from "./game-data"
import type { Lang } from "./i18n"
import { getGameUser, supabase, telegramInitData } from "./supabase"
import { api, ApiError, type BattleAction, type BattleSession, type BattleSummary, type PlayerProfile, type StageStat } from "./api"
import { audio } from "./audio"

export interface GameState {
  hydrated: boolean
  syncStatus: "connecting" | "saved" | "offline"
  lang: Lang
  audioMuted: boolean
  profile: PlayerProfile
  resources: Resources
  // Local display-only accrual between authoritative server settlements.
  localBonus: Resources
  buildings: Record<string, number>
  completedStages: number[]
  stageStats: Record<string, StageStat>
  answeredTrivia: number[]
  unlockedAchievements: string[]
}

const STARTING: GameState = {
  hydrated: false,
  syncStatus: "connecting",
  lang: "en",
  audioMuted: false,
  profile: {
    displayName: "Arbegna",
    telegramLinked: false,
    totalScore: 0,
    xp: 0,
    level: 1,
    lifetimeBattles: 0,
    lifetimeWins: 0,
    bestAccuracy: 0,
    bestCombo: 0,
    referralCode: null,
    referredBy: null,
  },
  resources: { fighters: 12, provisions: 40, morale: 20 },
  localBonus: { fighters: 0, provisions: 0, morale: 0 },
  buildings: {},
  completedStages: [],
  stageStats: {},
  answeredTrivia: [],
  unlockedAchievements: [],
}

export function computeRates(buildings: Record<string, number>): Resources {
  const rates: Resources = { fighters: 0, provisions: 0, morale: 0 }
  for (const u of UPGRADES) rates[u.resource] += u.baseRate * (buildings[u.id] ?? 0)
  return rates
}

interface GameContextValue extends GameState {
  displayedResources: Resources
  rates: Resources
  referralLink: string
  setLang: (lang: Lang) => void
  toggleAudio: () => void
  gather: (resource: ResourceKey) => void
  buyUpgrade: (id: string) => Promise<void>
  canAfford: (id: string) => boolean
  prepareBattle: (stageId: number) => Promise<BattleSession>
  finishBattle: (
    sessionId: string,
    actions: BattleAction[],
    formation?: "shieldwall" | "scouts" | "rally",
  ) => Promise<BattleSummary>
  answerTrivia: (questionId: number, answerIndex: number) => Promise<{ correct: boolean; rewarded: boolean }>
  refreshState: () => Promise<void>
}

const GameContext = createContext<GameContextValue | null>(null)

const LANG_KEY = "zemene_lang"
const AUDIO_KEY = "zemene_audio_muted"
const REFERRAL_KEY = "zemene_referral_processed"

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(STARTING)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const patch = useCallback((p: Partial<GameState>) => setState((s) => ({ ...s, ...p })), [])
  const markSaved = () => setState((s) => ({ ...s, syncStatus: "saved" }))
  const markOffline = () => setState((s) => ({ ...s, syncStatus: "offline" }))
  const applyServerResources = useCallback((res: Partial<Resources>) => {
    setState((s) => ({
      ...s,
      resources: { ...s.resources, ...res },
      localBonus: { fighters: 0, provisions: 0, morale: 0 },
    }))
  }, [])

  // ---- hydration ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      audio.init()
      let muted = false
      try {
        muted = localStorage.getItem(AUDIO_KEY) === "true"
        const savedLang = localStorage.getItem(LANG_KEY)
        if (savedLang === "am" || savedLang === "en") patch({ lang: savedLang })
      } catch {}
      audio.setMuted(muted)
      const resumeAudio = () => {
        audio.resume()
        document.removeEventListener("click", resumeAudio)
        document.removeEventListener("touchstart", resumeAudio)
      }
      document.addEventListener("click", resumeAudio, { once: true })
      document.addEventListener("touchstart", resumeAudio, { once: true })

      try {
        const tg = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void; initDataUnsafe?: { user?: { first_name?: string }; startParam?: string } } } }).Telegram?.WebApp
        try {
          tg?.ready?.()
          tg?.expand?.()
        } catch {}

        try {
          await getGameUser()
        } catch (err) {
          console.error("[GameProvider] Anonymous auth failed:", err)
          patch({ syncStatus: "offline" })
          return
        }

        // Link the real Telegram identity server-side (initData HMAC-validated
        // in the database). initDataUnsafe is never used for identity.
        const initData = telegramInitData()
        if (initData) {
          try {
            await api.linkTelegram(initData)
          } catch {}
        }

        const snap = await api.initState()
        if (cancelled) return
        patch({
          hydrated: true,
          profile: snap.profile,
          resources: snap.resources,
          buildings: snap.buildings,
          completedStages: snap.completedStages,
          stageStats: snap.stageStats,
          answeredTrivia: snap.answeredTrivia,
          unlockedAchievements: snap.unlockedAchievements,
          syncStatus: "saved",
        })

        // Settle idle production accrued since the last visit.
        try {
          const claimed = await api.claimPassive()
          if (!cancelled) applyServerResources(claimed.resources)
        } catch {}

        // Server-validated one-time referral attribution.
        const tgStart = tg?.initDataUnsafe?.startParam
        const urlParam = new URLSearchParams(window.location.search).get("startapp")
        const code = (tgStart || urlParam || "").trim().toUpperCase()
        if (code && !localStorage.getItem(REFERRAL_KEY)) {
          try {
            const r = await api.processReferral(code)
            if (r.ok) {
              localStorage.setItem(REFERRAL_KEY, "1")
              applyServerResources(r.resources ?? {})
            }
          } catch {}
        }
      } catch {
        if (!cancelled) markOffline()
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [patch, applyServerResources])

  // ---- periodic reconciliation -------------------------------------------
  useEffect(() => {
    if (!state.hydrated || !supabase) return
    const timer = window.setInterval(async () => {
      try {
        const claimed = await api.claimPassive()
        applyServerResources(claimed.resources)
        markSaved()
      } catch {
        markOffline()
      }
    }, 120_000)
    return () => clearInterval(timer)
  }, [state.hydrated, applyServerResources])

  const rates = useMemo(() => computeRates(state.buildings), [state.buildings])
  const displayedResources = useMemo(
    () => ({
      fighters: Math.floor(state.resources.fighters + state.localBonus.fighters),
      provisions: Math.floor(state.resources.provisions + state.localBonus.provisions),
      morale: Math.floor(state.resources.morale + state.localBonus.morale),
    }),
    [state.resources, state.localBonus],
  )

  // Local visual tick between authoritative settlements (display-only).
  useEffect(() => {
    if (!state.hydrated) return
    const timer = window.setInterval(() => {
      setState((s) => {
        const r = computeRates(s.buildings)
        return {
          ...s,
          localBonus: {
            fighters: s.localBonus.fighters + r.fighters,
            provisions: s.localBonus.provisions + r.provisions,
            morale: s.localBonus.morale + r.morale,
          },
        }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [state.hydrated])

  // ---- actions -------------------------------------------------------------
  const setLang = useCallback(
    (lang: Lang) => {
      patch({ lang })
      try {
        localStorage.setItem(LANG_KEY, lang)
      } catch {}
    },
    [patch],
  )

  const toggleAudio = useCallback(() => {
    const muted = !stateRef.current.audioMuted
    patch({ audioMuted: muted })
    audio.setMuted(muted)
    try {
      localStorage.setItem(AUDIO_KEY, String(muted))
    } catch {}
  }, [patch])

  const gather = useCallback(
    (resource: ResourceKey) => {
      // Optimistic visual feedback, then reconcile with the server grant.
      const gain = resource === "provisions" ? 3 : resource === "fighters" ? 1 : 2
      setState((s) => ({
        ...s,
        localBonus: { ...s.localBonus, [resource]: s.localBonus[resource] + gain },
      }))
      audio.play("gather")
      void api
        .gather(resource)
        .then((r) => applyServerResources(r.resources))
        .catch(markOffline)
    },
    [applyServerResources],
  )

  const buyUpgrade = useCallback(
    async (id: string) => {
      try {
        const r = await api.upgradeBuilding(id)
        if (r.ok && r.resources) {
          setState((s) => ({
            ...s,
            resources: r.resources!,
            localBonus: { fighters: 0, provisions: 0, morale: 0 },
            buildings: { ...s.buildings, [id]: r.level ?? (s.buildings[id] ?? 0) + 1 },
          }))
          audio.play("upgrade")
        }
      } catch {
        markOffline()
      }
    },
    [],
  )

  const canAfford = useCallback(
    (id: string) => {
      const def = UPGRADES.find((u) => u.id === id)
      if (!def) return false
      const level = state.buildings[id] ?? 0
      const cost = Math.floor(def.baseCost * Math.pow(1.55, level))
      return displayedResources[def.costResource] >= cost
    },
    [state.buildings, displayedResources],
  )

  const prepareBattle = useCallback(async (stageId: number): Promise<BattleSession> => {
    const session = await api.startBattle(stageId)
    return session
  }, [])

  const finishBattle = useCallback(
    async (
      sessionId: string,
      actions: BattleAction[],
      formation?: "shieldwall" | "scouts" | "rally",
    ): Promise<BattleSummary> => {
      const summary = await api.submitBattle(sessionId, actions, formation)
      if (summary.ok) {
        setState((s) => ({
          ...s,
          resources: summary.resources,
          localBonus: { fighters: 0, provisions: 0, morale: 0 },
          profile: { ...s.profile, totalScore: summary.totalScore },
          // completedStages is refreshed authoritatively via initState() below.
          unlockedAchievements:
            summary.newBadges.length > 0
              ? [...new Set([...s.unlockedAchievements, ...summary.newBadges])]
              : s.unlockedAchievements,
        }))
        // Refresh campaign stats authoritatively after completion changes.
        void api
          .initState()
          .then((snap) =>
            setState((s) => ({
              ...s,
              completedStages: snap.completedStages,
              stageStats: snap.stageStats,
              profile: snap.profile,
            })),
          )
          .catch(() => undefined)
      }
      return summary
    },
    [],
  )

  const answerTrivia = useCallback(
    async (questionId: number, answerIndex: number) => {
      const r = await api.submitTrivia(questionId, answerIndex)
      if (r.rewarded && r.resources) {
        setState((s) => ({
          ...s,
          resources: r.resources!,
          localBonus: { fighters: 0, provisions: 0, morale: 0 },
          answeredTrivia: [...new Set([...s.answeredTrivia, questionId])],
          profile: { ...s.profile, totalScore: s.profile.totalScore + r.scoreGain },
        }))
        audio.play("triviaCorrect")
      }
      return { correct: r.correct, rewarded: r.rewarded }
    },
    [],
  )

  const refreshState = useCallback(async () => {
    try {
      const snap = await api.initState()
      setState((s) => ({
        ...s,
        profile: snap.profile,
        resources: snap.resources,
        buildings: snap.buildings,
        completedStages: snap.completedStages,
        stageStats: snap.stageStats,
        answeredTrivia: snap.answeredTrivia,
        unlockedAchievements: snap.unlockedAchievements,
        syncStatus: "saved",
      }))
    } catch {
      markOffline()
    }
  }, [])

  const referralLink = `https://t.me/ermurrybot/ZemeneArbegnoch?startapp=${state.profile.referralCode ?? ""}`

  const value = useMemo<GameContextValue>(
    () => ({
      ...state,
      displayedResources,
      rates,
      referralLink,
      setLang,
      toggleAudio,
      gather,
      buyUpgrade,
      canAfford,
      prepareBattle,
      finishBattle,
      answerTrivia,
      refreshState,
    }),
    [
      state,
      displayedResources,
      rates,
      referralLink,
      setLang,
      toggleAudio,
      gather,
      buyUpgrade,
      canAfford,
      prepareBattle,
      finishBattle,
      answerTrivia,
      refreshState,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within GameProvider")
  return ctx
}
