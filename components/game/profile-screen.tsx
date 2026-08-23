"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Flag, Mountain, Wheat, Star, Copy, Check, Users2, Award, Swords, Trophy, Target } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { audio } from "@/lib/audio"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import { BADGES } from "@/lib/game-data"

const EMBLEM_ICON: Record<string, LucideIcon> = {
  flag: Flag,
  mountain: Mountain,
  wheat: Wheat,
  banner: Award,
  star: Star,
}

export function ProfileScreen() {
  const game = useGame()
  const { lang } = game
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(game.referralLink)
    } catch {}
    audio.play("referralCopy", 0.2)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const winRate =
    game.profile.lifetimeBattles > 0
      ? Math.round((game.profile.lifetimeWins / game.profile.lifetimeBattles) * 100)
      : 0

  const stats: { icon: LucideIcon; label: string; value: string; sub?: string }[] = [
    { icon: Swords, label: t(lang, "stat_chapters"), value: `${game.completedStages.length}/${BADGES.length}` },
    { icon: Trophy, label: t(lang, "stat_battles"), value: String(game.profile.lifetimeBattles) },
    { icon: Star, label: t(lang, "stat_score"), value: String(game.profile.totalScore) },
    {
      icon: Target,
      label: t(lang, "stat_accuracy"),
      value: game.profile.bestAccuracy > 0 ? `${game.profile.bestAccuracy}%` : "—",
      sub: `🔥 ×${game.profile.bestCombo} ${t(lang, "best_combo")}`,
    },
  ]

  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-4">
      {/* Identity */}
      <section className="mb-5 flex items-center gap-3 rounded-2xl border border-primary/25 bg-card/60 bg-parchment-grain p-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary/15">
          <span className="font-serif text-2xl font-bold text-primary">
            {game.profile.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xl font-bold text-foreground">{game.profile.displayName}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded bg-primary/15 px-1.5 py-0.5 font-bold text-primary">Lv. {game.profile.level}</span>
            <span>XP {game.profile.xp}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            🏅 {game.unlockedAchievements.length} / {BADGES.length} {t(lang, "profile_badges")} · ⚔️ {winRate}%{" "}
            {t(lang, "win_rate")}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-5">
        <h2 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t(lang, "profile_stats")}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-xl border border-border bg-card/60 p-3 text-center">
                <Icon className="mx-auto mb-1 size-4 text-primary" aria-hidden />
                <div className="font-mono text-lg font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] leading-tight text-muted-foreground">{s.label}</div>
                {s.sub && <div className="text-[8px] leading-tight text-muted-foreground/60">{s.sub}</div>}
              </div>
            )
          })}
        </div>
      </section>

      {/* Badges */}
      <section className="mb-5">
        <h2 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t(lang, "profile_badges")}
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {BADGES.map((b) => {
            const unlocked = game.unlockedAchievements.includes(b.id)
            const Icon = EMBLEM_ICON[b.emblem] ?? Star
            return (
              <motion.div
                key={b.id}
                whileHover={unlocked ? { scale: 1.03 } : undefined}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${
                  unlocked ? "border-primary/40 bg-primary/10" : "border-border bg-card/40"
                }`}
              >
                <div
                  className={`grid size-12 place-items-center rounded-full ${
                    unlocked ? "bg-primary/20 text-primary" : "bg-background text-muted-foreground/40"
                  }`}
                >
                  <Icon className="size-6" aria-hidden />
                </div>
                <span
                  className={`text-[11px] font-semibold leading-tight ${
                    unlocked ? "text-foreground" : "text-muted-foreground/60"
                  } ${lang === "am" ? "font-ethiopic" : ""}`}
                >
                  {lang === "am" ? b.nameAm : b.nameEn}
                </span>
              </motion.div>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {/* design constraint: badges are cosmetic collectibles with no monetary value */}
          {lang === "am"
            ? "ምልክቶች ለስብስብ ብቻ ናቸው፤ የገንዘብ ዋጋ የላቸውም።"
            : "Badges are collectible cosmetics only \u2014 no monetary value."}
        </p>
      </section>

      {/* Referral */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 font-serif text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Users2 className="size-4" aria-hidden /> {t(lang, "profile_referral")}
        </h2>
        <div className="rounded-xl border border-primary/25 bg-card/60 p-3">
          <p className={`mb-2.5 text-xs text-muted-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
            {t(lang, "referral_desc")}
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-background px-2.5 py-2 font-mono text-[11px] text-foreground/80">
              {game.profile.referralCode ? game.referralLink : t(lang, "loading")}
            </code>
            <button
              type="button"
              disabled={!game.profile.referralCode}
              onClick={copyLink}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? t(lang, "referral_copied") : t(lang, "referral_copy")}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
