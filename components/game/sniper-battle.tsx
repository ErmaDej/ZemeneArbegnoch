'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldIcon, Loader2 } from 'lucide-react'
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

type Phase = 'deploy' | 'countIn' | 'combat' | 'submitting' | 'result'

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

  const safeTargets: BattleTarget[] = Array.isArray(session.targets) ? session.targets : []
  const durationMs =
    typeof session.durationMs === 'number' && Number.isFinite(session.durationMs) && session.durationMs > 0
      ? session.durationMs
      : 30000

  const [phase, setPhase] = useState<Phase>('deploy')
  const [countIn, setCountIn] = useState(0)
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
  const [screenFlash, setScreenFlash] = useState(false)
  const [screenShake, setScreenShake] = useState<"none" | "light" | "heavy">("none")
  const [summary, setSummary] = useState<BattleSummary | null>(null)
  const [submitError, setSubmitError] = useState(false)

  const startRef = useRef<number>(0)
  const actionsRef = useRef<BattleAction[]>([])
  const comboRef = useRef<{ count: number; lastHitAt: number }>({ count: 0, lastHitAt: -99999 })
  const hitIdsRef = useRef<Set<string>>(new Set())
  const endedRef = useRef(false)
  const comboWindowMs =
    typeof session.config?.comboWindowMs === 'number' && Number.isFinite(session.config.comboWindowMs)
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
  }, [session.sessionId])

  // 3-2-1 count-in
  useEffect(() => {
    if (phase !== 'countIn') return
    setCountIn(3)
    const ticks: Array<ReturnType<typeof setTimeout>> = []
    ticks.push(setTimeout(() => setCountIn(2), 700))
    ticks.push(setTimeout(() => setCountIn(1), 1400))
    ticks.push(setTimeout(() => {
      setCountIn(0)
      setPhase('combat')
    }, 2100))
    return () => { ticks.forEach(clearTimeout) }
  }, [phase])

  // Schedule driver
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
          if (nowMs >= tg.spawnMs + tg.lifetimeMs) return { ...tg, status: 'expired' }
          anyLive = true
          if (nowMs >= tg.spawnMs && tg.status === 'pending') return { ...tg, status: 'popping' }
          if (nowMs >= tg.spawnMs + POP_MS && tg.status === 'popping') return { ...tg, status: 'active' }
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
    setCrosshair(getPercent(e.clientX, e.clientY, rect))
  }

  const fire = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'combat' || endedRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pt = getPercent(e.clientX, e.clientY, rect)
    const nowMs = Math.round(performance.now() - startRef.current)

    audio.play('sniperShot', 0.25)

    // Muzzle flash: radial burst + screen flash
    const id = Date.now()
    setMuzzle({ x: pt.x, y: pt.y, id })
    setTimeout(() => setMuzzle((m) => (m?.id === id ? null : m)), 140)
    setScreenFlash(true)
    setTimeout(() => setScreenFlash(false), 60)
    setScreenShake('light')
    setTimeout(() => setScreenShake('none'), 300)

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
    particles.spawn({ x: pt.x, y: pt.y, count: 12, type: 'hit', spread: 1, speed: 5 })
    particles.spawn({ x: pt.x, y: pt.y, count: 6, type: 'spark', spread: 0.8, speed: 3 })
    // Kill confirm on last enemy
    const remainingLive = safeTargets.filter((t) => !hitIdsRef.current.has(t.id) && t.id !== victim.id).length
    if (remainingLive === 0) {
      audio.play('killConfirm', 0.35)
      audio.play('enemyGrunt', 0.25)
      setScreenShake('heavy')
      setTimeout(() => setScreenShake('none'), 450)
    } else {
      audio.play('impactThud', 0.18)
    }
    const dmgId = Date.now() + Math.random()
    setDamageNumbers((dn) => [...dn, { id: dmgId, x: pt.x, y: pt.y, text: `+${gained}` }])
    setTimeout(() => setDamageNumbers((dn) => dn.filter((d) => d.id !== dmgId)), 900)

    if (c > 0 && c % 5 === 0) audio.play('hitConfirm', 0.22)
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

        {/* screen flash on shot */}
        {screenFlash && (
          <div className="pointer-events-none absolute inset-0 z-40 bg-amber-200/8 mix-blend-screen" />
        )}

        {/* main arena */}
        <div
          className={`relative h-[360px] w-full flex-1 overflow-hidden ${
            phase === 'combat' ? 'cursor-crosshair touch-none' : ''
          } ${
            screenShake === 'heavy' ? 'animate-screen-shake-heavy' : screenShake === 'light' ? 'animate-screen-shake' : ''
          }`}
          onPointerMove={handlePointer}
          onPointerDown={fire}
        >
          {/* Parallax battlefield layers */}
          <div className="absolute inset-0 parallax-sky" />
          <div className="absolute inset-0 parallax-mountains" />
          <img src="/battle-bg.png" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 parallax-ground" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          {/* military scan-line overlay for war-game feel */}
          <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
            }}
          />

          {/* live targets */}
          {phase === 'combat' &&
            targets
              .filter((tg) => tg.status === 'popping' || tg.status === 'active' || tg.status === 'hit')
              .map((tg) => <EnemySoldier key={tg.id} target={tg} />)}

          {phase === 'combat' && (
            <>
              {/* Custom SVG crosshair */}
              <div
                className="pointer-events-none absolute z-30"
                style={{ left: `${crosshair.x}%`, top: `${crosshair.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <svg width="48" height="48" viewBox="0 0 48 48" className="drop-shadow-[0_0_6px_rgba(245,158,30,0.6)]">
                  {/* outer ring */}
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(245,158,30,0.5)" strokeWidth="1.5" />
                  {/* inner ring */}
                  <circle cx="24" cy="24" r="10" fill="none" stroke="rgba(245,158,30,0.7)" strokeWidth="1" />
                  {/* cross lines */}
                  <line x1="24" y1="2" x2="24" y2="14" stroke="rgba(245,158,30,0.8)" strokeWidth="1.5" />
                  <line x1="24" y1="34" x2="24" y2="46" stroke="rgba(245,158,30,0.8)" strokeWidth="1.5" />
                  <line x1="2" y1="24" x2="14" y2="24" stroke="rgba(245,158,30,0.8)" strokeWidth="1.5" />
                  <line x1="34" y1="24" x2="46" y2="24" stroke="rgba(245,158,30,0.8)" strokeWidth="1.5" />
                  {/* center dot */}
                  <circle cx="24" cy="24" r="2" fill="rgba(245,158,30,0.9)" />
                  {/* corner brackets */}
                  <path d="M6,6 L6,14 M6,6 L14,6" fill="none" stroke="rgba(245,158,30,0.6)" strokeWidth="1" />
                  <path d="M42,6 L42,14 M42,6 L34,6" fill="none" stroke="rgba(245,158,30,0.6)" strokeWidth="1" />
                  <path d="M6,42 L6,34 M6,42 L14,42" fill="none" stroke="rgba(245,158,30,0.6)" strokeWidth="1" />
                  <path d="M42,42 L42,34 M42,42 L34,42" fill="none" stroke="rgba(245,158,30,0.6)" strokeWidth="1" />
                </svg>
              </div>

              {/* muzzle flash burst */}
              {muzzle && (
                <motion.div
                  initial={{ scale: 0.3, opacity: 1 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  className="pointer-events-none absolute z-10"
                  style={{ left: `${muzzle.x}%`, top: `${muzzle.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="6" fill="rgba(255,200,50,0.9)" />
                    <circle cx="20" cy="20" r="12" fill="none" stroke="rgba(255,160,30,0.6)" strokeWidth="2" />
                    {/* radial burst lines */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <line
                        key={deg}
                        x1="20" y1="20"
                        x2={20 + Math.cos(deg * Math.PI / 180) * 18}
                        y2={20 + Math.sin(deg * Math.PI / 180) * 18}
                        stroke="rgba(255,200,50,0.7)"
                        strokeWidth="1.5"
                      />
                    ))}
                  </svg>
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
                <span>&#9201; {(durationMs / 1000).toFixed(0)}s</span>
                <span>&#9673; {safeTargets.length} targets</span>
                <span>&#9733; {chapter.scoreReward} pts</span>
              </div>
            </div>
          )}

          {/* count-in: 3 → 2 → 1 */}
          {phase === 'countIn' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-background/85">
              <AnimatePresence mode="popLayout">
                {countIn > 0 && (
                  <motion.h2
                    key={countIn}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="text-glow-gold font-serif text-7xl font-extrabold text-amber-300"
                  >
                    {countIn}
                  </motion.h2>
                )}
              </AnimatePresence>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">
                {t(lang, 'count_in_sub')}
              </p>
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
                <span>&#9733; {t(lang, 'stat_score')}</span>
                <span className="font-mono font-bold text-primary">+{summary.scoreGain}</span>
                <span>&#9673; {t(lang, 'accuracy')}</span>
                <span className="font-mono font-bold text-foreground">{summary.accuracy}%</span>
                <span>&#9876; {t(lang, 'best_combo')}</span>
                <span className="font-mono font-bold text-foreground">&times;{summary.bestCombo}</span>
                <span>&#10006; {t(lang, 'enemies_eliminated')}</span>
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
                  &#127942; {t(lang, 'new_badge')}
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

        {/* combat HUD — military style */}
        {phase === 'combat' && (
          <div className="relative border-t border-primary/40 bg-card/95 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-mono font-bold ${remaining <= 5 ? 'text-ember animate-pulse' : 'text-foreground'}`}>
                &#9201; {remaining}s
              </span>
              <span className="font-mono font-bold text-primary">{score} PTS</span>
              <span className={`font-mono font-bold ${combo >= 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                &#9876; &times;{combo}
              </span>
              <span className="font-mono text-muted-foreground">
                &#9673; {accuracy}% &middot; {liveTargets.length}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/30">
              <div
                className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-200"
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
                setPhase('countIn')
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

/**
 * Graphical enemy soldier rendered with SVG — replaces emoji targets.
 * Each tier has a distinct silhouette:
 *   normal  → basic soldier with helmet
 *   armored → soldier with shield overlay
 *   fast    → scout with lighter build
 */
function EnemySoldier({ target }: { target: LiveTarget }) {
  const tier = target.tier ?? 'normal'

  // Color palettes per tier (stylized, no gore)
  const colors = {
    normal:  { body: '#7c6b5a', helmet: '#5a4e3e', accent: '#b8a88a' },
    armored: { body: '#6b5b4a', helmet: '#4a3e2e', accent: '#d4a55a', shield: '#8b7355' },
    fast:    { body: '#8a7a6a', helmet: '#5e5040', accent: '#6aba7a' },
  }[tier]

  return (
    <motion.div
      className="absolute z-10"
      style={{ left: `${target.x}%`, top: `${target.y}%`, transform: 'translate(-50%, -50%)' }}
      initial={false}
    >
      {target.status === 'popping' && (
        <motion.div
          initial={{ scale: 0.2, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: POP_MS / 1000, ease: 'easeOut' }}
        >
          <SoldierSVG colors={colors} tier={tier} />
        </motion.div>
      )}
      {target.status === 'active' && (
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <div className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            <SoldierSVG colors={colors} tier={tier} />
          </div>
          {tier !== 'normal' && (
            <span className="absolute -right-1 -top-1 text-[8px] font-bold text-amber-400 bg-background/60 rounded px-0.5">
              {tier === 'armored' ? 'HD' : 'SP'}
            </span>
          )}
        </motion.div>
      )}
      {target.status === 'hit' && (
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
      )}
    </motion.div>
  )
}

/** SVG soldier silhouette — stylized, non-graphical, all-ages safe */
function SoldierSVG({ colors, tier }: { colors: { body: string; helmet: string; accent: string; shield?: string }; tier: string }) {
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* helmet */}
      <ellipse cx="18" cy="10" rx="8" ry="6" fill={colors.helmet} />
      <rect x="10" y="8" width="16" height="4" rx="2" fill={colors.helmet} />
      {/* helmet brim */}
      <rect x="8" y="12" width="20" height="2" rx="1" fill={colors.accent} opacity="0.6" />
      {/* face area */}
      <rect x="12" y="13" width="12" height="5" rx="2" fill={colors.accent} opacity="0.5" />
      {/* body / torso */}
      <rect x="11" y="18" width="14" height="12" rx="3" fill={colors.body} />
      {/* belt */}
      <rect x="11" y="26" width="14" height="2" fill={colors.accent} opacity="0.4" />
      {/* legs */}
      <rect x="12" y="30" width="5" height="10" rx="2" fill={colors.body} />
      <rect x="19" y="30" width="5" height="10" rx="2" fill={colors.body} />
      {/* boots */}
      <rect x="11" y="38" width="6" height="4" rx="2" fill={colors.helmet} />
      <rect x="19" y="38" width="6" height="4" rx="2" fill={colors.helmet} />
      {/* weapon (rifle silhouette) */}
      <rect x="26" y="16" width="2" height="18" rx="1" fill={colors.accent} opacity="0.7" />
      <rect x="24" y="14" width="6" height="3" rx="1" fill={colors.accent} opacity="0.5" />
      {/* armored: shield overlay on torso */}
      {tier === 'armored' && colors.shield && (
        <>
          <rect x="9" y="19" width="18" height="11" rx="4" fill={colors.shield} opacity="0.5" stroke={colors.accent} strokeWidth="1" />
          <line x1="18" y1="19" x2="18" y2="30" stroke={colors.accent} strokeWidth="0.5" opacity="0.4" />
        </>
      )}
      {/* fast: motion lines */}
      {tier === 'fast' && (
        <>
          <line x1="4" y1="20" x2="8" y2="20" stroke={colors.accent} strokeWidth="1" opacity="0.4" />
          <line x1="2" y1="24" x2="7" y2="24" stroke={colors.accent} strokeWidth="1" opacity="0.3" />
          <line x1="5" y1="28" x2="9" y2="28" stroke={colors.accent} strokeWidth="1" opacity="0.3" />
        </>
      )}
    </svg>
  )
}
