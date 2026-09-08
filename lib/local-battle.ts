/**
 * Local battle fallback — generates BattleSession and BattleSummary objects
 * entirely client-side when the Supabase backend is unreachable.
 *
 * The game remains fully playable offline; results are stored in localStorage
 * and can be synced when connectivity returns.
 *
 * Difficulty scales with chapter: more targets, faster spawns, shorter
 * lifetimes, tougher tiers. Victory requires the player to survive (HP > 0)
 * AND meet a minimum elimination ratio.
 */

import type { BattleSession, BattleSummary, BattleTarget, ServerResources } from "./api"
import { CHAPTERS } from "./game-data"

// ─── Difficulty helpers ───────────────────────────────────────────────────────

/** Number of formation enemies per chapter (scales up). */
function formationEnemyCount(chapterId: number): number {
  return 5 + Math.floor((chapterId - 1) * 0.8) // ch1=5, ch8≈10
}

/** Per-enemy escape timer in ms (shorter at higher chapters = more pressure). */
function formationEscapeMs(chapterId: number): number {
  return Math.max(3000, 6000 - (chapterId - 1) * 430) // ch1≈6s, ch8≈3s
}

/** Minimum fraction of enemies the player must eliminate to win. */
function minKillRatio(chapterId: number): number {
  return Math.min(0.85, 0.4 + (chapterId - 1) * 0.055) // ch1=40%, ch8≈79%
}

/** Minimum accuracy required to win (0 for formation, scaled for sniper). */
function minAccuracy(chapterId: number, isSniper: boolean): number {
  if (!isSniper) return 0 // formation: just need enough kills
  return Math.min(0.5, 0.15 + (chapterId - 1) * 0.05) // sniper: 15%→50%
}

/** Damage dealt to the player per escaped/expired enemy. */
function escapeDamage(chapterId: number): number {
  return Math.min(30, 12 + (chapterId - 1) * 2.5)
}

/** Continuous counterattack damage per 60ms tick from each alive enemy. */
function counterattackDps(chapterId: number): number {
  return 0.15 + (chapterId - 1) * 0.05 // ch1≈0.15/tick, ch8≈0.5/tick
}

// ─── Formation targets ────────────────────────────────────────────────────────

function buildFormationTargets(chapterId: number): BattleTarget[] {
  const count = formationEnemyCount(chapterId)
  const escMs = formationEscapeMs(chapterId)

  // Position grid — spread enemies across the arena
  const positions: [number, number][] = [
    [50, 35], [30, 45], [70, 45], [20, 60], [80, 60],
    [45, 28], [55, 52], [35, 38], [65, 55], [50, 65],
  ]

  return Array.from({ length: count }, (_, i) => {
    const [x, y] = positions[i % positions.length]
    const tierRoll = (chapterId + i * 7) % 100
    const tier = tierRoll < 15 + chapterId * 2 ? "armored" : tierRoll < 30 + chapterId ? "fast" : "normal"
    const tierBonus = tier === "armored" ? 1.3 : tier === "fast" ? 0.8 : 1.0

    return {
      id: `e${i}`,
      x: x + ((i * 7) % 5) - 2,
      y: y + ((i * 3) % 7) - 3,
      spawnMs: 300 + i * 200,
      lifetimeMs: Math.round(escMs * tierBonus),
      tier,
      value: tier === "armored" ? 150 : tier === "fast" ? 200 : 100,
    }
  })
}

// ─── Sniper targets (scaled grid) ─────────────────────────────────────────────

const SNIPER_GRID: [number, number][] = [
  [18, 28], [48, 42], [82, 32], [26, 62], [74, 58],
  [50, 18], [34, 76], [66, 70], [24, 46], [78, 48],
]

function buildSniperTargets(stageId: number): BattleTarget[] {
  // More targets at higher chapters
  const count = 10 + Math.floor((stageId - 1) * 1.2) // ch2=10, ch7≈16
  // Shorter lifetimes at higher chapters
  const baseLifetime = Math.max(1400, 2600 - (stageId - 1) * 160)

  const targets: BattleTarget[] = []
  for (let i = 0; i < count; i++) {
    const [x, y] = SNIPER_GRID[i % SNIPER_GRID.length]
    const tierRoll = (stageId * 3 + i * 11) % 100
    const tier = tierRoll < 12 + stageId * 2 ? "armored" : tierRoll < 28 + stageId ? "fast" : "normal"
    const tierMult = tier === "armored" ? 1.2 : tier === "fast" ? 0.7 : 1.0
    targets.push({
      id: `t${i + 1}`,
      x: x + ((i * 3) % 7) - 3,
      y: y + ((i * 5) % 9) - 4,
      spawnMs: 500 + i * Math.max(300, 450 - (stageId - 1) * 20),
      lifetimeMs: Math.round(baseLifetime * tierMult),
      tier,
      value: tier === "armored" ? 150 : tier === "fast" ? 200 : 100,
    })
  }
  return targets
}

/**
 * Generate a local BattleSession when the server is unreachable.
 * Returns null if the chapter doesn't exist.
 */
export function createLocalSession(stageId: number): BattleSession | null {
  const chapter = CHAPTERS.find((ch) => ch.id === stageId)
  if (!chapter) return null

  const isSniper = chapter.battleType === "sniper"
  const targets = isSniper ? buildSniperTargets(stageId) : buildFormationTargets(stageId)

  const lastTarget = targets[targets.length - 1]
  const durationMs = lastTarget.spawnMs + lastTarget.lifetimeMs + 1500

  // Win-condition thresholds embedded in config for client-side display
  const minKR = minKillRatio(stageId)
  const minAcc = minAccuracy(stageId, isSniper)

  return {
    ok: true,
    sessionId: `local_${stageId}_${Date.now()}`,
    battleType: isSniper ? "sniper" : "formation",
    seed: Date.now() % 2147483647,
    stageId,
    targets,
    durationMs,
    config: {
      enemyPower: chapter.enemyPower,
      playerPower: 100,
      minHitRatio: minKR,
      comboWindowMs: isSniper ? 1500 : undefined,
      formations: !isSniper
        ? { shieldwall: 1.0, scouts: 0.85, rally: 1.2 }
        : undefined,
      // Extra config for client-side combat
      escapeDamage: escapeDamage(stageId),
      counterattackDps: counterattackDps(stageId),
      minAccuracy: minAcc,
    } as BattleSession["config"],
  }
}

/**
 * Generate a local BattleSummary after combat completes.
 *
 * Victory requires ALL of:
 *   1. Player survived (playerHp > 0)
 *   2. Enough enemies eliminated (hits >= ceil(totalEnemies × minKillRatio))
 *   3. Accuracy meets minimum (for sniper battles)
 */
export function createLocalSummary(
  stageId: number,
  hits: number,
  shots: number,
  bestCombo: number,
  currentResources: ServerResources,
  playerHp: number = 100,
  totalEnemies: number = 5,
): BattleSummary | null {
  const chapter = CHAPTERS.find((ch) => ch.id === stageId)
  if (!chapter) return null

  const isSniper = chapter.battleType === "sniper"
  const accuracy = shots > 0 ? hits / shots : 0
  const score = hits * 100 + bestCombo * 50

  const killsNeeded = Math.ceil(totalEnemies * minKillRatio(stageId))
  const accNeeded = minAccuracy(stageId, isSniper)

  const playerAlive = playerHp > 0
  const enoughKills = hits >= killsNeeded
  const enoughAccuracy = accuracy >= accNeeded

  const result: "victory" | "defeat" =
    playerAlive && enoughKills && enoughAccuracy ? "victory" : "defeat"

  // Partial rewards on defeat (only provisions for survival effort)
  const rewards: Partial<ServerResources> =
    result === "victory"
      ? { ...chapter.reward }
      : playerAlive
        ? { provisions: Math.floor((chapter.reward.provisions ?? 0) * 0.15) }
        : {}

  // Apply rewards to current resources
  const resources: ServerResources = {
    fighters: currentResources.fighters + (rewards.fighters ?? 0),
    provisions: currentResources.provisions + (rewards.provisions ?? 0),
    morale: currentResources.morale + (rewards.morale ?? 0),
  }

  return {
    ok: true,
    result,
    score,
    scoreGain: result === "victory" ? chapter.scoreReward : Math.floor(chapter.scoreReward * 0.15),
    accuracy: Math.round(accuracy * 100),
    bestCombo,
    hits,
    shots,
    rewards,
    newBadges: [],
    firstCompletion: false,
    totalScore: 0,
    resources,
  }
}

// ─── Offline completion storage ────────────────────────────────────────────────
const OFFLINE_KEY = "zemene_offline_completions"

interface OfflineCompletion {
  stageId: number
  score: number
  accuracy: number
  timestamp: number
}

export function storeOfflineCompletion(stageId: number, score: number, accuracy: number) {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY)
    const list: OfflineCompletion[] = raw ? JSON.parse(raw) : []
    list.push({ stageId, score, accuracy, timestamp: Date.now() })
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(list))
  } catch {}
}

export function getOfflineCompletions(): OfflineCompletion[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
