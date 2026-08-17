"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Tent, ChevronsUp } from "lucide-react"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import { UPGRADES, upgradeCost, type ResourceKey } from "@/lib/game-data"
import { RESOURCE_META, fmt } from "@/lib/ui"

interface FloatText {
  id: number
  x: number
  label: string
  color: string
}

const ORDER: ResourceKey[] = ["fighters", "provisions", "morale"]

export function CampScreen() {
  const game = useGame()
  const { lang } = game
  const [floats, setFloats] = useState<FloatText[]>([])

  function handleGather(resource: ResourceKey) {
    game.gather(resource)
    const gain = resource === "provisions" ? 3 : resource === "fighters" ? 1 : 2
    const meta = RESOURCE_META[resource]
    const id = Date.now() + Math.random()
    setFloats((f) => [...f, { id, x: Math.random() * 60 - 30, label: `+${gain}`, color: meta.color }])
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900)
  }

  return (
    <div className="mx-auto max-w-md pb-4">
      {/* Camp hero */}
      <section className="relative overflow-hidden">
        <img
          src="/camp-bg.png"
          alt="Highland war camp at dawn with tents and campfires"
          className="h-52 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="font-serif text-xs uppercase tracking-[0.25em] text-primary/90">
            {t(lang, "appSubtitle")}
          </p>
          <h1
            className={`text-glow-gold text-balance font-serif text-2xl font-bold text-foreground ${
              lang === "am" ? "font-ethiopic" : ""
            }`}
          >
            {t(lang, "camp_title")}
          </h1>
        </div>
      </section>

      {/* Gather pad */}
      <section className="px-4 pt-4">
        <div className="relative flex items-center justify-center rounded-2xl border border-primary/20 bg-card/50 bg-parchment-grain py-5">
          <AnimatePresence>
            {floats.map((f) => (
              <motion.span
                key={f.id}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: -46 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className={`pointer-events-none absolute top-4 font-mono text-sm font-bold ${f.color}`}
                style={{ left: `calc(50% + ${f.x}px)` }}
              >
                {f.label}
              </motion.span>
            ))}
          </AnimatePresence>
          <div className="grid w-full grid-cols-3 gap-2 px-3">
            {ORDER.map((key) => {
              const meta = RESOURCE_META[key]
              const Icon = meta.icon
              return (
                <motion.button
                  key={key}
                  type="button"
                  onClick={() => handleGather(key)}
                  whileTap={{ scale: 0.92 }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background/60 py-3 transition-all hover:border-primary/50 hover:bg-background"
                >
                  <Icon className={`size-6 ${meta.color}`} aria-hidden />
                  <span className="text-[11px] font-medium text-muted-foreground">{t(lang, meta.tk)}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">{t(lang, "tapToGather")}</p>
      </section>

      {/* Upgrade tree */}
      <section className="px-4 pt-5">
        <div className="mb-3 flex items-center gap-2">
          <Tent className="size-4 text-primary" aria-hidden />
          <h2 className="font-serif text-lg font-semibold text-foreground">{t(lang, "camp_upgrades")}</h2>
        </div>
        <div className="flex flex-col gap-2.5">
          {UPGRADES.map((u) => {
            const level = game.upgradeLevels[u.id] ?? 0
            const cost = upgradeCost(u, level)
            const afford = game.canAfford(u.id)
            const resMeta = RESOURCE_META[u.resource]
            const costMeta = RESOURCE_META[u.costResource]
            const ResIcon = resMeta.icon
            const CostIcon = costMeta.icon
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
              >
                <div className={`grid size-11 shrink-0 place-items-center rounded-lg bg-background ${resMeta.color}`}>
                  <ResIcon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`truncate text-sm font-semibold text-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
                      {lang === "am" ? u.nameAm : u.nameEn}
                    </span>
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {t(lang, "level")} {level}
                    </span>
                  </div>
                  <p className={`truncate text-xs text-muted-foreground ${lang === "am" ? "font-ethiopic" : ""}`}>
                    +{(u.baseRate * (level + 1)).toFixed(1)} {t(lang, resMeta.tk)}
                    {t(lang, "perSec")}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  disabled={!afford}
                  onClick={() => game.buyUpgrade(u.id)}
                  className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    afford
                      ? "bg-primary text-primary-foreground hover:bg-primary/85"
                      : "cursor-not-allowed bg-secondary text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <ChevronsUp className="size-3.5" aria-hidden />
                    {t(lang, "upgrade")}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <CostIcon className="size-3" aria-hidden />
                    {fmt(cost)}
                  </span>
                </motion.button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
