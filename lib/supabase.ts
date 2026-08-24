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
  if (!supabase) {
    console.error("[getGameUser] Supabase client not initialized")
    return null
  }
  
  const { data: existing, error: userError } = await supabase.auth.getUser()
  if (userError) {
    console.warn("[getGameUser] getUser error:", userError.message)
  }
  
  if (existing.user) {
    console.log("[getGameUser] Found existing session:", existing.user.id)
    return existing.user.id
  }
  
  console.log("[getGameUser] No existing session, signing in anonymously...")
  const { data, error } = await supabase.auth.signInAnonymously()
  
  if (error) {
    console.error("[getGameUser] Anonymous auth failed:", error)
    throw error
  }
  
  const uid = data.user?.id ?? null
  console.log("[getGameUser] Anonymous auth success:", uid)
  return uid
}

export function telegramInitData(): string | null {
  if (typeof window === "undefined") return null
  const tg = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp
  // Only initData is used — initDataUnsafe is never trusted for identity.
  return tg?.initData && tg.initData.length > 0 ? tg.initData : null
}
