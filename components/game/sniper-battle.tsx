'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldIcon, Crosshair, Loader2 } from 'lucide-react'
import { audio } from '@/lib/audio'
import { useParticleSystem } from './particle-canvas'
import { useGame } from '@/lib/game-context'
import { t } from '@/lib/i18n'
import type { BattleAction, BattleSession, BattleSummary, BattleTarget } from '@/lib/api'
import type { ChapterDef } from '@/lib/game-data'

type TargetStatus = 'pending' | 'popping' | 'active' | 'hit' | 'expired'

interface LiveTarget extends BattleTarget {
  status: TargetStatus
}

const POP_MS = 280
const TAP_RADIUS = 11 // percent-of-screen hit radius around a target's center
const TICK_MS = 60

type Phase = 'deploy' | 'combat' | 'submitting' | 'result'

interface SniperBattleProps {
  chapter: ChapterDef
  session: BattleSession
  onClose: () => void
}

export function SniperBattle({ chapter, session, onClose }: SniperBattleProps) {
  const game = useGame()
  const { lang } = game
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useParticleSystem(canvasRef)

  // Defensive session shape: a malformed payload must degrade to a playable
  // (or at least visible) state, never crash-mount a blank overlay.
  const safeTargets: BattleTarget[] = Array.isArray(session.targets) ? session.targets : []
  const durationMs =
    typeof session.durationMs === "number" && Number.isFinite(session.durationMs) && session.durationMs > 0
      ? session.durationMs
      : 30000

  const [phase, setPhase] = useState<Phase>('deploy')
  const [targets, setTargets] = useState<LiveTarget[]>(
    () => safeTargets.map((tg) => ({ ...tg, status: 'pending' })),
  )
  const [crosshair, setCrosshair] = useState({ x: 50, y: 50 })
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [shots, setShots] = useState(0)
  const [damageNumbers, setDamageNumbers] = useState<Array<{ id: number; x: number; y: number; text: string }>>([])
  const [muzzle, setMuzzle] = useState<{ x: number; y: number; id: number } | null>(null)
  const [summary, setSummary] = useState<BattleSummary | null>(null)
  const [submitError, setSubmitError] = useState(false)

  const startRef = useRef<number>(0)
  const actionsRef = useRef<BattleAction[]>([])
  const comboRef = useRef<{ count: number; lastHitAt: number }>({ count: 0, lastHitAt: -99999 })
  const hitIdsRef = useRef<Set<string>>(new Set())
  const endedRef = useRef(false)
  const comboWindowMs =
    typeof session.config?.comboWindowMs === "number" && Number.isFinite(session.config.comboWindowMs)
      ? session.config.comboWindowMs
      : 1500

  const finish = useCallback(async () => {
    if (endedRef.current) return
    endedRef.current = true
    setPhase('submitting')
    try {
      const result = await game.finishBattle(session.sessionId, actionsRef.current)
      setSummary(result)
      setPhase('result')
      audio.play(result.result === 'victory' ? 'victory' : 'defeat', 0.3)
    } catch {
      setSubmitError(true)
      setPhase('result')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId])

  // Schedule driver: flips target states based on the SERVER-authored timing.
  useEffect(() => {
    if (phase !== 'combat') return
    const started = performance.now()
    startRef.current = started

    const timer = setInterval(() => {
      const nowMs = performance.now() - started
      setElapsed(nowMs)

      let anyLive = false
      setTargets((prev) =>
        prev.map((tg) => {
          if (tg.status === 'hit' || tg.status === 'expired') return tg
          if (nowMs >= tg.spawnMs + tg.lifetimeMs) {
            return { ...tg, status: 'expired' }
          }
          anyLive = true
          if (nowMs >= tg.spawnMs && tg.status === 'pending') {
            return { ...tg, status: 'popping' }
          }
          if (nowMs >= tg.spawnMs + POP_MS && tg.status === 'popping') {
            return { ...tg, status: 'active' }
          }
          return tg
        }),
      )

      if (endedRef.current) return
      const liveRemain = safeTargets.some(
        (tg) => nowMs < tg.spawnMs + tg.lifetimeMs && !hitIdsRef.current.has(tg.id),
      )
      if (!liveRemain || !anyLive || nowMs >= durationMs) void finish()
    }, TICK_MS)

    return () => clearInterval(timer)
  }, [phase, durationMs, finish, safeTargets])

  const getPercent = (clientX: number, clientY: number, rect: DOMRect) => ({
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  })

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'combat') return
    const rect = e.currentTarget.getBoundingClientRect()
    const pt = getPercent(e.clientX, e.clientY, rect)
    setCrosshair(pt)
  }

  const fire = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'combat' || endedRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pt = getPercent(e.clientX, e.clientY, rect)
    const nowMs = Math.round(performance.now() - startRef.current)

    audio.play('sniperShot', 0.25)
    setShowMuzzleFlash(pt)

    // Find a live, legally-timed target under the crosshair (mirrors server rules).
    const victim = targets.find(
      (tg) =>
        !hitIdsRef.current.has(tg.id) &&
        nowMs >= tg.spawnMs &&
        nowMs <= tg.spawnMs + tg.lifetimeMs &&
        Math.hypot(pt.x - tg.x, pt.y - tg.y) <= TAP_RADIUS,
    )

    actionsRef.current.push({
      t: nowMs,
      targetId: victim?.id ?? 'miss',
      x: Math.round(pt.x * 1000) / 1000,
      y: Math.round(pt.y * 1000) / 1000,
    })
    setShots((s) => s + 1)

    if (!victim) return

    // Local optimistic feedback — the server remains authoritative.
    hitIdsRef.current.add(victim.id)
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
    const gained = Math.round(victim.value * mult)
    setScore((s) => s + gained)
    setHits((h) => h + 1)

    setTargets((prev) => prev.map((tg) => (tg.id === victim.id ? { ...tg, status: 'hit' } : tg)))
    particles.spawn({ x: pt.x, y: pt.y, count: 10, type: 'hit', spread: 1, speed: 4 })
    const dmgId = Date.now() + Math.random()
    setDamageNumbers((dn) => [...dn, { id: dmgId, x: pt.x, y: pt.y, text: `+${gained}` }])
    setTimeout(() => setDamageNumbers((dn) => dn.filter((d) => d.id !== dmgId)), 900)

    if (c > 0 && c % 5 === 0) audio.play('hitConfirm', 0.22)
  }

  const setShowMuzzleFlash = (pt: { x: number; y: number }) => {
    const id = Date.now()
    setMuzzle({ x: pt.x, y: pt.y, id })
    setTimeout(() => setMuzzle((m) => (m?.id === id ? null : m)), 130)
  }

  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0
  const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000))
  const liveTargets = targets.filter((tg) => tg.status === 'active' || tg.status === 'popping')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur"
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-primary/30 bg-background/80">
        {/* particle overlay */}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" />

        {/* main arena */}
        <div
          className={`relative h-[320px] w-full flex-1 overflow-hidden ${phase === 'combat' ? 'cursor-crosshair touch-none' : ''}`}
          onPointerMove={handlePointer}
          onPointerDown={fire}
        >
          <img src="/battle-bg.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          {/* live targets */}
          {phase === 'combat' &&
            targets
              .filter((tg) => tg.status === 'popping' || tg.status === 'active' || tg.status === 'hit')
              .map((tg) => <TargetSprite key={tg.id} target={tg} />)}

          {phase === 'combat' && (
            <>
              {/* crosshair */}
              <motion.div
                className="pointer-events-none absolute z-30"
                style={{ left: `${crosshair.x}%`, top: `${crosshair.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <Crosshair className="size-6 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,30,0.7)]" />
              </motion.div>
              {muzzle && (
                <motion.div
                  initial={{ scale: 0.4, opacity: 0.9 }}
                  animate={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 0.13 }}
                  className="pointer-events-none absolute z-10 text-2xl"
                  style={{ left: `${muzzle.x}%`, top: `${muzzle.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  💥
                </motion.div>
              )}
            </>
          )}

          {/* damage/score floaters */}
          <AnimatePresence>
            {damageNumbers.map((dn) => (
              <motion.span
                key={dn.id}
                initial={{ opacity: 1, y: 0, scale: 0.85 }}
                animate={{ opacity: 0, y: -34, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="pointer-events-none absolute z-30 font-mono text-xs font-bold text-amber-300"
                style={{ left: `${dn.x}%`, top: `${dn.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {dn.text}
              </motion.span>
            ))}
          </AnimatePresence>

          {/* deploy briefing */}
          {phase === 'deploy' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 px-6">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-full bg-ember/20 p-6">
                <ShieldIcon className="size-12 text-amber-400" />
              </motion.div>
              <h3 className={`font-serif text-lg font-bold text-foreground ${lang === 'am' ? 'font-ethiopic' : ''}`}>
                {lang === 'am' ? chapter.titleAm : chapter.titleEn}
              </h3>
              <p className="max-w-xs text-center text-xs text-muted-foreground">{t(lang, 'sniper_desc')}</p>
              <div className="flex items-center gap-3 rounded-lg border border-primary/25 px-3 py-1.5 text-[11px] text-muted-foreground">
                <span>⏱ {(durationMs / 1000).toFixed(0)}s</span>
                <span>🎯 {safeTargets.length}</span>
                <span>🏆 {chapter.scoreReward}</span>
              </div>
            </div>
          )}

          {/* submitting */}
          {phase === 'submitting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">{t(lang, 'validating')}</p>
            </div>
          )}

          {/* result */}
          {phase === 'result' && summary && (
            <div className="absolute inset-0 flex animate-fade flex-col items-center justify-center gap-3 bg-background/92 px-6">
              <motion.h3
                className={`font-serif text-3xl font-extrabold ${summary.result === 'victory' ? 'text-victory' : 'text-ember'}`}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.6 }}
              >
                {summary.result === 'victory' ? t(lang, 'victory') : t(lang, 'defeat')}
              </motion.h3>
              {summary.firstCompletion && summary.result === 'victory' && (
                <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary">
                  {t(lang, 'first_clear')}
                </span>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-center text-xs text-muted-foreground">
                <span>🏆 {t(lang, 'stat_score')}</span>
                <span className="font-mono font-bold text-primary">+{summary.scoreGain}</span>
                <span>🎯 {t(lang, 'accuracy')}</span>
                <span className="font-mono font-bold text-foreground">{summary.accuracy}%</span>
                <span>🔗 {t(lang, 'best_combo')}</span>
                <span className="font-mono font-bold text-foreground">×{summary.bestCombo}</span>
                <span>💥 {t(lang, 'enemies_eliminated')}</span>
                <span className="font-mono font-bold text-foreground">
                  {summary.hits}/{summary.shots}
                </span>
              </div>
              {summary.result === 'victory' && Object.keys(summary.rewards).length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {Object.entries(summary.rewards).map(([k, v]) => (
                    <span key={k} className="rounded-full bg-victory/15 px-2 py-0.5 font-mono text-[11px] font-bold text-victory">
                      +{v} {t(lang, k === 'fighters' ? 'res_fighters' : k === 'provisions' ? 'res_provisions' : 'res_morale')}
                    </span>
                  ))}
                </div>
              )}
              {summary.newBadges.length > 0 && (
                <span className="text-[11px] font-semibold text-amber-400">
                  🏅 {t(lang, 'new_badge')}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-1 w-full max-w-[240px] rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/85"
              >
                {t(lang, 'continue')}
              </button>
            </div>
          )}

          {phase === 'result' && submitError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/92 px-6">
              <p className="text-center text-sm text-ember">{t(lang, 'submit_failed')}</p>
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
                  {t(lang, 'retry')}
                </button>
                <button type="button" onClick={onClose} className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
                  {t(lang, 'close')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* combat HUD */}
        {phase === 'combat' && (
          <div className="relative border-t border-primary/40 bg-card/95 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-mono font-bold ${remaining <= 5 ? 'text-ember' : 'text-foreground'}`}>
                ⏱ {remaining}s
              </span>
              <span className="font-mono font-bold text-primary">🏆 {score}</span>
              <span className={`font-mono font-bold ${combo >= 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                🔗 ×{combo}
              </span>
              <span className="font-mono text-muted-foreground">
                🎯 {accuracy}% · {liveTargets.length}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/30">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${Math.min(100, (elapsed / durationMs) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* deploy button */}
        {phase === 'deploy' && (
          <div className="relative border-t border-primary/40 bg-card/95 p-3">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                audio.play('battleStart', 0.25)
                setPhase('combat')
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              {t(lang, 'sniper_deploy')}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function TargetSprite({ target }: { target: LiveTarget }) {
  const emoji =
    target.tier === 'armored' ? '🛡️' : target.tier === 'fast' ? '⚡' : '🎯'
  return (
    <motion.div
      className="absolute z-10"
      style={{ left: `${target.x}%`, top: `${target.y}%`, transform: 'translate(-50%, -50%)' }}
      initial={false}
    >
      {target.status === 'popping' && (
        <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: POP_MS / 1000 }} className="text-2xl">
          {emoji}
        </motion.div>
      )}
      {target.status === 'active' && (
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.55, repeat: Infinity }} className="relative text-3xl">
          <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]">{emoji}</span>
          {target.tier !== 'normal' && (
            <span className="absolute -right-2 -top-1 text-[9px] font-bold text-amber-400">+</span>
          )}
        </motion.div>
      )}
      {target.status === 'hit' && (
        <motion.div initial={{ scale: 1.35, opacity: 1 }} animate={{ scale: 0.2, opacity: 0 }} transition={{ duration: 0.32 }} className="text-3xl">
          💫
        </motion.div>
      )}
    </motion.div>
  )
}
