"use client"

import { motion } from "framer-motion"
import { Cloud, CloudOff, Globe, LoaderCircle, Volume2, VolumeX } from "lucide-react"
import { audio } from "@/lib/audio"
import { useGame } from "@/lib/game-context"
import { t } from "@/lib/i18n"
import { RESOURCE_META, fmt } from "@/lib/ui"
import type { ResourceKey } from "@/lib/game-data"

const ORDER: ResourceKey[] = ["fighters", "provisions", "morale"]

export function ResourceBar() {
  const game = useGame()
  const { lang, resources, rates } = game
  const syncLabel = game.syncStatus === "saved" ? "Saved" : game.syncStatus === "offline" ? "Offline save" : "Connecting"

  return (
    <header className="sticky top-0 z-30 border-b border-primary/15 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2">
        {ORDER.map((key) => {
          const meta = RESOURCE_META[key]
          const Icon = meta.icon
          return (
            <div
              key={key}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5"
            >
              <Icon className={`size-4 shrink-0 ${meta.color}`} aria-hidden />
              <div className="min-w-0 leading-tight">
                <motion.div
                  key={`resource-${key}`}
                  initial={{ opacity: 0.6, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="truncate font-mono text-sm font-semibold tabular-nums text-foreground"
                >
                  {fmt(resources[key])}
                </motion.div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {rates[key] > 0 ? `+${rates[key].toFixed(1)}${t(lang, "perSec")}` : t(lang, meta.tk)}
                </div>
              </div>
            </div>
          )
        })}
        <button
          type="button"
          onClick={() => game.setLang(lang === "am" ? "en" : "am")}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          aria-label="Toggle language"
        >
          <Globe className="size-4" aria-hidden />
          <span className="w-6 text-center">{lang === "am" ? "አ" : "EN"}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            game.toggleAudio()
            audio.play(game.audioMuted ? "click" : "click", 0.1)
          }}
          className="flex shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 p-1.5 text-primary hover:bg-primary/20"
          aria-label={game.audioMuted ? "Unmute" : "Mute"}
        >
          {game.audioMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
      <div className="mx-auto flex max-w-md items-center justify-end gap-1 px-3 pb-1.5 text-[10px] text-muted-foreground" aria-live="polite">
        {game.syncStatus === "saved" ? <Cloud className="size-3 text-victory" /> : game.syncStatus === "offline" ? <CloudOff className="size-3 text-ember" /> : <LoaderCircle className="size-3 animate-spin" />}
        {syncLabel}
      </div>
    </header>
  )
}
