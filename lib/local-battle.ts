/**
 * Local battle fallback — generates BattleSession and BattleSummary objects
 * entirely client-side when the Supabase backend is unreachable.
 *
 * The game remains fully playable offline; results are stored in localStorage
 * and can be synced when connectivity returns.
 */

import type { BattleSession, BattleSummary, BattleTarget, ServerResources } from "./api"
import { CHAPTERS } from "./game-data"

// ─── Formation targets (mirrors battle-view.tsx ENEMY_TARGETS) ────────────────
const FORMATION_TARGETS: BattleTarget[] = [
  { id: "e0", x: 50, y: 35, spawnMs: 400, lifetimeMs: 2300, tier: "normal", value: 100 },
  { id: "e1", x: 30, y: 45, spawnMs: 1200, lifetimeMs: 2600, tier: "armored", value: 150 },
  { id: "e2", x: 70, y: 45, spawnMs: 2000, lifetimeMs: 1400, tier: "fast", value: 200 },
  { id: "e3", x: 20, y: 60, spawnMs: 2800, lifetimeMs: 2300, tier: "normal", value: 100 },
  { id: "e4", x: 80, y: 60, spawnMs: 3600, lifetimeMs: 2600, tier: "armored", value: 150 },
]

// ─── Sniper targets (10-position grid) ────────────────────────────────────────
const SNIPER_GRID: [number, number][] = [
  [18, 28], [48, 42], [82, 32], [26, 62], [74, 58],
  [50, 18], [34, 76], [66, 70], [24, 46], [78, 48],
]

function buildSniperTargets(stageId: number): BattleTarget[] {
  const count = 12 + (stageId % 3) * 2 // 12–16 targets
  const targets: BattleTarget[] = []
  for (let i = 0; i < count; i++) {
    const [x, y] = SNIPER_GRID[i % SNIPER_GRID.length]
    const tier = i % 5 === 0 ? "armored" : i % 3 === 0 ? "fast" : "normal"
    targets.push({
      id: `t${i + 1}`,
      x: x + ((i * 3) % 7) - 3, // slight jitter so not perfectly aligned
      y: y + ((i * 5) % 9) - 4,
      spawnMs: 600 + i * 450,
      lifetimeMs: tier === "armored" ? 2400 : tier === "fast" ? 1400 : 2100,
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

  const targets =
    chapter.battleType === "sniper" ? buildSniperTargets(stageId) : [...FORMATION_TARGETS]

  const durationMs =
    chapter.battleType === "sniper"
      ? targets[targets.length - 1].spawnMs + targets[targets.length - 1].lifetimeMs + 1500
      : targets[targets.length - 1].spawnMs + 1500

  return {
    ok: true,
    sessionId: `local_${stageId}_${Date.now()}`,
    battleType: chapter.battleType === "sniper" ? "sniper" : "formation",
    seed: Date.now() % 2147483647,
    stageId,
    targets,
    durationMs,
    config: {
      enemyPower: chapter.enemyPower,
      playerPower: 150,
      minHitRatio: chapter.battleType === "sniper" ? 0.5 : undefined,
      comboWindowMs: chapter.battleType === "sniper" ? 1500 : undefined,
      formations: chapter.battleType === "formation"
        ? { shieldwall: 1.0, scouts: 0.85, rally: 1.2 }
        : undefined,
    },
  }
}

/**
 * Generate a local BattleSummary after combat completes.
 * Evaluates hit ratio against the chapter's enemy power to decide victory/defeat.
 */
export function createLocalSummary(
  stageId: number,
  hits: number,
  shots: number,
  bestCombo: number,
  currentResources: ServerResources,
): BattleSummary | null {
  const chapter = CHAPTERS.find((ch) => ch.id === stageId)
  if (!chapter) return null

  const accuracy = shots > 0 ? hits / shots : 0
  const score = hits * 100 + bestCombo * 50
  // Local victory threshold: at least 40% hit ratio and 3+ hits
  const result: "victory" | "defeat" = hits >= 3 && accuracy >= 0.4 ? "victory" : "defeat"

  const rewards: Partial<ServerResources> =
    result === "victory"
      ? { ...chapter.reward }
      : { provisions: Math.floor(chapter.reward.provisions ?? 0) * 0.2 }

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
    scoreGain: result === "victory" ? chapter.scoreReward : Math.floor(chapter.scoreReward * 0.2),
    accuracy: Math.round(accuracy * 100),
    bestCombo,
    hits,
    shots,
    rewards,
    newBadges: [],
    firstCompletion: false, // We can't know this locally
    totalScore: 0, // Will be patched by game-context
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
