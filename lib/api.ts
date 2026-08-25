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

export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode?: number,
    message?: string,
  ) {
    super(message || code)
    this.name = "ApiError"
  }
}

/**
 * Retry helper with exponential backoff.
 * Used for transient network failures (connection errors, timeouts).
 * Does NOT retry on permanent errors (404, 403, validation errors).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 500,
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const error: Error = err instanceof Error ? err : new Error(String(err))
      lastError = error

      // Don't retry on known permanent errors
      if (err instanceof Error) {
        const msg = err.message?.toLowerCase() || ""
        // 404: RPC function not deployed; 403: auth issue; 400: bad request
        if (msg.includes("404") || msg.includes("not found") || msg.includes("403") || msg.includes("400")) {
          throw err
        }
      }

      // Last attempt: throw immediately
      if (attempt === maxAttempts - 1) break

      // Exponential backoff with jitter
      const delayMs = initialDelayMs * Math.pow(2, attempt) + Math.random() * 100
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError || new Error("Max retry attempts exceeded")
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new ApiError("supabase_unavailable", undefined, "Supabase client not initialized")

  return withRetry(async () => {
    const { data, error } = await supabase!.rpc(fn, args)

    if (error) {
      console.error(`[RPC ${fn}] Error:`, error)
      // Check for deployment issues
      if (
        error.message?.includes("not found") ||
        error.message?.includes("404") ||
        error.message?.includes("does not exist")
      ) {
        throw new ApiError(
          "rpc_not_deployed",
          404,
          `RPC function '${fn}' not found. Database migrations may not be deployed. See DEPLOYMENT-SETUP.md`,
        )
      }

      // Network/connection errors
      if (
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("timeout") ||
        error.message?.includes("net::")
      ) {
        throw new ApiError("network_error", undefined, "Network connection failed. Please check your internet.")
      }

      throw new ApiError("rpc_error", undefined, error.message)
    }

    return data as T
  })
}

// Import the supabase functions for getting player UUID
import { getPlayerUUID } from "./supabase"

export const api = {
  initState: async () => {
    const playerUUID = await getPlayerUUID()
    return rpc<GameStatePayload>("game_init_state", { p_player_uuid: playerUUID })
  },

  linkTelegram: async (initData: string) => {
    const playerUUID = await getPlayerUUID()
    return rpc<{ linked: boolean; reason?: string; telegramId?: string }>("game_link_telegram", {
      p_init_data: initData,
      p_player_uuid: playerUUID
    })
  },

  gather: async (resource: "fighters" | "provisions" | "morale") => {
    const playerUUID = await getPlayerUUID()
    return rpc<{ gained: number; resourceType: string; resources: ServerResources }>("game_gather", {
      p_resource: resource,
      p_player_uuid: playerUUID
    })
  },

  upgradeBuilding: async (buildingKey: string) => {
    const playerUUID = await getPlayerUUID()
    return rpc<{ ok: boolean; level?: number; resources?: ServerResources; reason?: string }>(
      "game_upgrade_building",
      { p_building_key: buildingKey, p_player_uuid: playerUUID }
    )
  },

  claimPassive: async () => {
    const playerUUID = await getPlayerUUID()
    return rpc<{ claimedSeconds: number; resources: ServerResources }>("game_claim_passive", {
      p_player_uuid: playerUUID
    })
  },

  startBattle: async (stageId: number) => {
    const playerUUID = await getPlayerUUID()
    return rpc<BattleSession>("game_start_battle", { p_stage_id: stageId, p_player_uuid: playerUUID })
  },

  submitBattle: async (
    sessionId: string,
    actions: BattleAction[],
    formation?: "shieldwall" | "scouts" | "rally",
  ) => {
    const playerUUID = await getPlayerUUID()
    return rpc<BattleSummary>("game_submit_battle", {
      p_session_id: sessionId,
      p_actions: actions,
      p_formation: formation ?? null,
      p_player_uuid: playerUUID
    })
  },

  submitTrivia: async (questionId: number, answerIndex: number) => {
    const playerUUID = await getPlayerUUID()
    return rpc<{ correct: boolean; rewarded: boolean; scoreGain: number; resources?: ServerResources }>(
      "game_submit_trivia",
      { p_question_id: questionId, p_answer_index: answerIndex, p_player_uuid: playerUUID }
    )
  },

  processReferral: async (code: string) => {
    const playerUUID = await getPlayerUUID()
    return rpc<{ ok: boolean; reason?: string; resources?: ServerResources }>("game_process_referral", {
      p_referral_code: code,
      p_player_uuid: playerUUID
    })
  },

  leaderboard: async (kind: "global" | "friends") => {
    const playerUUID = await getPlayerUUID()
    return rpc<LeaderRow[]>("game_get_leaderboard", { p_kind: kind, p_player_uuid: playerUUID })
  }
}
