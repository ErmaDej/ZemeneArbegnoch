"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { GameProvider } from "@/lib/game-context"
import { ResourceBar } from "@/components/game/resource-bar"
import { CampScreen } from "@/components/game/camp-screen"
import { CampaignScreen } from "@/components/game/campaign-screen"
import { LeaderboardScreen } from "@/components/game/leaderboard-screen"
import { ProfileScreen } from "@/components/game/profile-screen"
import { BottomNav, type Screen } from "@/components/game/bottom-nav"

export default function Page() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  )
}

function Game() {
  const [screen, setScreen] = useState<Screen>("camp")

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <ResourceBar />
      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {screen === "camp" && <CampScreen />}
            {screen === "campaign" && <CampaignScreen />}
            {screen === "leaderboard" && <LeaderboardScreen />}
            {screen === "profile" && <ProfileScreen />}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}
