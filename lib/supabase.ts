import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Accept the original project's misspelled variable while deployments migrate
// to NEXT_PUBLIC_SUPABASE_URL.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUBASE_URL
const key = process.env.NEXT_PUBLIC_ANON_KEY

// Anonymous-auth client. All sensitive game mutations flow through
// server-side RPCs (see lib/api.ts + the production migration); this anon key
// grants nothing beyond RLS-scoped reads and RPC execution.
//
// Sessions are deliberately NOT persisted: gameplay identity travels via the
// player UUID passed to every RPC, so a Supabase auth session adds no value
// here — and stale/auto-issued JWTs can 401 every call (e.g. PGRST303
// "JWT issued at future" when the auth service clock skews ahead of PostgREST).
// With persistSession off, requests always carry the plain anon key.
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null

// One-time cleanup of legacy persisted sessions (anonymous sign-ins from older
// builds). Best-effort; failures are harmless.
if (typeof window !== "undefined") {
  try {
    const stale: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) stale.push(k)
    }
    stale.forEach((k) => window.localStorage.removeItem(k))
  } catch {}
}

// ---------------------------------------------------------------------------
// PLAYER IDENTITY
//
// - Inside Telegram: the WebApp user id is mapped to a stable, deterministic
//   UUID (SHA-256, namespaced). Same Telegram account => same player row on
//   every device and session, so progression persists.
// - Outside Telegram (browser / local dev): a fresh random UUID is generated
//   once per tab session and kept in sessionStorage for the whole session.
//
// The raw Telegram user id never leaves this module except through the
// initData payload, which the server validates via HMAC (game_link_telegram).
// ---------------------------------------------------------------------------

const TELEGRAM_HASH_NAMESPACE = "zemene-arbegnoch:v1:telegram:"
const SESSION_UUID_KEY = "zemene_session_player_uuid"

interface TgWebApp {
  ready?: () => void
  expand?: () => void
  initData?: string
  initDataUnsafe?: { user?: { id?: number; first_name?: string }; startParam?: string }
}

function getWebApp(): TgWebApp | null {
  if (typeof window === "undefined") return null
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp ?? null
}

/**
 * Wait until the Telegram WebApp object exposes a real user id. Some Android
 * WebViews inject `window.Telegram` slightly after first paint; polling beats
 * racing. Resolves with whatever is available after the timeout so browser
 * sessions are not delayed.
 */
function waitForTelegramUser(timeoutMs = 3000): Promise<TgWebApp | null> {
  return new Promise((resolve) => {
    const immediate = getWebApp()
    if (immediate?.initDataUnsafe?.user?.id) {
      resolve(immediate)
      return
    }
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const tg = getWebApp()
      if (tg?.initDataUnsafe?.user?.id) {
        window.clearInterval(timer)
        resolve(tg)
      } else if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer)
        resolve(null)
      }
    }, 50)
  })
}

// Pure-JS SHA-256 so identity derivation works identically on HTTPS origins,
// insecure dev origins (http://LAN-IP), and non-secure contexts where
// crypto.subtle is unavailable. Input is ASCII ("namespace:numeric-id").
const SHA_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function sha256Hex(message: string): string {
  const rotr = (v: number, s: number) => (v >>> s) | (v << (32 - s))
  const len = message.length

  const words: number[] = []
  for (let i = 0; i < len; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (message.charCodeAt(i) << (24 - (i % 4) * 8))
  }
  words[len >> 2] = (words[len >> 2] || 0) | (0x80 << (24 - (len % 4) * 8))
  const totalWords = Math.ceil((len + 9) / 64) * 16
  for (let i = words.length; i < totalWords; i++) words[i] = 0
  const bitLenHi = Math.floor((len * 8) / 0x100000000)
  const bitLenLo = (len * 8) >>> 0
  words[totalWords - 2] = bitLenHi
  words[totalWords - 1] = bitLenLo

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19
  const w = new Array<number>(64)

  for (let block = 0; block < totalWords; block += 16) {
    for (let i = 0; i < 16; i++) w[i] = words[block + i]
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + SHA_K[i] + w[i]) | 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) | 0
      h = g; g = f; f = e; e = (d + t1) | 0
      d = c; c = b; b = a; a = (t1 + t2) | 0
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((x) => (x >>> 0).toString(16).padStart(8, "0"))
    .join("")
}

/** Format a hex digest as a valid v4-shaped UUID string. */
function uuidFromHash(hex: string): string {
  const h = hex.slice(0, 32).split("")
  h[12] = "4"
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  const s = h.join("")
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`
}

function randomUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/**
 * Session-long temporary id for web browsers / dev-server testing.
 * Lives in sessionStorage: unique per tab session, discarded when it closes.
 */
function sessionPlayerUUID(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_UUID_KEY)
    if (existing) return existing
    const fresh = randomUuidV4()
    sessionStorage.setItem(SESSION_UUID_KEY, fresh)
    return fresh
  } catch {
    // sessionStorage unavailable (private mode etc.) — ephemeral id for this page load.
    return randomUuidV4()
  }
}

/**
 * Resolve the player UUID for the current session:
 * - Telegram: deterministic SHA-256 UUID of the Telegram user id (cached).
 * - Browser: per-session temporary UUID.
 */
let identityPromise: Promise<string> | null = null

export function getPlayerUUID(): Promise<string> {
  if (!identityPromise) {
    identityPromise = (async () => {
      const tg = await waitForTelegramUser()
      const tgId = tg?.initDataUnsafe?.user?.id
      if (tgId) {
        const uuid = uuidFromHash(sha256Hex(TELEGRAM_HASH_NAMESPACE + String(tgId)))
        console.info("[identity] telegram-linked player", uuid)
        return uuid
      }
      const uuid = sessionPlayerUUID()
      console.info("[identity] web-session player (temporary)", uuid)
      return uuid
    })().catch((err) => {
      identityPromise = null
      throw err
    })
  }
  return identityPromise
}

export function telegramInitData(): string | null {
  const tg = getWebApp()
  // Only initData is used — initDataUnsafe is never trusted for identity.
  return tg?.initData && tg.initData.length > 0 ? tg.initData : null
}
