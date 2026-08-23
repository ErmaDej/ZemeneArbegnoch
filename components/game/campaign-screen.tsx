"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Lock, Check, Swords, ChevronRight, Crown, Target } from "lucide-react"
import { audio } from "@/lib/audio"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import { CHAPTERS, TRIVIA_BANK, type ChapterDef } from "@/lib/game-data"
import type { BattleSession } from "@/lib/api"
import { BattleView } from "./battle-view"
import { SniperBattle } from "./sniper-battle"
import { TriviaModal } from "./trivia-modal"

export function CampaignScreen() {
  const game = useGame()
  const { lang } = game
  const [battle, setBattle] = useState<{ chapter: ChapterDef; session: BattleSession } | null>(null)
  const [starting, setStarting] = useState<number | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [triviaId, setTriviaId] = useState<number | null>(null)

  async function beginBattle(chapter: ChapterDef) {
    setStartError(null)
    setStarting(chapter.id)
    audio.play("battleStart", 0.2)
    try {
      const session = await game.prepareBattle(chapter.id)
      if (!session.ok) {
        setStartError(session.reason === "locked" ? t(lang, "locked") : t(lang, "submit_failed"))
        return
      }
      setBattle({ chapter, session })
    } catch {
      setStartError(t(lang, "offline_msg"))
    } finally {
      setStarting(null)
    }
  }

  function handleBattleClosed(chapterId: number) {
    setBattle(null)
    // Trivia interlude after every 2 chapters cleared.
    if (game.completedStages.includes(chapterId) && chapterId % 2 === 0) {
      const next = TRIVIA_BANK.find((q) => !game.answeredTrivia.includes(q.id))
      if (next) setTimeout(() => setTriviaId(next.id), 350)
    }
  }

  const triviaQuestion = triviaId ? (TRIVIA_BANK.find((q) => q.id === triviaId) ?? null) : null
  const maxCompleted = game.completedStages.length > 0 ? Math.max(...game.completedStages) : 0

  return (
    <div className="mx-auto max-w-md px-4 pb-4 pt-4">
      <div className="mb-4">
        <p className="font-serif text-xs uppercase tracking-[0.25em] text-primary/90">
          {t(lang, "appSubtitle")}
        </p>
        <h1 className={`font-serif text-2xl font-bold text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
          {t(lang, "campaign_title")}
        </h1>
      </div>

      {startError && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 rounded-xl border border-ember/40 bg-ember/10 px-3 py-2 text-center text-xs font-semibold text-ember">
          {startError}
        </motion.p>
      )}

      <div className="relative">
        {/* trail line */}
        <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/50 via-border to-border" />

        <ol className="flex flex-col gap-3">
          {CHAPTERS.map((ch) => {
            const done = game.completedStages.includes(ch.id)
            const unlocked = ch.id <= maxCompleted + 1
            const isFinal = ch.id === CHAPTERS.length
            const stat = game.stageStats[String(ch.id)]
            return (
              <li key={ch.id} className="relative flex items-start gap-3">
                <div
                  className={`z-10 grid size-14 shrink-0 place-items-center rounded-full border-2 ${
                    done
                      ? "border-victory bg-victory/20 text-victory"
                      : unlocked
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <Check className="size-6" />
                  ) : unlocked ? (
                    isFinal ? (
                      <Crown className="size-6" />
                    ) : ch.battleType === "sniper" ? (
                      <Target className="size-6" />
                    ) : (
                      <span className="font-serif text-lg font-bold">{ch.id}</span>
                    )
                  ) : (
                    <Lock className="size-5" />
                  )}
                </div>

                <div
                  className={`flex-1 rounded-xl border p-3 transition-colors ${
                    unlocked ? "border-border bg-card/60" : "border-border/50 bg-card/30 opacity-70"
                  } ${isFinal && unlocked ? "border-primary/40" : ""} ${ch.battleType === "sniper" && unlocked ? "border-ember/30 bg-ember/5" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-balance text-sm font-semibold text-foreground ${
                        lang === "am" ? "font-ethiopic" : ""
                      }`}
                    >
                      {lang === "am" ? ch.titleAm : ch.titleEn}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {stat && <span className="shrink-0 font-mono text-[10px] text-primary">{"★".repeat(stat.stars)}</span>}
                      {ch.battleType === "sniper" && unlocked && (
                        <span className="shrink-0 rounded-full bg-ember/15 px-1.5 py-0.5 text-[9px] font-bold text-ember">
                          🎯
                        </span>
                      )}
                      {done && (
                        <span className="shrink-0 rounded-full bg-victory/15 px-2 py-0.5 text-[10px] font-bold text-victory">
                          {t(lang, "victory")}
                        </span>
                      )}
                    </div>
                  </div>
                  <p
                    className={`mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground ${
                      lang === "am" ? "font-ethiopic" : ""
                    }`}
                  >
                    {lang === "am" ? ch.blurbAm : ch.blurbEn}
                  </p>

                  {unlocked && (
                    <motion.button
                      type="button"
                      disabled={starting !== null}
                      onClick={() => void beginBattle(ch)}
                      whileTap={{ scale: 0.96 }}
                      className={`mt-2.5 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                        done
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          : "bg-primary text-primary-foreground hover:bg-primary/85"
                      }`}
                    >
                      <Swords className="size-3.5" />
                      {starting === ch.id
                        ? t(lang, "preparing")
                        : done
                          ? t(lang, "retry")
                          : ch.battleType === "sniper"
                            ? "🎯 " + t(lang, "battle_start")
                            : t(lang, "battle_start")}
                      <ChevronRight className="size-3.5" />
                    </motion.button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <AnimatePresence>
        {battle &&
          (battle.session.battleType === "sniper" ? (
            <SniperBattle
              key="sniper"
              chapter={battle.chapter}
              session={battle.session}
              onClose={() => handleBattleClosed(battle.chapter.id)}
            />
          ) : (
            <BattleView
              key="battle"
              chapter={battle.chapter}
              session={battle.session}
              onClose={() => handleBattleClosed(battle.chapter.id)}
            />
          ))}
        {triviaQuestion && (
          <TriviaModal key="trivia" question={triviaQuestion} onClose={() => setTriviaId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
