"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Trophy, Crown, Medal, UserSearch } from "lucide-react"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import { fmt } from "@/lib/ui"
import { api, type LeaderRow } from "@/lib/api"

export function LeaderboardScreen() {
  const game = useGame()
  const { lang } = game
  const [tab, setTab] = useState<"global" | "friends">("global")
  const [rows, setRows] = useState<LeaderRow[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRows(null)
    setError(false)
    void api
      .leaderboard(tab)
      .then((data) => {
        if (!cancelled) setRows(data ?? [])
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [tab])

  // The current player's own row, injected if absent from the top-50 window.
  const rowsWithMe = useMemo<LeaderRow[]>(() => {
    if (!rows) return []
    const mine = rows.some((r) => r.name === game.profile.displayName && r.score === game.profile.totalScore)
    if (mine || game.profile.totalScore <= 0) return rows
    return [
      ...rows,
      { player_id: "me", name: game.profile.displayName, score: game.profile.totalScore, player_rank: 0 },
    ].sort((a, b) => Number(b.score) - Number(a.score))
  }, [rows, game.profile.displayName, game.profile.totalScore])

  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-4">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="size-5 text-primary" aria-hidden />
        <h1 className="font-serif text-2xl font-bold text-foreground">
          {tab === "global" ? t(lang, "lb_global") : t(lang, "lb_friends")}
        </h1>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card/60 p-1">
        {(["global", "friends"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(lang, k === "global" ? "lb_global" : "lb_friends")}
          </button>
        ))}
      </div>

      {/* Honest states: loading, error, and genuinely empty leaderboards. */}
      {rows === null && !error && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <UserSearch className="size-6 animate-pulse" />
          <p className="text-xs">{t(lang, "loading")}</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-ember">{t(lang, "offline_msg")}</p>
          <button type="button" onClick={() => game.refreshState()} className="rounded-lg bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground">
            {t(lang, "retry")}
          </button>
        </div>
      )}

      {rows !== null && rows.length === 0 && !error && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Crown className="size-8 text-primary/50" />
          <p className={`max-w-[240px] text-sm text-muted-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
            {t(lang, "lb_empty")}
          </p>
          <button
            type="button"
            onClick={() => setTab("global")}
            className="mt-1 rounded-lg bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground"
          >
            {t(lang, "battle_start")}
          </button>
        </div>
      )}

      {rows !== null && rowsWithMe.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {rowsWithMe.map((p, i) => {
            const rank = p.player_rank || i + 1
            const mine = p.name === game.profile.displayName && p.score === game.profile.totalScore
            return (
              <motion.li
                key={p.player_id || `row-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  mine
                    ? "border-primary/60 bg-primary/10"
                    : rank <= 3
                      ? "border-primary/25 bg-card/70"
                      : "border-border bg-card/40"
                }`}
              >
                <div className="grid w-7 shrink-0 place-items-center">
                  {rank === 1 ? (
                    <Crown className="size-5 text-primary" />
                  ) : rank <= 3 ? (
                    <Medal className={`size-5 ${rank === 2 ? "text-muted-foreground" : "text-ember"}`} />
                  ) : (
                    <span className="font-mono text-sm font-semibold text-muted-foreground">{rank}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
                    {p.name}
                    {mine && <span className="ml-1 text-xs text-primary">({t(lang, "you")})</span>}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">Lv. {Math.max(1, Math.floor(p.score / 500) + 1)}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-primary">{fmt(Number(p.score))}</span>
              </motion.li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
