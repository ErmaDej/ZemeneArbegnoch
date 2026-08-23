import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Accept the original project's misspelled variable while deployments migrate
// to NEXT_PUBLIC_SUPABASE_URL.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUBASE_URL
const key = process.env.NEXT_PUBLIC_ANON_KEY

// Anonymous-auth client. All sensitive game mutations flow through
// server-side RPCs (see lib/api.ts + the production migration); this anon key
// grants nothing beyond RLS-scoped reads and RPC execution.
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export async function getGameUser(): Promise<string | null> {
  if (!supabase) return null
  const { data: existing } = await supabase.auth.getUser()
  if (existing.user) return existing.user.id
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.user?.id ?? null
}

export function telegramInitData(): string | null {
  if (typeof window === "undefined") return null
  const tg = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp
  // Only initData is used — initDataUnsafe is never trusted for identity.
  return tg?.initData && tg.initData.length > 0 ? tg.initData : null
}
