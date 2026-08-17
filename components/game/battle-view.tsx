"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Shield, Swords, Flag, Sparkles, X } from "lucide-react"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import { RESOURCE_META, fmt } from "@/lib/ui"
import type { ChapterDef, ResourceKey } from "@/lib/game-data"

type Phase = "march" | "clash" | "result"

// Player power is derived from standing forces + accumulated morale/provisions.
export function computePlayerPower(resources: Record<ResourceKey, number>, cleared: number): number {
  return Math.floor(
    resources.fighters * 2 + resources.morale * 1.2 + resources.provisions * 0.15 + cleared * 25 + 30,
  )
}

export function BattleView({ chapter, onClose }: { chapter: ChapterDef; onClose: () => void }) {
  const game = useGame()
  const { lang } = game
  const playerPower = computePlayerPower(game.resources, game.completedChapters.length)
  const enemyPower = chapter.enemyPower

  const [phase, setPhase] = useState<Phase>("march")
  const [playerHp, setPlayerHp] = useState(100)
  const [enemyHp, setEnemyHp] = useState(100)
  const [won, setWon] = useState(false)
  const [shake, setShake] = useState(0)
  const settled = useRef(false)

  // Resolve by stat comparison + light randomness.
  useEffect(() => {
    const roll = 0.82 + Math.random() * 0.36 // 0.82 - 1.18
    const effectivePlayer = playerPower * roll
    const didWin = effectivePlayer >= enemyPower
    const total = effectivePlayer + enemyPower
    // Loser drops to ~0, winner keeps a residual proportional to margin.
    const winnerResidual = Math.max(12, Math.min(70, Math.abs(effectivePlayer - enemyPower) / total * 140))

    const marchT = setTimeout(() => setPhase("clash"), 1400)

    let ticks = 0
    const totalTicks = 42 // ~11s of clashing at 260ms
    const clashInt = setTimeout(() => {
      const interval = setInterval(() => {
        ticks++
        const p = ticks / totalTicks
        setShake((s) => (s + 1) % 2)
        if (didWin) {
          setEnemyHp(Math.max(0, 100 - p * 100))
          setPlayerHp(Math.max(winnerResidual, 100 - p * (100 - winnerResidual)))
        } else {
          setPlayerHp(Math.max(0, 100 - p * 100))
          setEnemyHp(Math.max(winnerResidual, 100 - p * (100 - winnerResidual)))
        }
        if (ticks >= totalTicks) {
          clearInterval(interval)
          if (!settled.current) {
            settled.current = true
            setWon(didWin)
            setPhase("result")
            if (didWin) game.winBattle(chapter.id)
          }
        }
      }, 260)
    }, 1400)

    return () => {
      clearTimeout(marchT)
      clearTimeout(clashInt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-background/95 backdrop-blur"
    >
      <div className="relative flex w-full max-w-md flex-col">
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

          {/* HP bars */}
          <div className="relative mt-4 flex items-center gap-3 px-4">
            <HpBar label={t(lang, "yourForce")} hp={playerHp} tone="victory" align="left" />
            <HpBar label={t(lang, "enemyForce")} hp={enemyHp} tone="ember" align="right" />
          </div>

          {/* Formations clashing */}
          <div className="relative mt-8 flex h-40 items-center justify-between px-6">
            <Formation
              side="player"
              phase={phase}
              shake={shake}
              icon={<Shield className="size-9 text-victory" />}
              banner="text-victory"
            />
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
            </AnimatePresence>
            <Formation
              side="enemy"
              phase={phase}
              shake={shake}
              icon={<Flag className="size-9 text-ember" />}
              banner="text-ember"
            />
          </div>

          {/* Power readout */}
          <div className="relative mt-2 flex items-center justify-between px-8 font-mono text-xs">
            <span className="text-victory">PWR {fmt(playerPower)}</span>
            <span className="text-ember">{fmt(enemyPower)} PWR</span>
          </div>
        </div>

        {/* Result / blurb tray */}
        <div className="relative border-t border-primary/20 bg-card/95 p-4">
          <AnimatePresence mode="wait">
            {phase !== "result" ? (
              <motion.p
                key="blurb"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-pretty text-center text-sm text-muted-foreground ${lang === "am" ? "font-ethiopic" : ""}`}
              >
                {lang === "am" ? chapter.blurbAm : chapter.blurbEn}
              </motion.p>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <h3
                  className={`text-glow-gold font-serif text-2xl font-extrabold ${
                    won ? "text-victory" : "text-ember"
                  }`}
                >
                  {won ? t(lang, "battle_won") : t(lang, "battle_lost")}
                </h3>
                {won && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="size-3.5 text-primary" /> {t(lang, "rewards")}:
                    </span>
                    {Object.entries(chapter.reward).map(([k, v]) => {
                      const meta = RESOURCE_META[k as ResourceKey]
                      const Icon = meta.icon
                      return (
                        <span
                          key={k}
                          className="flex items-center gap-1 rounded-full bg-background px-2 py-1 font-mono text-xs font-semibold text-foreground"
                        >
                          <Icon className={`size-3.5 ${meta.color}`} /> +{v}
                        </span>
                      )
                    })}
                  </div>
                )}
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

function Formation({
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
