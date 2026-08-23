# Zemene Arbegnoch — Development Plan (Production Context)

ዘመነ አርበኞች — Age of the Patriots
Telegram Mini App • Adwa-inspired live action strategy / action game

> **Status update:** This plan has been refined against the authoritative
> `Ref/Zemene-Arbegnoch-Production-Vibe-Coding-Master-Context.md`. The original
> idle + auto-battle MVP scope has been superseded by the production loop:
>
> **persistent base → tactical preparation → active target/shooting battle →
> server validation → real rewards → persistent progression → real social
> competition**

---

## Executive Summary

**Project Goal:** A Telegram-native action-strategy game where players build a
persistent patriot camp, prepare tactically, play fast active target/shooting
battles, and compete on real, server-computed leaderboards — themed on the 1896
Battle of Adwa and the Ethiopian resistance era.

**Non-negotiable architecture rule:** *The client renders. The server decides.*
No resource amount, score, battle outcome, reward, unlock, or leaderboard entry
is ever computed or persisted by the browser.

**Current State (post-refactor):** The vertical slice below is implemented:

| Layer | Implementation |
|---|---|
| Auth | Supabase anonymous session + `game_link_telegram` RPC that HMAC-validates Telegram `initData` inside the database (`initDataUnsafe` is never trusted) |
| Persistence | Normalized schema: `players`, `player_resources`, `resource_ledger`, `player_buildings`, `player_campaign`, `battle_sessions`, `trivia_*`, `referrals`, `achievements`, `anti_cheat_events` |
| Camp | Tap-gather, building upgrades, and passive idle claims are all server-side RPCs with ledger entries and rate limiting |
| Battles | Every battle opens a server-owned `battle_sessions` row with a random seed. Sniper battles receive a deterministic target schedule generated in SQL; every tap is validated against it. Formation battles resolve deterministically from the seed |
| Rewards | Atomic server pipeline: validate → score → reward → ledger → resources → progression → achievements → commit |
| Social | Real leaderboard RPC over actual players only (honest empty states); one-time server-validated referral rewards |
| Trivia | Answer key lives only in the database; verdicts and rewards are server-side |
| Anti-cheat foundation | Session ownership/expiry, chronological action ordering, duplicate-hit rejection, legal timing windows, fire-rate plausibility, signature mismatch logging |

---

## Phase 0 — Deployment Checklist (required once, before real users)

1. **Apply the migration:** run
   `supabase/migrations/202608230001_production_core.sql` in the Supabase SQL
   editor (idempotent). It also imports any legacy JSON-blob saves.
2. **Secure the bot token:**
   ```sql
   ALTER DATABASE postgres SET "app.telegram_bot_token" = '<YOUR_BOT_TOKEN>';
   ```
   ⚠️ A bot token was previously committed to git history. **Revoke it via
   @BotFather (/revoke) and reissue** before launch.
3. **Vercel env vars:** set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_ANON_KEY` (the misspelled `NEXT_PUBLIC_SUBASE_URL` is still
   accepted but should be removed). No secrets are needed client-side anymore.
4. **Verify the vertical slice** with a fresh Telegram account:
   open → authenticate → camp persists → battle validates → rewards persist
   after reload → progression unlocks → re-open later shows the same state.

## Phase 1 — Harden & Balance the Vertical Slice

- Playtest all 8 stages; tune sniper pacing per difficulty (`build_sniper_targets`).
- Add energy/session control (server-owned daily energy) if retention data supports it.
- Battle objectives beyond "hit X%" (priority targets, accuracy gates, combo objectives).
- Offline/reconnect UX polish: reconcile banner, stale-session recovery messaging.
- Amharic copy review with a native speaker (all strings via i18n).

## Phase 2 — Social Competition Depth

- Regiments (fictional/campaign names only): create/join/leave, weekly score,
  contribution tracking, regiment leaderboard snapshot table.
- Weekly leaderboard reset via scheduled materialization (server time only).
- Friends tab enrichment from the referral graph.
- Achievements expansion evaluated server-side on battle/trivia submission.

## Phase 3 — Content & Retention

- Extend campaign to 15–20 chapters (data-only change: rows in `campaign_stages`).
- Additional battle types (wave defense, precision challenge) — the engine
  accepts any seeded schedule; add validators, not rewrites.
- Daily missions/daily trivia rotation on server time.
- Historian review pass: clear all `NEEDS HISTORIAN REVIEW` flags or annotate sources.

## Phase 4 — Later (explicitly out of scope until legal review)

- Synchronous PvP, tournaments, sponsorships, cosmetics shop, any prize system.
- Regulatory guardrail: no cash-prize/token mechanics before verified current
  NBE/Telegram payment guidance.

## Definition of Done (per feature)

1. UI works · 2. Server logic exists · 3. DB state persists · 4. Unauthorized
access prevented (RLS/RPC-only mutations) · 5. Errors handled with retry ·
6. Reload/reconnect reconciles · 7. Works for real Telegram users · 8. No dev
fixtures in production paths · 9. Mobile/Telegram WebView tested · 10. Tests or
validation exist for scoring/reward logic.

## Security Checklist Status

- [x] Telegram `initData` validated server-side (in-database HMAC)
- [x] `initDataUnsafe` never used as identity
- [x] Bot token / service-role secrets never shipped client-side
- [x] RLS enabled on all tables; sensitive mutations are RPC-only
- [x] Battle sessions expire; duplicate submissions blocked
- [x] Self-referral and double-referral blocked; rewards idempotent
- [x] `.env` untracked; production builds carry no fixtures
- [ ] Rate limiting beyond gather (per-RPC quotas) — Phase 1
- [ ] Statistical anomaly detection — later

## Key Files

| Path | Role |
|---|---|
| `supabase/migrations/202608230001_production_core.sql` | Schema + RLS + all authoritative game RPCs |
| `lib/api.ts` | Typed RPC contracts (client ↔ server boundary) |
| `lib/game-context.tsx` | Server-first state, optimistic display, reconciliation |
| `components/game/sniper-battle.tsx` | Seeded active target battle + action recording |
| `components/game/battle-view.tsx` | Formation battles resolved from the session seed |
| `lib/game-data.ts` | Static content definitions (client display mirror) |
