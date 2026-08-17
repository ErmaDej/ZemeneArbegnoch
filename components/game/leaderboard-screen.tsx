"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Trophy, Crown, Medal } from "lucide-react"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import { fmt } from "@/lib/ui"
import { DEMO_LEADERBOARD, type LeaderPlayer } from "@/lib/leaderboard-data"

export function LeaderboardScreen() {
  const game = useGame()
  const { lang } = game
  const [tab, setTab] = useState<"global" | "friends">("global")

  // Inject the current player into the standings by score.
  const me: LeaderPlayer = {
    id: "me",
    name: game.displayName,
    regiment: "Dawn Vanguard",
    score: game.score,
    isFriend: false,
  }

  const rows = useMemo(() => {
    const base = [...DEMO_LEADERBOARD, me].sort((a, b) => b.score - a.score)
    const filtered = tab === "friends" ? base.filter((p) => p.isFriend || p.id === "me") : base.slice(0, 50)
    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, game.score, game.displayName])

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

      <ol className="flex flex-col gap-1.5">
        {rows.map((p, i) => {
          const rank = i + 1
          const mine = p.id === "me"
          return (
            <motion.li
              key={p.id}
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
                <p className="truncate text-sm font-semibold text-foreground">
                  {p.name}
                  {mine && <span className="ml-1 text-xs text-primary">({t(lang, "lb_player")})</span>}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{p.regiment}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-primary">
                {fmt(p.score)}
              </span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
