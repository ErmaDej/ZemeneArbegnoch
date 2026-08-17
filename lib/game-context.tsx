"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react"
import {
  CHAPTERS,
  UPGRADES,
  upgradeCost,
  BADGES,
  type ResourceKey,
  type Resources,
} from "./game-data"
import type { Lang } from "./i18n"

// ---------------------------------------------------------------------------
// NOTE: This is the "visual game first" build. State is kept in memory and
// mirrored to localStorage so the loop is fully playable in the preview.
// Persistence, leaderboard, referrals, and trivia bank move to Supabase
// (players, campaign_progress, trivia_bank, referrals) in the next phase.
// ---------------------------------------------------------------------------

interface GameState {
  lang: Lang
  displayName: string
  resources: Resources
  rates: Resources
  upgradeLevels: Record<string, number>
  currentChapter: number // 1-indexed next chapter to attempt
  completedChapters: number[]
  battlesFought: number
  score: number
  answeredTrivia: number[]
  referredBy: string | null
  hydrated: boolean
}

const STARTING: GameState = {
  lang: "am",
  displayName: "Arbegna",
  resources: { fighters: 12, provisions: 40, morale: 20 },
  rates: { fighters: 0, provisions: 0, morale: 0 },
  upgradeLevels: {},
  currentChapter: 1,
  completedChapters: [],
  battlesFought: 0,
  score: 0,
  answeredTrivia: [],
  referredBy: null,
  hydrated: false,
}

type Action =
  | { type: "HYDRATE"; payload: Partial<GameState> }
  | { type: "SET_LANG"; lang: Lang }
  | { type: "SET_NAME"; name: string }
  | { type: "TICK"; dt: number }
  | { type: "GATHER"; resource: ResourceKey }
  | { type: "BUY_UPGRADE"; id: string }
  | { type: "WIN_BATTLE"; chapterId: number }
  | { type: "TRIVIA_REWARD"; questionId: number }
  | { type: "REFERRAL_BONUS"; ref: string }

function computeRates(levels: Record<string, number>): Resources {
  const rates: Resources = { fighters: 0, provisions: 0, morale: 0 }
  for (const u of UPGRADES) {
    const lvl = levels[u.id] ?? 0
    rates[u.resource] += u.baseRate * lvl
  }
  return rates
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE": {
      const merged = { ...state, ...action.payload, hydrated: true }
      merged.rates = computeRates(merged.upgradeLevels)
      return merged
    }
    case "SET_LANG":
      return { ...state, lang: action.lang }
    case "SET_NAME":
      return { ...state, displayName: action.name || "Arbegna" }
    case "TICK": {
      const r = state.resources
      return {
        ...state,
        resources: {
          fighters: r.fighters + state.rates.fighters * action.dt,
          provisions: r.provisions + state.rates.provisions * action.dt,
          morale: r.morale + state.rates.morale * action.dt,
        },
      }
    }
    case "GATHER": {
      const gain = action.resource === "provisions" ? 3 : action.resource === "fighters" ? 1 : 2
      return {
        ...state,
        resources: { ...state.resources, [action.resource]: state.resources[action.resource] + gain },
      }
    }
    case "BUY_UPGRADE": {
      const def = UPGRADES.find((u) => u.id === action.id)
      if (!def) return state
      const lvl = state.upgradeLevels[action.id] ?? 0
      const cost = upgradeCost(def, lvl)
      if (state.resources[def.costResource] < cost) return state
      const levels = { ...state.upgradeLevels, [action.id]: lvl + 1 }
      return {
        ...state,
        resources: {
          ...state.resources,
          [def.costResource]: state.resources[def.costResource] - cost,
        },
        upgradeLevels: levels,
        rates: computeRates(levels),
        score: state.score + 5,
      }
    }
    case "WIN_BATTLE": {
      if (state.completedChapters.includes(action.chapterId)) return state
      const ch = CHAPTERS.find((c) => c.id === action.chapterId)
      if (!ch) return state
      const res = { ...state.resources }
      for (const [k, v] of Object.entries(ch.reward)) {
        res[k as ResourceKey] += v as number
      }
      return {
        ...state,
        resources: res,
        completedChapters: [...state.completedChapters, action.chapterId],
        currentChapter: Math.min(action.chapterId + 1, CHAPTERS.length),
        battlesFought: state.battlesFought + 1,
        score: state.score + ch.scoreReward,
      }
    }
    case "TRIVIA_REWARD": {
      if (state.answeredTrivia.includes(action.questionId)) return state
      return {
        ...state,
        resources: {
          fighters: state.resources.fighters + 10,
          provisions: state.resources.provisions + 40,
          morale: state.resources.morale + 25,
        },
        answeredTrivia: [...state.answeredTrivia, action.questionId],
        score: state.score + 50,
      }
    }
    case "REFERRAL_BONUS": {
      if (state.referredBy) return state
      return {
        ...state,
        referredBy: action.ref,
        resources: {
          fighters: state.resources.fighters + 15,
          provisions: state.resources.provisions + 50,
          morale: state.resources.morale + 30,
        },
      }
    }
    default:
      return state
  }
}

interface GameContextValue extends GameState {
  telegramId: string
  botUsername: string
  appName: string
  referralLink: string
  setLang: (lang: Lang) => void
  setName: (name: string) => void
  gather: (resource: ResourceKey) => void
  buyUpgrade: (id: string) => void
  winBattle: (chapterId: number) => void
  triviaReward: (questionId: number) => void
  unlockedBadges: string[]
  canAfford: (id: string) => boolean
}

const GameContext = createContext<GameContextValue | null>(null)
const STORAGE_KEY = "zemene_arbegnoch_save_v1"

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, STARTING)
  const lastTick = useRef<number>(Date.now())
  const telegramId = useRef<string>("demo_player")

  // Hydrate from storage + read Telegram context / referral param
  useEffect(() => {
    let saved: Partial<GameState> = {}
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) saved = JSON.parse(raw)
    } catch {
      // ignore corrupt saves
    }

    // Telegram WebApp SDK context (present when launched inside Telegram)
    const tg = (typeof window !== "undefined" && (window as any).Telegram?.WebApp) || null
    if (tg?.initDataUnsafe?.user?.id) {
      telegramId.current = String(tg.initDataUnsafe.user.id)
      const u = tg.initDataUnsafe.user
      if (!saved.displayName && (u.first_name || u.username)) {
        saved.displayName = u.first_name || u.username
      }
      try {
        tg.ready?.()
        tg.expand?.()
      } catch {}
    }

    // Referral deep link: ?startapp=ref_<id> or ?tgWebAppStartParam=ref_<id>
    const params = new URLSearchParams(window.location.search)
    const startParam = tg?.initDataUnsafe?.start_param || params.get("startapp") || params.get("ref")
    if (startParam && startParam.startsWith("ref_") && !saved.referredBy) {
      // credit handled after hydrate below
      ;(saved as any).__pendingRef = startParam
    }

    dispatch({ type: "HYDRATE", payload: saved })

    const pendingRef = (saved as any).__pendingRef
    if (pendingRef) dispatch({ type: "REFERRAL_BONUS", ref: pendingRef })
  }, [])

  // Idle accrual loop
  useEffect(() => {
    lastTick.current = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      const dt = (now - lastTick.current) / 1000
      lastTick.current = now
      dispatch({ type: "TICK", dt })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Persist
  useEffect(() => {
    if (!state.hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  const setLang = useCallback((lang: Lang) => dispatch({ type: "SET_LANG", lang }), [])
  const setName = useCallback((name: string) => dispatch({ type: "SET_NAME", name }), [])
  const gather = useCallback((resource: ResourceKey) => dispatch({ type: "GATHER", resource }), [])
  const buyUpgrade = useCallback((id: string) => dispatch({ type: "BUY_UPGRADE", id }), [])
  const winBattle = useCallback((chapterId: number) => dispatch({ type: "WIN_BATTLE", chapterId }), [])
  const triviaReward = useCallback(
    (questionId: number) => dispatch({ type: "TRIVIA_REWARD", questionId }),
    [],
  )

  const botUsername = "ZemeneArbegnochBot"
  const appName = "play"
  const referralLink = `https://t.me/${botUsername}/${appName}?startapp=ref_${telegramId.current}`

  const unlockedBadges = useMemo(
    () => BADGES.filter((b) => state.completedChapters.includes(b.chapterRequired)).map((b) => b.id),
    [state.completedChapters],
  )

  const canAfford = useCallback(
    (id: string) => {
      const def = UPGRADES.find((u) => u.id === id)
      if (!def) return false
      const lvl = state.upgradeLevels[id] ?? 0
      return state.resources[def.costResource] >= upgradeCost(def, lvl)
    },
    [state.resources, state.upgradeLevels],
  )

  const value: GameContextValue = {
    ...state,
    telegramId: telegramId.current,
    botUsername,
    appName,
    referralLink,
    setLang,
    setName,
    gather,
    buyUpgrade,
    winBattle,
    triviaReward,
    unlockedBadges,
    canAfford,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within GameProvider")
  return ctx
}
