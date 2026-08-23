import { supabase } from "./supabase"

// Typed contracts for the server-authoritative RPCs defined in
// supabase/migrations/202608230001_production_core.sql.
// The server decides; this layer only transports intent and results.

export interface ServerResources {
  fighters: number
  provisions: number
  morale: number
}

export interface PlayerProfile {
  displayName: string
  telegramLinked: boolean
  totalScore: number
  xp: number
  level: number
  lifetimeBattles: number
  lifetimeWins: number
  bestAccuracy: number
  bestCombo: number
  referralCode: string | null
  referredBy: string | null
}

export interface StageStat {
  bestScore: number
  bestAccuracy: number
  stars: number
}

export interface GameStatePayload {
  profile: PlayerProfile
  resources: ServerResources
  buildings: Record<string, number>
  completedStages: number[]
  stageStats: Record<string, StageStat>
  answeredTrivia: number[]
  unlockedAchievements: string[]
}

export interface BattleTarget {
  id: string
  x: number
  y: number
  spawnMs: number
  lifetimeMs: number
  tier: "normal" | "armored" | "fast"
  value: number
}

export interface BattleSession {
  ok: boolean
  reason?: string
  sessionId: string
  battleType: "sniper" | "formation" | "mixed"
  seed: number
  stageId: number
  targets: BattleTarget[]
  durationMs: number
  config: {
    enemyPower: number
    playerPower?: number
    minHitRatio?: number
    comboWindowMs?: number
    resolveAfterMs?: number
    formations?: Record<string, number>
  }
}

export interface BattleSummary {
  ok: boolean
  reason?: string
  result: "victory" | "defeat"
  score: number
  scoreGain: number
  accuracy: number
  bestCombo: number
  hits: number
  shots: number
  rewards: Partial<ServerResources>
  newBadges: string[]
  firstCompletion: boolean
  totalScore: number
  resources: ServerResources
}

export interface BattleAction {
  t: number
  targetId: string
  x: number
  y: number
}

export interface LeaderRow {
  player_id: string
  name: string
  score: number
  player_rank: number
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("supabase_unavailable")
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data as T
}

export const api = {
  initState: () => rpc<GameStatePayload>("game_init_state"),

  linkTelegram: (initData: string) =>
    rpc<{ linked: boolean; reason?: string; telegramId?: string }>("game_link_telegram", {
      p_init_data: initData,
    }),

  gather: (resource: "fighters" | "provisions" | "morale") =>
    rpc<{ gained: number; resourceType: string; resources: ServerResources }>("game_gather", {
      p_resource: resource,
    }),

  upgradeBuilding: (buildingKey: string) =>
    rpc<{ ok: boolean; level?: number; resources?: ServerResources; reason?: string }>(
      "game_upgrade_building",
      { p_building_key: buildingKey },
    ),

  claimPassive: () =>
    rpc<{ claimedSeconds: number; resources: ServerResources }>("game_claim_passive"),

  startBattle: (stageId: number) => rpc<BattleSession>("game_start_battle", { p_stage_id: stageId }),

  submitBattle: (
    sessionId: string,
    actions: BattleAction[],
    formation?: "shieldwall" | "scouts" | "rally",
  ) =>
    rpc<BattleSummary>("game_submit_battle", {
      p_session_id: sessionId,
      p_actions: actions,
      p_formation: formation ?? null,
    }),

  submitTrivia: (questionId: number, answerIndex: number) =>
    rpc<{ correct: boolean; rewarded: boolean; scoreGain: number; resources?: ServerResources }>(
      "game_submit_trivia",
      { p_question_id: questionId, p_answer_index: answerIndex },
    ),

  processReferral: (code: string) =>
    rpc<{ ok: boolean; reason?: string; resources?: ServerResources }>("game_process_referral", {
      p_referral_code: code,
    }),

  leaderboard: (kind: "global" | "friends") =>
    rpc<LeaderRow[]>("game_get_leaderboard", { p_kind: kind }),
}
