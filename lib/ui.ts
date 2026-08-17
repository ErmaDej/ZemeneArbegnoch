import { Users, Wheat, Flame, type LucideIcon } from "lucide-react"
import type { ResourceKey } from "./game-data"

export const RESOURCE_META: Record<
  ResourceKey,
  { icon: LucideIcon; color: string; ring: string; tk: "res_fighters" | "res_provisions" | "res_morale" }
> = {
  fighters: { icon: Users, color: "text-accent", ring: "ring-accent/40", tk: "res_fighters" },
  provisions: { icon: Wheat, color: "text-primary", ring: "ring-primary/40", tk: "res_provisions" },
  morale: { icon: Flame, color: "text-ember", ring: "ring-ember/40", tk: "res_morale" },
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 10_000) return (n / 1_000).toFixed(1) + "k"
  return Math.floor(n).toLocaleString()
}
