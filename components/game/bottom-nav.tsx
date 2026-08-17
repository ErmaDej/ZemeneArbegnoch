"use client"

import { Tent, Swords, Trophy, User } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useGame } from "@/lib/game-context"
import { t, type TranslationKey } from "@/lib/i18n"

export type Screen = "camp" | "campaign" | "leaderboard" | "profile"

const TABS: { id: Screen; icon: LucideIcon; tk: TranslationKey }[] = [
  { id: "camp", icon: Tent, tk: "nav_camp" },
  { id: "campaign", icon: Swords, tk: "nav_campaign" },
  { id: "leaderboard", icon: Trophy, tk: "nav_leaderboard" },
  { id: "profile", icon: User, tk: "nav_profile" },
]

export function BottomNav({ active, onChange }: { active: Screen; onChange: (s: Screen) => void }) {
  const { lang } = useGame()
  return (
    <nav className="sticky bottom-0 z-30 border-t border-primary/15 bg-background/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`size-5 ${isActive ? "drop-shadow-[0_0_8px_var(--gold)]" : ""}`} aria-hidden />
              <span className={lang === "am" ? "font-ethiopic" : ""}>{t(lang, tab.tk)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
