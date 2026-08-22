'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { audio } from '@/lib/audio'
import { useParticleSystem } from './particle-canvas'
import { useGame } from '@/lib/game-context'
import { t } from '@/lib/i18n'
import type { ChapterDef } from '@/lib/game-data'

type EnemyState = 'popping' | 'active' | 'hit' | 'gone' | 'armored' | 'fast' | 'stealth'

interface Enemy {
  id: number
  x: number
  y: number
  state: EnemyState
  tier: 'normal' | 'armored' | 'fast' | 'stealth'
  tierHealth: number
  poppedAt: number
}

const LANE_POSITIONS: { x: number; y: number }[] = [
  { x: 18, y: 28 },
  { x: 48, y: 42 },
  { x: 82, y: 32 },
  { x: 26, y: 62 },
  { x: 74, y: 58 },
]

const SNIPER_PHASES = ['deploy', 'combat', 'result'] as const
type SniperPhase = (typeof SNIPER_PHASES)[number]

const ENEMIES_PER_WAVE = 5
const POP_DURATION = 400
const ACTIVE_DURATION = 1600
const BOSS_WAVE = 3

const COMBO_WINDOW = 1500 // ms
const COMBO_STEP = 10

interface Ammo {
  sniper: number
  shotgun: number
  grenade: number
}

interface SniperBattleProps {
  chapter: ChapterDef
  onClose: () => void
  difficulty?: 'normal' | 'hard' | 'insane'
}

export function SniperBattle({
  chapter,
  onClose,
  difficulty = 'normal',
}: SniperBattleProps) {
  const game = useGame()
  const { lang } = game
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useParticleSystem(canvasRef)

  const [phase, setPhase] = useState<SniperPhase>('deploy')
  const [crosshair, setCrosshair] = useState({ x: 50, y: 50 })
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [enemyHp, setEnemyHp] = useState(0)
  const [hits, setHits] = useState(0)
  const [shots, setShots] = useState(0)
  const [combo, setCombo] = useState(0)
  const [comboTimer, setComboTimer] = useState<number>(0)
  const [ammo, setAmmo] = useState<Ammo>({ sniper: 1, shotgun: 1, grenade: 1 })
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: number; x: number; y: number; text: string; color: string }>>([])
  const [result, setResult] = useState<'victory' | 'defeat'>('victory')
  const enemyIdRef = useRef(0)
  const lifecycleRef = useRef<number | null>(null)
  const spawnRef = useRef<number | null>(null)
  const checkRef = useRef<number | null>(null)
  const hitsRef = useRef(0)
  const gameRef = useRef(game)
  const battleEndedRef = useRef(false)
  const bossWaveRef = useRef(0)

  // sync game ref
  useEffect(() => {
    gameRef.current = game
  }, [game])

  // helper to compute local mouse percent
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
    if (phase !== 'combat') return
    const pct = getLocalPercent(e)
    setCrosshair(pct)
  }

  // current weapon state
  const [currentWeapon, setCurrentWeapon] = useState<'sniper' | 'shotgun' | 'grenade'>('sniper')

  // weapon fire handling
  const fireWeapon = (weapon: string, targetX: number, targetY: number) => {
    if (ammo[weapon] <= 0) return
    setAmmo((a) => ({ ...a, [weapon]: a[weapon] - 1 }))

    setShots((s) => s + 1)
    // play appropriate sound based on weapon
    audio.play(weapon, 0.25)

    // muzzle flash position
    setShowMuzzle(true)
    setMuzzlePos({ x: targetX, y: targetY })
    setTimeout(() => setShowMuzzle(false), 120)

    // compute damage based on weapon and enemy tier
    const hitEnemy = enemies.find((e) => e.state === 'active')
    if (!hitEnemy) return

    let damage = 0
    let color = '#ff9f0a'
    let hitEffect = 'hit'

    if (weapon === 'sniper') {
      damage = 25 * (hitEnemy.tier === 'armored' ? 1.5 : hitEnemy.tier === 'fast' ? 1.2 : 1)
      color = '#ff6b6b'
      hitEffect = 'sniperHit'
    } else if (weapon === 'shotgun') {
      damage = 12
      color = '#4ecdc4'
      hitEffect = 'shotgunHit'
    } else if (weapon === 'grenade') {
      damage = 30
      color = '#a29bfe'
      hitEffect = 'grenadeExplode'
    }

    // apply combo logic
    const now = Date.now()
    if (now - comboTimer < COMBO_WINDOW) {
      setCombo((c) => c + 1)
      setComboTimer(now)
    } else {
      setCombo(1)
      setComboTimer(now)
    }

    // spawn particles based on weapon
    let particleColor = color
    let particleCount = 0
    if (weapon === 'sniper') {
      particleCount = 12
    } else if (weapon === 'shotgun') {
      particleCount = 6
    } else if (weapon === 'grenade') {
      particleCount = 8
    }

    particles.spawn({
      x: targetX,
      y: targetY,
      count: particleCount,
      type: hitEffect,
      spread: 1,
      speed: 4,
      color: particleColor,
    })

    // register hit
    setHits((h) => {
      const next = h + 1
      hitsRef.current = next
      return next
    })

    // deduct enemy health
    const newHealth = Math.max(0, hitEnemy.tierHealth - damage - combo * 2)
    setEnemyHp((hp) => Math.max(0, hp - damage - combo * 2))

    // add damage number
    setDamageNumbers((dn) => [
      ...dn,
      {
        id: Date.now(),
        x: targetX,
        y: targetY,
        text: `-${Math.round(damage + combo * 2)}`,
        color,
      },
    ])

    // update enemy state
    const updatedEnemy = {
      ...hitEnemy,
      state: 'hit' as EnemyState,
      poppedAt: Date.now(),
      tierHealth: newHealth,
    }

    // if health depleted -> mark as gone after hit duration
    setEnemies((prev) => {
      const nextEnemies = prev.map((e) => {
        if (e.id === hitEnemy.id) return updatedEnemy
        return e
      })
      return nextEnemies
    })

    // check for wave completion
    const allDone = enemies.every((e) => e.state === 'hit' || e.state === 'gone')
    if (allDone && enemies.length > 0 && !battleEndedRef.current) {
      battleEndedRef.current = true
      clearInterval(checkRef.current!)
      const won = hitsRef.current >= Math.ceil(ENEMIES_PER_WAVE * 0.5)
      setPhase('result')
      setResult(won ? 'victory' : 'defeat')
      // telegram webhook
      const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || 'https://example.com/telegram-webhook'
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: 'demo_player',
          chat_id: 'demo_chat',
          text: won
            ? `🎉 Victory! Combo: ${combo} - Accuracy: ${Math.round((hits / shots) * 100)}%`
            : `💥 Defeat. Combo: ${combo} - Accuracy: ${Math.round((hits / shots) * 100)}%`,
        }),
      }).catch(() => console.warn('Telegram webhook failed'))
    }

    return nextEnemies
  }

  // wave spawning
  const spawnWave = () => {
    const now = Date.now()
    const baseEnemies: Enemy[] = []
    const shuffled = [...LANE_POSITIONS].sort(() => Math.random() - 0.5)
    const lanes = shuffled.slice(0, ENEMIES_PER_WAVE)
    for (const lane of lanes) {
      const tier =
        bossWaveRef.current >= BOSS_WAVE ? 'armored' : 'normal'
      const health = tier === 'armored' ? 200 : 80
      const enemy: Enemy = {
        id: enemyIdRef.current + 1,
        x: lane.x,
        y: lane.y,
        state: 'popping' as EnemyState,
        tier,
        tierHealth: health,
        poppedAt: now,
      }
      baseEnemies.push(enemy)
    }
    setEnemies(baseEnemies)
    setEnemyHp(0)
    audio.play('enemyPop', 0.2)
  }

  // interval to spawn new waves every ~1.2s
  useEffect(() => {
    if (phase !== 'combat') return
    const waveInterval = setInterval(() => {
      const existingAlive = enemies.some((e) => e.state === 'popping')
      if (!existingAlive) return
      spawnWave()
      const waveIdx = Math.floor(enemies.filter((e) => e.state !== 'gone').length / ENEMIES_PER_WAVE)
      bossWaveRef.current = waveIdx + 1
    }, 1200)
    return () => clearInterval(waveInterval)
  }, [phase, enemies])

  // enemy lifecycle timers
  useEffect(() => {
    if (phase !== 'combat') return
    lifecycleRef.current = setInterval(() => {
      setEnemies((prev) => {
        const now = Date.now()
        const next = prev.map((enemy) => {
          if (enemy.state === 'popping') {
            if ((now - enemy.poppedAt) / 1000 > POP_DURATION / 1000) {
              return { ...enemy, state: 'active' as EnemyState }
            }
            return enemy
          }
          if (enemy.state === 'active') {
            if ((now - enemy.poppedAt) / 1000 > ACTIVE_DURATION / 1000) {
              return { ...enemy, state: 'gone' as EnemyState }
            }
            return enemy
          }
          if (enemy.state === 'hit') {
            if ((now - enemy.poppedAt) / 1000 > HIT_DURATION / 1000) {
              return { ...enemy, state: 'gone' as EnemyState }
            }
            return enemy
          }
          return enemy
        })
        // add boss on wave 3
        const wave = Math.floor((prev.filter((e) => e.state !== 'gone').length - 1) / ENEMIES_PER_WAVE) + 1
        if (wave === BOSS_WAVE && enemyIdRef.current) {
          const bossId = enemyIdRef.current + 1
          const bossX = 50
          const bossY = 50
          const bossHealth = 500
          const boss: Enemy = {
            id: bossId,
            x: bossX,
            y: bossY,
            state: 'active' as EnemyState,
            tier: 'armored' as const,
            tierHealth: bossHealth,
            poppedAt: Date.now(),
          }
          return [...prev, boss]
        }
        return next
      })
    }, 120)
    return () => {
      if (lifecycleRef.current) clearInterval(lifecycleRef.current)
    }
  }, [phase, enemies])

  // result checking interval
  useEffect(() => {
    if (phase !== 'combat') return
    if (enemies.length === 0) return
    checkRef.current = setInterval(() => {
      setEnemies((prev) => {
        const allDone = prev.every((e) => e.state === 'hit' || e.state === 'gone')
        if (allDone && prev.length > 0 && !battleEndedRef.current) {
          battleEndedRef.current = true
          if (checkRef.current) clearInterval(checkRef.current)
          const won = hitsRef.current >= Math.ceil(ENEMIES_PER_WAVE * 0.5)
          setPhase('result')
          setResult(won ? 'victory' : 'defeat')
        }
        return prev
      })
    }, 300)
    return () => {
      if (checkRef.current) clearInterval(checkRef.current)
    }
  }, [phase, enemies])

  // cleanup on result
  useEffect(() => {
    if (phase !== 'result') return
    const timer = setTimeout(() => onClose(), 2500)
    return () => clearTimeout(timer)
  }, [phase, onClose])

  // start combat
  const startCombat = () => {
    audio.play('battleStart', 0.25)
    setPhase('combat')
    spawnWave()
  }

  // UI helpers
  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0

  // ---------- render ----------
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur"
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-primary/30 bg-background/80">
        {/* particle overlay */}
        <canvas className="absolute inset-0 h-full w-full" />
        {/* main arena */}
        <div
          className="relative flex-1 overflow-hidden cursor-crosshair"
          style={{ height: "320px" }}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onClick={(e) => fireWeapon(currentWeapon, ...Object.values(getLocalPercent(e)))}
        >
          <img
            src="/battle-bg.png"
            alt="battle"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <Crosshair x={crosshair.x} y={crosshair.y} phase={phase} />
          {showMuzzle && <MuzzleFlash x={muzzlePos.x} y={muzzlePos.y} />}
          {/* damage numbers */}
          <AnimatePresence>
            {damageNumbers.map((dn) => (
              <motion.div
                key={dn.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -30, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="pointer-events-none absolute text-xs font-bold"
                style={{
                  left: `${dn.x}%`,
                  top: `${dn.y}%`,
                  transform: "translate(-50%, -50%)",
                  color: dn.color,
                }}
              >
                {dn.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* enemy sprites */}
          <AnimatePresence>
            {enemies
              .filter((e) => e.state !== 'gone' && e.state !== 'dead')
              .map((enemy) => (
                <EnemySprite key={enemy.id} enemy={enemy} />
              ))}
          </AnimatePresence>
        </div>

        {/* deploy HUD */}
        {phase === 'deploy' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full bg-ember/20 p-6"
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
            {/* weapon selector */}
            <div className="flex gap-2 mb-2">
              {[ 'sniper', 'shotgun', 'grenade' ].map((w) => (
                <motion.button
                  key={w}
                  onClick={() => setCurrentWeapon(w)}
                  whileTap={{ scale: 0.94 }}
                  className="rounded-lg border border-primary/30 bg-background/70 px-2 py-1 text-xs text-primary"
                >
                  <span className={currentWeapon === w ? 'font-bold' : 'font-normal'}>
                    {w[0].toUpperCase() + w.slice(1)}
                  </span>
                  <div className="text-amber-300">×{ammo[w]}</div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* HUD overlay during combat */}
        {phase === 'combat' && (
          <div className="relative border-t border-primary/50 bg-card/90 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <span className="text-ember">BOSS</span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/30">
                  <div
                    className="h-full bg-ember transition-all"
                    style={{ width: `${enemyHp}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>{combo}×</span>
                <span>Combo</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{ammo.sniper}</span>
                <span>Sniper</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{ammo.shotgun}</span>
                <span>Shotgun</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{ammo.grenade}</span>
                <span>Grenade</span>
              </div>
            </div>
          </div>
        )}

        {/* combat stats overlay */}
        {phase === 'combat' && (
          <div className="relative border-t border-primary/50 bg-card/90 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span>
                {accuracy}% {t(lang, "accuracy")}
              </span>
              <span>
                {enemies.filter((e) => e.state === 'active').length}/{ENEMIES_PER_WAVE} {t(lang, "active")}
              </span>
            </div>
          </div>
        )}

        {/* result modal */}
        {phase === 'result' && (
          <div className="relative inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 animate-fade">
            <motion.h3
              className={`font-serif text-3xl font-extrabold ${result === 'victory' ? 'text-victory' : 'text-ember'}`}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
            >
              {result === 'victory'
                ? t(lang, 'victory')
                : t(lang, 'defeat')}
            </motion.h3>
            <div className="text-center text-xs text-muted-foreground">
              <div>🎯 {accuracy}% {t(lang, "accuracy")}</div>
              <div>💥 {hits} {t(lang, "enemies_eliminated")}</div>
              <div>🔗 Combo x{combo}</div>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onClose}
              className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
            >
              {t(lang, 'continue')}
            </motion.button>
          </div>
        )}

        {/* deploy button */}
        {phase === 'deploy' && (
          <div className="relative border-t border-primary/50 bg-card/90 p-3">
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

/* ---------- auxiliary components ---------- */

function Crosshair({ x, y, phase }: { x: number; y: number; phase: string }) {
  if (phase !== 'combat') return null
  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], y: [0, -4, 0] }}
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
  if (phase === 'result') return null
  return (
    <motion.div
      className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2"
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: 0,
        opacity: phase === 'deploy' ? 0.3 : 0.9,
      }}
      transition={{ duration: 0.4 }}
    >
      <motion.span
        animate={{ rotate: phase === 'combat' ? [0, -2, 2, 0] : 0 }}
        transition={{
          duration: 0.8,
          repeat: phase === 'combat' ? Infinity : 0,
          repeatDelay: 3,
        }}
        className="text-4xl"
      >
        🔫
      </motion.span>
    </motion.div>
  )
}

function ShotgunSpread({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none absolute z-10"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      <motion.span className="text-2xl">🔫</motion.span>
    </motion.div>
  )
}

function GrenadeArc({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: -10 }}
      transition={{ duration: 0.5 }}
      className="pointer-events-none absolute z-10"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      <motion.span className="text-2xl">🧨</motion.span>
    </motion.div>
  )
}

function EnemySprite({ enemy }: { enemy: Enemy }) {
  const tierEmojiMap = {
    armored: '🛡️',
    fast: '⚡',
    stealth: '👻',
    normal: '🎯',
  }
  const emoji = tierEmojiMap[enemy.tier] ?? '🎯'

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
      {enemy.state === 'popping' && (
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-xl"
        >
          {emoji}
        </motion.div>
      )}
      {enemy.state === 'active' && (
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 0.2,
          }}
          className="relative text-2xl"
        >
          <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]">{emoji}</span>
        </motion.div>
      )}
      {enemy.state === 'hit' && (
        <motion.div
          initial={{ scale: 1.2, opacity: 1 }}
          animate={{ scale: 0.3, opacity: 0 }}
          className="text-2xl"
        >
          {emoji}
        </motion.div>
      )}
    </motion.div>
  )
}