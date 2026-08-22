import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Accept the original project's misspelled variable while deployments migrate
// to NEXT_PUBLIC_SUPABASE_URL.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUBASE_URL
const key = process.env.NEXT_PUBLIC_ANON_KEY

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export type SyncStatus = "connecting" | "saved" | "offline"

export async function getGameUser(telegramId?: string, displayName?: string) {
  if (!supabase) return null
  const { data: existing } = await supabase.auth.getUser()
  let user = existing.user
  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    user = data.user
  }
  if (!user) throw new Error("Unable to create a game session")

  // The database only accepts the authenticated user's own row (see migration).
  await supabase.from("players").upsert({
    id: user.id,
    telegram_id: telegramId || null,
    display_name: displayName || "Arbegna",
  })
  return user
}

export async function loadGameState(userId: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from("player_states")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveGameState(userId: string, state: unknown) {
  if (!supabase) return
  const { error } = await supabase.from("player_states").upsert({ user_id: userId, state })
  if (error) throw error
}

export async function trackGameEvent(userId: string, eventType: string, payload: Record<string, unknown> = {}) {
  if (!supabase) return
  // Analytics is best-effort: a missed event must never block a tap or battle.
  await supabase.from("game_events").insert({ user_id: userId, event_type: eventType, payload })
}
