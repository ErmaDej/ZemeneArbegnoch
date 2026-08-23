"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Shield, Swords, Flag, Sparkles, X, Eye, Users, Loader2 } from "lucide-react"
import { audio } from "@/lib/audio"
import { useParticleSystem } from "./particle-canvas"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import { RESOURCE_META, fmt } from "@/lib/ui"
import type { BattleSession, BattleSummary } from "@/lib/api"
import type { ChapterDef, ResourceKey } from "@/lib/game-data"

type Phase = "march" | "clash" | "submitting" | "result"
type Formation = "shieldwall" | "scouts" | "rally"

const FORMATIONS: { id: Formation; label: string; detail: string; bonus: number; icon: typeof Shield }[] = [
  { id: "shieldwall", label: "Shield wall", detail: "Steady defense", bonus: 1.08, icon: Shield },
  { id: "scouts", label: "Scouts", detail: "Read the terrain", bonus: 1.14, icon: Eye },
  { id: "rally", label: "Rally", detail: "Morale-led charge", bonus: 1.1, icon: Users },
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

  // Server-snapshotted power at battle start — display only, the server decides.
  const playerPower = session.config.playerPower ?? 0
  const enemyPower = session.config.enemyPower ?? chapter.enemyPower

  const [phase, setPhase] = useState<Phase>("march")
  const [playerHp, setPlayerHp] = useState(100)
  const [enemyHp, setEnemyHp] = useState(100)
  const [summary, setSummary] = useState<BattleSummary | null>(null)
  const [shake, setShake] = useState(0)
  const [formation, setFormation] = useState<Formation | null>(null)
  const [showClash, setShowClash] = useState(false)
  const settledRef = useRef(false)

  async function resolve(formed: Formation) {
    if (settledRef.current) return
    settledRef.current = true
    setPhase("submitting")
    try {
      const result = await game.finishBattle(session.sessionId, [], formed)
      setSummary(result)
      setPhase("result")
      audio.play(result.result === "victory" ? "victory" : "defeat", 0.3)
    } catch {
      setSummary(null)
      setPhase("result")
    }
  }

  // Animate the clash for a fixed duration, then settle via the server verdict.
  useEffect(() => {
    if (!formation || phase !== "clash") return
    audio.play("whoosh", 0.15)

    let ticks = 0
    const totalTicks = 42 // ~11s of clashing at 260ms
    const interval = setInterval(() => {
      ticks++
      const p = ticks / totalTicks
      setShake((s) => (s + 1) % 2)
      if (ticks % 3 === 0) {
        setShowClash(true)
        setTimeout(() => setShowClash(false), 200)
        audio.play("clash", 0.08)
        particles.spawn({ x: 50, y: 50, count: 6, type: "spark", speed: 3 })
      }
      // Tension build-up only — no outcome is decided here.
      setEnemyHp(Math.max(4, 100 - p * 96))
      setPlayerHp(Math.max(4, 100 - p * 88))
      if (ticks >= totalTicks && !settledRef.current) void resolve(formation)
    }, 260)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation, phase])

  const won = summary?.result === "victory"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-background/95 backdrop-blur"
    >
       <div className="relative flex w-full max-w-md flex-col">
        {/* Particle overlay */}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        {/* Battlefield */}
        <div className="relative flex-1 overflow-hidden">
          <img src="/battle-bg.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-background/45" />

          {/* Header */}
          <div className="relative flex items-center justify-between px-4 pt-4">
            <div>
              <p className="font-serif text-xs uppercase tracking-widest text-primary">
                {t(lang, "chapter")} {chapter.id}
              </p>
              <h2 className={`font-serif text-lg font-bold text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
                {lang === "am" ? chapter.titleAm : chapter.titleEn}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-background/60 text-muted-foreground hover:text-foreground"
              aria-label={t(lang, "close")}
            >
              <X className="size-4" />
            </button>
          </div>

          {!formation && (
            <div className="relative mt-5 px-4">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-primary">Choose your formation</p>
              <div className="grid grid-cols-3 gap-2">
                {FORMATIONS.map((item) => {
                  const Icon = item.icon
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFormation(item.id)
                        setPhase("clash")
                        audio.play("clash", 0.12)
                      }}
                      whileTap={{ scale: 0.94 }}
                      className="rounded-xl border border-primary/30 bg-background/75 px-2 py-3 text-left hover:border-primary hover:bg-primary/10"
                    >
                      <Icon className="mb-1 size-4 text-victory" />
                      <span className="block text-xs font-bold text-foreground">{item.label}</span>
                      <span className="block text-[10px] text-muted-foreground">+{Math.round((item.bonus - 1) * 100)}% power</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}

          {/* HP bars */}
          {(phase === "clash" || phase === "submitting") && (
            <div className="relative mt-4 flex items-center gap-3 px-4">
              <HpBar label={t(lang, "yourForce")} hp={playerHp} tone="victory" align="left" />
              <HpBar label={t(lang, "enemyForce")} hp={enemyHp} tone="ember" align="right" />
            </div>
          )}

          {/* Formations clashing */}
          <div className="relative mt-8 flex h-40 items-center justify-between px-6">
            <FormationSprite side="player" phase={phase} shake={shake} icon={<Shield className="size-9 text-victory" />} banner="text-victory" />
            <AnimatePresence>
              {phase !== "march" && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], opacity: 1, rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.5, repeat: phase === "clash" ? Infinity : 0, repeatDelay: 0.4 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <Swords className="size-12 text-primary drop-shadow-[0_0_12px_var(--gold)]" />
                </motion.div>
              )}
              {showClash && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 0.6, 0], scale: [0.3, 1, 0.3] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <Sparkles className="size-10 text-amber-400 drop-shadow-[0_0_16px_rgba(245,158,30,0.7)]" />
                </motion.div>
              )}
            </AnimatePresence>
            <FormationSprite side="enemy" phase={phase} shake={shake} icon={<Flag className="size-9 text-ember" />} banner="text-ember" />
          </div>

          {/* Power readout */}
          <div className="relative mt-2 flex items-center justify-between px-8 font-mono text-xs">
            <span className="text-victory">PWR {fmt(playerPower)}</span>
            <span className="text-ember">{fmt(enemyPower)} PWR</span>
          </div>

          {phase === "submitting" && (
            <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t(lang, "validating")}
            </div>
          )}
        </div>

        {/* Result / blurb tray */}
        <div className="relative border-t border-primary/20 bg-card/95 p-4">
          <AnimatePresence mode="wait">
            {phase === "result" && summary ? (
              <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
                <h3 className={`text-glow-gold font-serif text-2xl font-extrabold ${won ? "text-victory" : "text-ember"}`}>
                  {won ? t(lang, "battle_won") : t(lang, "battle_lost")}
                </h3>
                {summary.firstCompletion && won && (
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary">{t(lang, "first_clear")}</span>
                )}
                {won && Object.keys(summary.rewards).length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="size-3.5 text-primary" /> {t(lang, "rewards")}:
                    </span>
                    {Object.entries(summary.rewards).map(([k, v]) => {
                      const meta = RESOURCE_META[k as ResourceKey]
                      const Icon = meta.icon
                      return (
                        <span
                          key={k}
                          className="flex items-center gap-1 rounded-full bg-background px-2 py-1 font-mono text-xs font-semibold text-foreground"
                        >
                          <Icon className={`size-3.5 ${meta.color}`} /> +{String(v)}
                        </span>
                      )
                    })}
                  </div>
                )}
                <span className="font-mono text-[11px] text-muted-foreground">
                  🏆 +{summary.scoreGain} · 🎯 {summary.accuracy}% {t(lang, "accuracy")}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full rounded-xl py-3 text-sm font-bold transition-colors ${
                    won
                      ? "bg-primary text-primary-foreground hover:bg-primary/85"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {won ? t(lang, "continue") : t(lang, "retry")}
                </button>
              </motion.div>
            ) : phase === "result" ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                <p className="text-sm text-ember">{t(lang, "submit_failed")}</p>
                <button type="button" onClick={onClose} className="w-full rounded-xl bg-secondary py-3 text-sm font-bold text-secondary-foreground">
                  {t(lang, "close")}
                </button>
              </motion.div>
            ) : (
              <motion.p
                key="blurb"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-pretty text-center text-sm text-muted-foreground ${lang === "am" ? "font-ethiopic" : ""}`}
              >
                {lang === "am" ? chapter.blurbAm : chapter.blurbEn}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function HpBar({
  label,
  hp,
  tone,
  align,
}: {
  label: string
  hp: number
  tone: "victory" | "ember"
  align: "left" | "right"
}) {
  return (
    <div className={`flex-1 ${align === "right" ? "text-right" : ""}`}>
      <p className="mb-1 truncate text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className={`h-2.5 overflow-hidden rounded-full bg-background/70 ${align === "right" ? "rotate-180" : ""}`}>
        <motion.div
          className={tone === "victory" ? "h-full bg-victory" : "h-full bg-ember"}
          animate={{ width: `${hp}%` }}
          transition={{ ease: "linear", duration: 0.25 }}
        />
      </div>
    </div>
  )
}

function FormationSprite({
  side,
  phase,
  shake,
  icon,
  banner,
}: {
  side: "player" | "enemy"
  phase: Phase
  shake: number
  icon: React.ReactNode
  banner: string
}) {
  const dir = side === "player" ? 1 : -1
  const marchX = phase === "march" ? 0 : dir * 38
  return (
    <motion.div
      animate={{
        x: phase === "clash" ? marchX + (shake ? dir * 4 : 0) : marchX,
      }}
      transition={{ duration: phase === "march" ? 1.3 : 0.12, ease: "easeInOut" }}
      className="flex flex-col items-center gap-1"
    >
      <div className="grid size-16 place-items-center rounded-xl border border-primary/25 bg-background/60 shadow-lg">
        {icon}
      </div>
      <div className={`flex gap-0.5 ${banner}`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-3 rounded-full bg-current opacity-70" />
        ))}
      </div>
    </motion.div>
  )
}
