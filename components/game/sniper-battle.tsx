"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { audio } from "@/lib/audio"
import { useParticleSystem } from "./particle-canvas"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import type { ChapterDef } from "@/lib/game-data"

type EnemyState = "popping" | "active" | "hit" | "gone"

interface Enemy {
  id: number
  x: number
  y: number
  state: EnemyState
  poppedAt: number
}

const LANE_POSITIONS: { x: number; y: number }[] = [
  { x: 18, y: 28 },
  { x: 48, y: 42 },
  { x: 82, y: 32 },
  { x: 26, y: 62 },
  { x: 74, y: 58 },
]

const SNIPER_PHASES = ["deploy", "combat", "result"] as const
type SniperPhase = (typeof SNIPER_PHASES)[number]

const ENEMIES_PER_WAVE = 5
const POP_DURATION = 400
const ACTIVE_DURATION = 1600
const HIT_DURATION = 800

interface SniperBattleProps {
  chapter: ChapterDef
  onClose: () => void
}

export function SniperBattle({ chapter, onClose }: SniperBattleProps) {
  const game = useGame()
  const { lang } = game
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useParticleSystem(canvasRef)

  const [phase, setPhase] = useState<SniperPhase>("deploy")
  const [crosshair, setCrosshair] = useState({ x: 50, y: 50 })
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [enemyHp, setEnemyHp] = useState(100)
  const [hits, setHits] = useState(0)
  const [shots, setShots] = useState(0)
  const [showMuzzle, setShowMuzzle] = useState(false)
  const [muzzlePos, setMuzzlePos] = useState({ x: 0, y: 0 })
  const [damageNumbers, setDamageNumbers] = useState<
    { id: number; x: number; y: number; text: string }[]
  >([])
  const [result, setResult] = useState<"victory" | "defeat">("victory")
  const enemyIdRef = useRef(0)
  const lifecycleRef = useRef<number | null>(null)
  const spawnRef = useRef<number | null>(null)
  const checkRef = useRef<number | null>(null)
  const hitsRef = useRef(0)
  const gameRef = useRef(game)
  const battleEndedRef = useRef(false)

  useEffect(() => {
    gameRef.current = game
  }, [game])

  const getLocalPercent = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clientX = (e as any).clientX ?? (e as any).touches?.[0]?.clientX ?? 0
    const clientY = (e as any).clientY ?? (e as any).touches?.[0]?.clientY ?? 0
    const x = clientX - rect.left
    const y = clientY - rect.top
    return {
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    }
  }

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== "combat") return
    const pct = getLocalPercent(e)
    setCrosshair(pct)
  }

  const handleShoot = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== "combat") return
    e.preventDefault()
    game.sniperShot()
    const pct = getLocalPercent(e)
    const { x: px, y: py } = pct

    setShots((s) => s + 1)
    audio.play("sniperShot", 0.25)
    setShowMuzzle(true)
    setMuzzlePos({ x: px, y: py })
    setTimeout(() => setShowMuzzle(false), 120)
    setCrosshair({ x: px, y: py })

    particles.spawn({
      x: px,
      y: py,
      count: 8,
      type: "muzzle",
      color: "#fbbf24",
      spread: 1,
      speed: 4,
    })

    setEnemies((prev) => {
      let found = false
      const next = prev.map((enemy) => {
        if (found || enemy.state !== "active") return enemy
        const dist = Math.hypot(px - enemy.x, py - enemy.y)
        if (dist < 6) {
          found = true
          audio.play("hitConfirm", 0.2)
          game.sniperHit()
          particles.spawn({
            x: enemy.x,
            y: enemy.y,
            count: 12,
            type: "hit",
            spread: 0.6,
            speed: 5,
          })
          setDamageNumbers((dn) => [
            ...dn,
            { id: enemy.id, x: enemy.x, y: enemy.y, text: "-25" },
          ])
          setTimeout(() => {
            setDamageNumbers((dn) => dn.filter((d) => d.id !== enemy.id))
          }, 900)
          return { ...enemy, state: "hit" as EnemyState, poppedAt: Date.now() }
        }
        return enemy
      })
      if (found) {
        setHits((h) => {
          const next = h + 1
          hitsRef.current = next
          return next
        })
        setEnemyHp((hp) => Math.max(0, hp - 15))
      } else {
        audio.play("miss", 0.15)
      }
      return next
    })
  }

  const spawnWave = () => {
    const now = Date.now()
    const newEnemies: Enemy[] = []
    const shuffled = [...LANE_POSITIONS].sort(() => Math.random() - 0.5)
    const lanes = shuffled.slice(0, ENEMIES_PER_WAVE)
    for (const lane of lanes) {
      enemyIdRef.current += 1
      newEnemies.push({
        id: enemyIdRef.current,
        x: lane.x,
        y: lane.y,
        state: "popping",
        poppedAt: now,
      })
    }
    setEnemies(newEnemies)
    audio.play("enemyPop", 0.2)
  }

   useEffect(() => {
    if (phase !== "combat") return

    lifecycleRef.current = window.setInterval(() => {
      const now = Date.now()
      setEnemies((prev) =>
        prev.map((enemy) => {
          if (enemy.state === "popping") {
            if ((now - enemy.poppedAt) / 1000 > POP_DURATION / 1000) {
              return { ...enemy, state: "active" as EnemyState, poppedAt: now }
            }
            return enemy
          }
          if (enemy.state === "active") {
            if ((now - enemy.poppedAt) / 1000 > ACTIVE_DURATION / 1000) {
              return { ...enemy, state: "gone" as EnemyState }
            }
            return enemy
          }
          if (enemy.state === "hit") {
            if ((now - enemy.poppedAt) / 1000 > HIT_DURATION / 1000) {
              return { ...enemy, state: "gone" as EnemyState }
            }
            return enemy
          }
          return enemy
        }),
      )
    }, 120)

    return () => {
      if (lifecycleRef.current) clearInterval(lifecycleRef.current)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== "combat") return

    spawnRef.current = window.setInterval(() => {
      setEnemies((prev) => {
        const alive = prev.filter((e) => e.state !== "gone" && e.state !== "hit")
        if (alive.length >= ENEMIES_PER_WAVE) return prev
        const usedLanes = new Set(alive.map((e) => `${e.x},${e.y}`))
        const available = LANE_POSITIONS.filter(
          (lane) => !usedLanes.has(`${lane.x},${lane.y}`),
        )
        if (available.length === 0 || Math.random() > 0.6) return prev
        const lane = available[Math.floor(Math.random() * available.length)]
        enemyIdRef.current += 1
        audio.play("enemyPop", 0.15)
        return [
          ...prev,
          {
            id: enemyIdRef.current,
            x: lane.x,
            y: lane.y,
            state: "popping" as EnemyState,
            poppedAt: Date.now(),
          },
        ]
      })
    }, 750)

    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== "combat") return
    if (enemies.length === 0) return

    checkRef.current = window.setInterval(() => {
      setEnemies((prev) => {
        const allDone = prev.every((e) => e.state === "hit" || e.state === "gone")
        if (allDone && prev.length > 0 && !battleEndedRef.current) {
          battleEndedRef.current = true
          if (checkRef.current) clearInterval(checkRef.current)
          const won = hitsRef.current >= Math.ceil(ENEMIES_PER_WAVE * 0.5)
          setPhase("result")
          setResult(won ? "victory" : "defeat")
          if (won) {
            audio.play("victory", 0.3)
            audio.play("levelUp", 0.25)
          } else {
            audio.play("defeat", 0.25)
          }
        }
        return prev
      })
    }, 300)

    return () => {
      if (checkRef.current) clearInterval(checkRef.current)
    }
  }, [phase, chapter.id])

  useEffect(() => {
    if (phase === "result") {
      if (result === "victory") {
        gameRef.current.winBattle(chapter.id, "sniper")
      } else {
        gameRef.current.loseBattle(chapter.id, "sniper")
      }
      const timer = setTimeout(() => onClose(), 2500)
      return () => clearTimeout(timer)
    }
  }, [phase, result, chapter.id, onClose])

  const startCombat = () => {
    audio.play("battleStart", 0.25)
    setPhase("combat")
    spawnWave()
  }

  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur"
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-primary/30 bg-background">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        <div className="relative border-b border-border/50 bg-card/80 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-xs uppercase tracking-widest text-primary">
                {t(lang, "chapter")} {chapter.id} — {t(lang, "sniper_mode")}
              </p>
              <h2 className={`font-serif text-lg font-bold text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
                {lang === "am" ? chapter.titleAm : chapter.titleEn}
              </h2>
            </div>
            {phase === "combat" && (
              <div className="rounded-full bg-ember/20 px-2 py-1 text-xs font-mono text-ember">
                {shots - hits} {t(lang, "missed")}
              </div>
            )}
          </div>
        </div>

        <div
          className="relative flex-1 cursor-crosshair overflow-hidden"
          style={{ height: "320px" }}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onClick={handleShoot}
        >
          <img
            src="/battle-bg.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <Crosshair x={crosshair.x} y={crosshair.y} phase={phase} />
          {showMuzzle && <MuzzleFlash x={muzzlePos.x} y={muzzlePos.y} />}

          <AnimatePresence>
            {damageNumbers.map((dn) => (
              <motion.div
                key={dn.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -30, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="pointer-events-none absolute text-xs font-bold text-amber-400"
                style={{
                  left: `${dn.x}%`,
                  top: `${dn.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {dn.text}
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="absolute top-2 right-2 z-10 rounded-full bg-card/70 px-2 py-1 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-ember">BOSS</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/30">
                <div className="h-full bg-ember transition-all" style={{ width: `${enemyHp}%` }} />
              </div>
            </div>
          </div>

          <SniperRifle phase={phase} />

          <AnimatePresence>
            {enemies.filter((e) => e.state !== "gone").map((enemy) => (
              <EnemySprite key={enemy.id} enemy={enemy} />
            ))}
          </AnimatePresence>

          {phase === "deploy" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-full bg-ember/10 p-6"
              >
                <ShieldIcon className="size-12 text-amber-400" />
              </motion.div>
              <p className="max-w-xs px-4 text-center text-xs text-muted-foreground">
                {t(lang, "sniper_desc")}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>🛡️</span> {game.resources.fighters}
                <span className="mx-1">•</span>
                <span>🎯</span> {t(lang, "sniper_target_hint")}
              </div>
            </div>
          )}
        </div>

        {phase === "combat" && (
          <div className="relative border-t border-border/50 bg-card/80 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span>
                {accuracy}% {t(lang, "accuracy")}
              </span>
              <span>
                {enemies.filter((e) => e.state === "active").length}/{ENEMIES_PER_WAVE} {t(lang, "active")}
              </span>
            </div>
          </div>
        )}

        <AnimatePresence>
          {phase === "result" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90"
            >
              <motion.h3
                className={`font-serif text-3xl font-extrabold ${result === "victory" ? "text-victory" : "text-ember"}`}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
              >
                {result === "victory" ? t(lang, "victory") : t(lang, "defeat")}
              </motion.h3>
              <div className="text-center text-xs text-muted-foreground">
                <div>🎯 {accuracy}% {t(lang, "accuracy")}</div>
                <div>💥 {hits} {t(lang, "enemies_eliminated")}</div>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={onClose}
                className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
              >
                {t(lang, "continue")}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "deploy" && (
          <div className="relative border-t border-border/50 bg-card/80 p-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={startCombat}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              {t(lang, "sniper_deploy")}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Crosshair({ x, y, phase }: { x: number; y: number; phase: string }) {
  if (phase !== "combat") return null
  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="relative flex h-5 w-5 items-center justify-center"
      >
        <div className="absolute h-5 w-5 rounded-full border border-amber-400/50" />
        <div className="absolute h-8 w-8 rounded-full border border-amber-400/30" />
        <div className="absolute h-0 w-12 border-t border-amber-400/40 -rotate-45" />
        <div className="absolute h-12 w-0 border-l border-amber-400/40 -rotate-45" />
      </motion.div>
    </motion.div>
  )
}

function MuzzleFlash({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      initial={{ scale: 0.4, opacity: 0.8 }}
      animate={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="pointer-events-none absolute z-10"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      <motion.span
        animate={{ rotate: [0, 30, -30, 0] }}
        transition={{ duration: 0.12 }}
        className="text-2xl"
      >
        💥
      </motion.span>
    </motion.div>
  )
}

function SniperRifle({ phase }: { phase: string }) {
  if (phase === "result") return null
  return (
    <motion.div
      className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: phase === "deploy" ? 0.3 : 0.9 }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        animate={{ rotate: phase === "combat" ? [0, -2, 2, 0] : 0 }}
        transition={{ duration: 0.8, repeat: phase === "combat" ? Infinity : 0, repeatDelay: 3 }}
        className="text-4xl"
      >
        🔫
      </motion.span>
    </motion.div>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2L2 7v10c0 5 6 10 10 10s10-5 10-10V7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EnemySprite({ enemy }: { enemy: Enemy }) {
  return (
    <motion.div
      layout
      key={enemy.id}
      className="absolute z-10 flex flex-col items-center"
      style={{
        left: `${enemy.x}%`,
        top: `${enemy.y}%`,
      }}
    >
      {enemy.state === "popping" && (
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-xl"
        >
          ⚠️
        </motion.div>
      )}
      {enemy.state === "active" && (
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.2 }}
          className="relative text-2xl"
        >
          <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]">🎯</span>
        </motion.div>
      )}
      {enemy.state === "hit" && (
        <motion.div
          initial={{ scale: 1.2, opacity: 1 }}
          animate={{ scale: 0.3, opacity: 0 }}
          className="text-2xl"
        >
          💥
        </motion.div>
      )}
    </motion.div>
  )
}
