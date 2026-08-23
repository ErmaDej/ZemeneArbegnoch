"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ScrollText, Check, X, Sparkles, Loader2 } from "lucide-react"
import { audio } from "@/lib/audio"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import type { TriviaQuestion } from "@/lib/game-data"

export function TriviaModal({ question, onClose }: { question: TriviaQuestion; onClose: () => void }) {
  const game = useGame()
  const { lang } = game
  const [picked, setPicked] = useState<number | null>(null)
  const [verdict, setVerdict] = useState<{ correct: boolean; rewarded: boolean } | null>(null)
  const [checking, setChecking] = useState(false)
  const options = lang === "am" ? question.optionsAm : question.optionsEn
  const answered = picked !== null
  const correct = verdict?.correct ?? false

  async function pick(i: number) {
    if (answered || checking) return
    setPicked(i)
    setChecking(true)
    try {
      // The server owns the answer key — the client never learns it beforehand.
      const result = await game.answerTrivia(question.id, i)
      setVerdict(result)
      if (!result.correct) audio.play("triviaWrong", 0.15)
    } catch {
      audio.play("triviaWrong", 0.15)
      setVerdict({ correct: false, rewarded: false })
    } finally {
      setChecking(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/90 p-3 backdrop-blur sm:items-center"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-primary/25 bg-card"
      >
        <div className="flex items-center gap-2 border-b border-border bg-primary/10 px-4 py-3">
          <ScrollText className="size-5 text-primary" aria-hidden />
          <div>
            <h2 className={`font-serif text-base font-bold text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
              {t(lang, "trivia_title")}
            </h2>
            <p className={`text-[11px] text-muted-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
              {t(lang, "trivia_intro")}
            </p>
          </div>
        </div>

        <div className="p-4">
          <p className={`mb-4 text-pretty font-medium text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
            {lang === "am" ? question.questionAm : question.questionEn}
          </p>

          <div className="flex flex-col gap-2">
            {options.map((opt, i) => {
              const isCorrect = verdict !== null && i === picked && verdict.correct
              const isWrongPick = verdict !== null && i === picked && !verdict.correct
              let cls = "border-border bg-background/60 hover:border-primary/50"
              if (answered) {
                if (isCorrect) cls = "border-victory/60 bg-victory/15"
                else if (isWrongPick) cls = "border-ember/60 bg-ember/15"
                else cls = "border-border bg-background/40 opacity-60"
              }
              return (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: answered ? 1 : 0.98 }}
                  onClick={() => void pick(i)}
                  disabled={answered}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${cls} ${
                    lang === "am" ? "font-ethiopic" : ""
                  }`}
                >
                  <span className="text-foreground">{opt}</span>
                  {checking && picked === i && <Loader2 className="size-4 shrink-0 animate-spin text-primary" />}
                  {answered && isCorrect && <Check className="size-4 shrink-0 text-victory" />}
                  {answered && isWrongPick && <X className="size-4 shrink-0 text-ember" />}
                </motion.button>
              )
            })}
          </div>

          {verdict && !checking && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <div className="flex items-center gap-2">
                <span className={`font-serif text-sm font-bold ${correct ? "text-victory" : "text-ember"}`}>
                  {correct ? t(lang, "trivia_correct") : t(lang, "trivia_wrong")}
                </span>
                {verdict.rewarded && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    <Sparkles className="size-3" /> +10 / +40 / +25
                  </span>
                )}
              </div>
              {/* sourceNote carries a NEEDS HISTORIAN REVIEW flag for pre-launch fact-checking */}
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-semibold">{t(lang, "trivia_source")}:</span>{" "}
                {question.sourceNote.replace("NEEDS HISTORIAN REVIEW: ", "")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/85"
              >
                {t(lang, "continue")}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
