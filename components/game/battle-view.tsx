"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"
import { Swords, Eye, Users, Loader2 } from "lucide-react"
import { audio } from "@/lib/audio"
import { useParticleSystem } from "./particle-canvas"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import type { BattleAction, BattleSession, BattleSummary } from "@/lib/api"
import type { ChapterDef, ResourceKey } from "@/lib/game-data"
import { RESOURCE_META, fmt } from "@/lib/ui"

type Phase = "march" | "countIn" | "combat" | "submitting" | "result"
type Formation = "shieldwall" | "scouts" | "rally"

const FORMATIONS: { id: Formation; label: string; labelAm: string; detail: string; bonus: number; icon: typeof Users }[] = [
  { id: "shieldwall", label: "Shield wall", labelAm: "ግድግዳ", detail: "Steady defense", bonus: 1.08, icon: Users },
  { id: "scouts", label: "Scouts", labelAm: "ተመልካቾች", detail: "Read the terrain", bonus: 1.14, icon: Eye },
  { id: "rally", label: "Rally", labelAm: "ስብሰባ", detail: "Morale-led charge", bonus: 1.1, icon: Users },
]

// Enemy target positions (% of arena) — 5 soldiers in a spread formation
const ENEMY_TARGETS = [
  { id: "e0", x: 50, y: 35 },
  { id: "e1", x: 30, y: 45 },
  { id: "e2", x: 70, y: 45 },
  { id: "e3", x: 20, y: 60 },
  { id: "e4", x: 80, y: 60 },
]

interface BattleViewProps {
  chapter: ChapterDef
  session: BattleSession
  onClose: () => void
}

export function BattleView({ chapter, session, onClose }: BattleViewProps) {
  const game = useGame()
  const { lang } = game
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useParticleSystem(canvasRef)
  const arenaRef = useRef<HTMLDivElement>(null)

  const playerPower = session.config.playerPower ?? 0
  const enemyPower = session.config.enemyPower ?? chapter.enemyPower
  const durationMs = typeof session.durationMs === "number" && session.durationMs > 0 ? session.durationMs : 30000

  const [phase, setPhase] = useState<Phase>("march")
  const [countIn, setCountIn] = useState(0)
  const [formation, setFormation] = useState<Formation | null>(null)
  const [score, setScore] = useState(0)
  const [hits, setHits] = useState(0)
  const [shots, setShots] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [enemyHp, setEnemyHp] = useState(100)
  const [playerHp, setPlayerHp] = useState(100)
  const [summary, setSummary] = useState<BattleSummary | null>(null)
  const [screenFlash, setScreenFlash] = useState(false)
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: number; x: number; y: number; text: string }>>([])
  const [hitEnemies, setHitEnemies] = useState<Set<string>>(new Set())
  const [submitError, setSubmitError] = useState(false)
  const [rallyPrompt, setRallyPrompt] = useState(false)
  const [rallyStreak, setRallyStreak] = useState(0)
  const [rallyActive, setRallyActive] = useState(false)
  const [screenShake, setScreenShake] = useState<"none" | "light" | "heavy">("none")
  const shakeKeyRef = useRef(0)

  const startRef = useRef<number>(0)
  const actionsRef = useRef<BattleAction[]>([])
  const comboRef = useRef<{ count: number; lastHitAt: number }>({ count: 0, lastHitAt: -99999 })
  const hitIdsRef = useRef<Set<string>>(new Set())
  const endedRef = useRef(false)
  const rallySeqRef = useRef(0)
  const rallyActionsRef = useRef<BattleAction[]>([])

  const comboWindowMs =
    typeof session.config?.comboWindowMs === "number" && Number.isFinite(session.config.comboWindowMs)
      ? session.config.comboWindowMs
      : 1500

  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0
  const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000))

  const finish = useCallback(async () => {
    if (endedRef.current) return
    endedRef.current = true
    setPhase("submitting")
    try {
      const allActions = [...actionsRef.current, ...rallyActionsRef.current]
      const result = await game.finishBattle(session.sessionId, allActions, formation ?? undefined)
      setSummary(result)
      setPhase("result")
      audio.play(result.result === "victory" ? "victory" : "defeat", 0.3)
    } catch {
      setSubmitError(true)
      setPhase("result")
    }
  }, [session.sessionId, formation])

  // 3-2-1 count-in
  useEffect(() => {
    if (phase !== "countIn") return
    setCountIn(3)
    const ticks: Array<ReturnType<typeof setTimeout>> = []
    ticks.push(setTimeout(() => setCountIn(2), 700))
    ticks.push(setTimeout(() => setCountIn(1), 1400))
    ticks.push(setTimeout(() => { setCountIn(0); setPhase("combat") }, 2100))
    return () => { ticks.forEach(clearTimeout) }
  }, [phase])

  // Combat timer
  useEffect(() => {
    if (phase !== "combat") return
    const started = performance.now()
    startRef.current = started
    audio.play("whoosh", 0.15)
    // Start ambient battlefield loop
    audio.play("ambientBattle", 0.08)
    const ambientLoop = setInterval(() => audio.play("ambientBattle", 0.08), 5000)

    const timer = setInterval(() => {
      const nowMs = performance.now() - started
      setElapsed(nowMs)

      // Enemy HP drops based on hits
      const hitCount = hitIdsRef.current.size
      const baseDmg = Math.min(90, hitCount * 22)
      const rallyDmg = rallyStreak * 5
      setEnemyHp(Math.max(4, 100 - baseDmg - rallyDmg))

      // Player HP slowly decreases (enemy counterattack)
      setPlayerHp((prev) => Math.max(4, prev - 0.35))

      if (endedRef.current) return
      if (nowMs >= durationMs || hitIdsRef.current.size >= ENEMY_TARGETS.length) {
        void finish()
      }
    }, 60)

    return () => { clearInterval(timer); clearInterval(ambientLoop) }
  }, [phase, durationMs, finish, rallyStreak])

  const getPercent = (clientX: number, clientY: number, rect: DOMRect) => ({
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  })

  const fire = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "combat" || endedRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pt = getPercent(e.clientX, e.clientY, rect)
    const nowMs = Math.round(performance.now() - startRef.current)

    // Varied shot sound
    audio.play(Math.random() > 0.5 ? "heavyShot" : "sniperShot", 0.25)

    // Screen flash + shake
    setScreenFlash(true)
    setTimeout(() => setScreenFlash(false), 60)
    shakeKeyRef.current += 1
    setScreenShake("light")
    setTimeout(() => setScreenShake("none"), 300)

    // Find closest enemy target within hit radius
    const TAP_RADIUS = 12 // percent
    const victim = ENEMY_TARGETS.find((et) => {
      if (hitIdsRef.current.has(et.id)) return false
      return Math.hypot(pt.x - et.x, pt.y - et.y) <= TAP_RADIUS
    })

    actionsRef.current.push({
      t: nowMs,
      targetId: victim?.id ?? "miss",
      x: Math.round(pt.x * 1000) / 1000,
      y: Math.round(pt.y * 1000) / 1000,
    })
    setShots((s) => s + 1)

    if (!victim) {
      // Miss — bullet whiz sound + dust particles
      audio.play("bulletWhiz", 0.15)
      particles.spawn({ x: pt.x, y: pt.y, count: 4, type: "dust", spread: 1, speed: 2 })
      const dmgId = Date.now() + Math.random()
      setDamageNumbers((dn) => [...dn, { id: dmgId, x: pt.x, y: pt.y, text: "MISS" }])
      setTimeout(() => setDamageNumbers((dn) => dn.filter((d) => d.id !== dmgId)), 700)
      return
    }

    // Hit!
    hitIdsRef.current.add(victim.id)
    setHitEnemies((prev) => new Set(prev).add(victim.id))

    if (nowMs - comboRef.current.lastHitAt <= comboWindowMs) {
      comboRef.current.count += 1
    } else {
      comboRef.current.count = 1
    }
    comboRef.current.lastHitAt = nowMs
    const c = comboRef.current.count
    setCombo(c)
    setBestCombo((b) => Math.max(b, c))

    const mult = 1 + Math.min(c - 1, 10) * 0.05
    const gained = Math.round(chapter.scoreReward / ENEMY_TARGETS.length * mult)
    setScore((s) => s + gained)
    setHits((h) => h + 1)

    particles.spawn({ x: pt.x, y: pt.y, count: 12, type: "hit", spread: 1, speed: 5 })
    particles.spawn({ x: pt.x, y: pt.y, count: 6, type: "spark", spread: 0.8, speed: 3 })

    const dmgId = Date.now() + Math.random()
    setDamageNumbers((dn) => [...dn, { id: dmgId, x: pt.x, y: pt.y, text: `+${gained}` }])
    setTimeout(() => setDamageNumbers((dn) => dn.filter((d) => d.id !== dmgId)), 900)

    // Kill confirm on elimination, impact thud on hit, hitConfirm on combo
    const remaining = ENEMY_TARGETS.filter((et) => !hitIdsRef.current.has(et.id)).length
    if (remaining === 0) {
      audio.play("killConfirm", 0.35)
      audio.play("enemyGrunt", 0.25)
      setScreenShake("heavy")
      setTimeout(() => setScreenShake("none"), 450)
    } else {
      audio.play("impactThud", 0.2)
      if (c > 0 && c % 3 === 0) audio.play("hitConfirm", 0.22)
    }
  }

  function handleRally() {
    if (phase !== "combat" || !rallyPrompt) return
    rallySeqRef.current += 1
    const nowMs = Math.round(performance.now() - startRef.current)
    rallyActionsRef.current.push({
      t: nowMs,
      targetId: `rally-${rallySeqRef.current}`,
      x: 50,
      y: 50,
    })
    setRallyStreak((s) => s + 1)
    setRallyActive(true)
    setRallyPrompt(false)
    audio.play("clash", 0.15)
    particles.spawn({ x: 50, y: 50, count: 8, type: "spark", speed: 4 })
    setTimeout(() => setRallyActive(false), 800)
  }

  // Rally prompts every few seconds during combat
  useEffect(() => {
    if (phase !== "combat") return
    const rallyTimer = setInterval(() => {
      if (!endedRef.current) {
        setRallyPrompt(true)
        setTimeout(() => setRallyPrompt(false), 1200)
      }
    }, 4000)
    return () => clearInterval(rallyTimer)
  }, [phase])

  const won = summary?.result === "victory"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-primary/40" style={{ backgroundColor: '#1a1e32' }}>
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" />

        {/* Screen flash on shot */}
        {screenFlash && (
          <div className="pointer-events-none absolute inset-0 z-40 bg-amber-200/8 mix-blend-screen" />
        )}

        {/* Main arena */}
        <div
          ref={arenaRef}
          className={`relative h-[360px] w-full flex-1 overflow-hidden ${
            phase === "combat" ? "cursor-crosshair touch-none" : ""
          } ${
            screenShake === "heavy" ? "animate-screen-shake-heavy" : screenShake === "light" ? "animate-screen-shake" : ""
          }`}
          onPointerDown={phase === "combat" ? fire : undefined}
        >
          {/* Parallax battlefield layers */}
          <div className="absolute inset-0 parallax-sky" />
          <div className="absolute inset-0 parallax-mountains" />
          <img src="/battle-bg.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 parallax-ground" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          {/* Scan-line overlay */}
          <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
            }}
          />

          {/* Ambient smoke particles */}
          {phase === "combat" && (
            <>
              <div className="pointer-events-none absolute left-[10%] bottom-[20%] h-8 w-16 rounded-full bg-amber-900/20 blur-sm animate-smoke-drift" />
              <div className="pointer-events-none absolute left-[60%] bottom-[15%] h-6 w-12 rounded-full bg-stone-700/20 blur-sm animate-smoke-drift" style={{ animationDelay: '1.5s' }} />
              <div className="pointer-events-none absolute left-[35%] bottom-[25%] h-10 w-20 rounded-full bg-amber-800/15 blur-sm animate-smoke-drift" style={{ animationDelay: '3s' }} />
            </>
          )}

          {/* Combat: enemy targets */}
          {phase === "combat" && (
            <>
              {ENEMY_TARGETS.map((et) => (
                <EnemySoldierTarget
                  key={et.id}
                  id={et.id}
                  x={et.x}
                  y={et.y}
                  isHit={hitEnemies.has(et.id)}
                />
              ))}
            </>
          )}

          {/* Damage numbers */}
          <AnimatePresence>
            {damageNumbers.map((dn) => (
              <motion.span
                key={dn.id}
                initial={{ opacity: 1, y: 0, scale: 0.85 }}
                animate={{ opacity: 0, y: -40, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="pointer-events-none absolute z-30 font-mono text-sm font-extrabold text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                style={{ left: `${dn.x}%`, top: `${dn.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {dn.text}
              </motion.span>
            ))}
          </AnimatePresence>

          {/* Deploy briefing */}
          {phase === "march" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6" style={{ backgroundColor: 'rgba(26,30,50,0.95)' }}>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-full bg-background/60 text-muted-foreground hover:text-foreground"
                aria-label={t(lang, "close")}
              >
                ✕
              </button>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-full bg-ember/20 p-6">
                <Swords className="size-12 text-primary" />
              </motion.div>
              <h3 className={`font-serif text-lg font-bold text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
                {lang === "am" ? chapter.titleAm : chapter.titleEn}
              </h3>
              <p className="max-w-xs text-center text-xs text-muted-foreground">
                {lang === "am" ? chapter.blurbAm : chapter.blurbEn}
              </p>
              {/* Formation picker */}
              <div className="grid w-full grid-cols-3 gap-2 mt-2">
                {FORMATIONS.map((item) => {
                  const Icon = item.icon
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFormation(item.id)
                        setPhase("countIn")
                        audio.play("battleStart", 0.25)
                      }}
                      whileTap={{ scale: 0.94 }}
                      className="rounded-xl border border-primary/30 bg-background/75 px-2 py-3 text-left hover:border-primary hover:bg-primary/10"
                    >
                      <Icon className="mb-1 size-4 text-victory" />
                      <span className={`block text-xs font-bold text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
                        {lang === "am" ? item.labelAm : item.label}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">+{Math.round((item.bonus - 1) * 100)}%</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Count-in: 3 → 2 → 1 */}
          {phase === "countIn" && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2" style={{ backgroundColor: 'rgba(26,30,50,0.9)' }}>
              <AnimatePresence mode="popLayout">
                {countIn > 0 && (
                  <motion.h2
                    key={countIn}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="text-glow-gold font-serif text-7xl font-extrabold text-amber-300"
                  >
                    {countIn}
                  </motion.h2>
                )}
              </AnimatePresence>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">
                {t(lang, "count_in_sub")}
              </p>
            </div>
          )}

          {/* Submitting */}
          {phase === "submitting" && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'rgba(26,30,50,0.95)' }}>
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">{t(lang, "validating")}</p>
            </div>
          )}

          {/* Result */}
          {phase === "result" && summary && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6" style={{ backgroundColor: 'rgba(26,30,50,0.95)' }}>
              <motion.h3
                className={`font-serif text-3xl font-extrabold ${won ? "text-victory" : "text-ember"}`}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
              >
                {won ? t(lang, "battle_won") : t(lang, "battle_lost")}
              </motion.h3>
              {summary.firstCompletion && won && (
                <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary">
                  {t(lang, "first_clear")}
                </span>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-center text-xs text-muted-foreground">
                <span>★ {t(lang, "stat_score")}</span>
                <span className="font-mono font-bold text-primary">+{summary.scoreGain}</span>
                <span>◎ {t(lang, "accuracy")}</span>
                <span className="font-mono font-bold text-foreground">{summary.accuracy}%</span>
                <span>⚔ {t(lang, "best_combo")}</span>
                <span className="font-mono font-bold text-foreground">×{summary.bestCombo}</span>
                <span>✕ {t(lang, "enemies_eliminated")}</span>
                <span className="font-mono font-bold text-foreground">
                  {summary.hits}/{summary.shots}
                </span>
              </div>
              {won && summary.rewards && Object.keys(summary.rewards).length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {Object.entries(summary.rewards).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-full bg-victory/15 px-2 py-0.5 font-mono text-[11px] font-bold text-victory"
                    >
                      +{v} {t(lang, k === "fighters" ? "res_fighters" : k === "provisions" ? "res_provisions" : "res_morale")}
                    </span>
                  ))}
                </div>
              )}
              {summary.newBadges.length > 0 && (
                <span className="text-[11px] font-semibold text-amber-400">
                  🏅 {t(lang, "new_badge")}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-1 w-full max-w-[240px] rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/85"
              >
                {t(lang, "continue")}
              </button>
            </div>
          )}

          {/* Result error */}
          {phase === "result" && submitError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6" style={{ backgroundColor: 'rgba(26,30,50,0.95)' }}>
              <p className="text-center text-sm text-ember">{t(lang, "submit_failed")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    endedRef.current = false
                    setSubmitError(false)
                    void finish()
                  }}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  {t(lang, "retry")}
                </button>
                <button type="button" onClick={onClose} className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
                  {t(lang, "close")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Combat HUD */}
        {phase === "combat" && (
          <div className="relative border-t border-primary/40 bg-card/95 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-mono font-bold ${remaining <= 5 ? "text-ember animate-pulse" : "text-foreground"}`}>
                ⏱ {remaining}s
              </span>
              <span className="font-mono font-bold text-primary">{score} PTS</span>
              <span className={`font-mono font-bold ${combo >= 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                ⚔ ×{combo}
              </span>
              <span className="font-mono text-muted-foreground">
                ◎ {accuracy}% · {hits}/{ENEMY_TARGETS.length}
              </span>
            </div>
            {/* HP bars */}
            <div className="mt-1.5 flex gap-2">
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-border/30">
                  <div className="h-full bg-victory transition-all duration-200" style={{ width: `${playerHp}%` }} />
                </div>
                <span className="text-[9px] text-victory/80">{t(lang, "yourForce")}</span>
              </div>
              <div className="flex-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-border/30">
                  <div className="h-full bg-ember transition-all duration-200" style={{ width: `${enemyHp}%` }} />
                </div>
                <span className="text-[9px] text-ember/80">{t(lang, "enemyForce")}</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-border/30">
              <div
                className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-200"
                style={{ width: `${Math.min(100, (elapsed / durationMs) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Rally button during combat */}
        {phase === "combat" && (
          <div className="relative border-t border-primary/40 bg-card/95 p-3">
            <motion.button
              type="button"
              onClick={handleRally}
              disabled={!rallyPrompt}
              animate={
                rallyPrompt
                  ? { scale: [1, 1.06, 1], boxShadow: ["0 0 0 0 rgba(245,158,30,0.0)", "0 0 0 12px rgba(245,158,30,0.0)", "0 0 0 0 rgba(245,158,30,0.0)"] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.55, repeat: rallyPrompt ? Infinity : 0 }}
              whileTap={rallyPrompt ? { scale: 0.94 } : undefined}
              className={`relative w-full overflow-hidden rounded-xl border py-3 text-sm font-extrabold tracking-wide transition-colors ${
                rallyPrompt
                  ? "border-amber-400 bg-amber-400/15 text-amber-300"
                  : rallyActive
                    ? "border-victory bg-victory/15 text-victory"
                    : "border-primary/20 bg-background/70 text-muted-foreground"
              }`}
            >
              <span className="relative z-10">
                {rallyPrompt
                  ? `⚔ ${t(lang, "rally_cta")}`
                  : rallyActive
                    ? `✓ ×${rallyStreak}`
                    : `+ ${t(lang, "rally_hint")}`}
              </span>
              {rallyStreak > 0 && (
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs ${
                    rallyStreak >= 3 ? "text-amber-300" : "text-muted-foreground"
                  }`}
                >
                  🔥 ×{rallyStreak}
                </span>
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Graphical enemy soldier as a tappable target during combat.
 * Shows an SVG soldier that's "alive" until hit.
 */
function EnemySoldierTarget({
  id,
  x,
  y,
  isHit,
}: {
  id: string
  x: number
  y: number
  isHit: boolean
}) {
  return (
    <div
      className="absolute z-10"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      {isHit ? (
        <motion.div
          initial={{ scale: 1.3, opacity: 1 }}
          animate={{ scale: 0.1, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.35 }}
        >
          {/* hit explosion */}
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="16" fill="rgba(255,120,30,0.4)" />
            <circle cx="24" cy="24" r="8" fill="rgba(255,200,50,0.6)" />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <line
                key={deg}
                x1="24" y1="24"
                x2={24 + Math.cos(deg * Math.PI / 180) * 20}
                y2={24 + Math.sin(deg * Math.PI / 180) * 20}
                stroke="rgba(255,220,80,0.7)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </motion.div>
      ) : (
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
          className="relative cursor-crosshair drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
        >
          {/* Enemy soldier SVG */}
          <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* helmet */}
            <ellipse cx="18" cy="10" rx="8" ry="6" fill="#5a2d2d" />
            <rect x="10" y="8" width="16" height="4" rx="2" fill="#5a2d2d" />
            <rect x="8" y="12" width="20" height="2" rx="1" fill="#ba7a7a" opacity="0.6" />
            {/* face area */}
            <rect x="12" y="13" width="12" height="5" rx="2" fill="#ba7a7a" opacity="0.5" />
            {/* body */}
            <rect x="11" y="18" width="14" height="12" rx="3" fill="#7c4a4a" />
            <rect x="11" y="26" width="14" height="2" fill="#ba7a7a" opacity="0.4" />
            {/* legs */}
            <rect x="12" y="30" width="5" height="10" rx="2" fill="#7c4a4a" />
            <rect x="19" y="30" width="5" height="10" rx="2" fill="#7c4a4a" />
            {/* boots */}
            <rect x="11" y="38" width="6" height="4" rx="2" fill="#5a2d2d" />
            <rect x="19" y="38" width="6" height="4" rx="2" fill="#5a2d2d" />
            {/* weapon */}
            <rect x="26" y="16" width="2" height="18" rx="1" fill="#ba7a7a" opacity="0.7" />
            <rect x="24" y="14" width="6" height="3" rx="1" fill="#ba7a7a" opacity="0.5" />
          </svg>
          {/* Targeting reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg width="48" height="48" viewBox="0 0 48 48" className="opacity-40">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(245,158,30,0.5)" strokeWidth="1" strokeDasharray="4 3" />
              <circle cx="24" cy="24" r="2" fill="rgba(245,158,30,0.8)" />
              <line x1="24" y1="4" x2="24" y2="14" stroke="rgba(245,158,30,0.4)" strokeWidth="1" />
              <line x1="24" y1="34" x2="24" y2="44" stroke="rgba(245,158,30,0.4)" strokeWidth="1" />
              <line x1="4" y1="24" x2="14" y2="24" stroke="rgba(245,158,30,0.4)" strokeWidth="1" />
              <line x1="34" y1="24" x2="44" y2="24" stroke="rgba(245,158,30,0.4)" strokeWidth="1" />
            </svg>
          </div>
        </motion.div>
      )}
    </div>
  )
}
