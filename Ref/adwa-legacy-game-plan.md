# Game Plan: "Zemene Arbegnoch" (ዘመነ አርበኞች — "Age of the Patriots")
### A Telegram-native strategy/action game rooted in Ethiopia's resistance history

*Working title — swap freely. "Arbegna" (patriot/resistance fighter) is a real and widely
understood term in Ethiopian culture, so it reads as authentic rather than generic.*

---

## 1. Why this concept, and why now

- Telegram Mini Apps are still the easiest way to reach young, price-sensitive,
  Android-first users with zero install friction — exactly the profile of Addis
  Ababa's youth-heavy population.
- The tap-to-earn/TON-token wave that powered Hamster Kombat and Notcoin has cooled:
  gaming Mini Apps have been *declining* in monthly users industry-wide while
  utility-and-substance apps are growing fast. Copying that formula late is a weak bet.
- **Legal hard stop:** On July 23, 2026 the National Bank of Ethiopia expanded its
  virtual-asset ban to cover any tradeable/exchangeable digital representation of
  value — this rules out TON reward tokens, in-game tradeable coins, or anything that
  functions like a birr-pegged crypto asset for Ethiopian users. Real cash rewards
  must move through a licensed fiat rail. **Verify this is still current with a lawyer
  before launch** — Ethiopian fintech regulation has moved fast and could move again.
- Chapa is an NBE-licensed Ethiopian payment gateway with clean API access to
  Telebirr, CBE Birr, and cards — this is the compliant path for both taking payments
  *and* paying out prizes.
- A historically-grounded patriotic theme (Ethiopia's resistance era, most famously
  the 1896 Battle of Adwa — the anti-colonial victory that's a broadly unifying
  source of national pride rather than a contested one) gives the "action" and
  identity hook without needing invented lore.

---

## 2. Content and sensitivity guardrails (read before writing a single line of copy)

1. **Anchor on Adwa and the anti-colonial resistance era (1880s–1930s), not
   contemporary or ethnic-line conflicts.** Adwa functions as shared national pride
   across Ethiopia's regions; the game should stay there rather than drifting into
   more contested internal history.
2. **Group players by fictional "regiments" or historical campaigns, not by real
   ethnic or regional identity.** This keeps the competitive/clan layer fun without
   turning it into a proxy for real social divisions.
3. **Stylized, not graphic, combat.** Think chess/tower-defense-style tactical combat
   with clean iconography — flags, formations, cannons-as-icons — not
   blood/gore/realistic injury. This keeps it all-ages and App-store-safe if you ever
   wrap it natively.
4. **Real historical figures (Menelik II, Empress Taytu, etc.) can appear as
   respectful, factual characters** the way any historical strategy game treats real
   historical leaders — but have a historian or well-read cultural reviewer sanity-check
   the script before wide release. Misrepresenting details in a patriotic context is
   the fastest way to trigger backlash rather than pride.
5. **Keep it apolitical about *current* Ethiopian politics.** Nothing about sitting
   officials, current parties, or ongoing conflicts.

---

## 3. Core game design

**Genre:** Idle base-building + light tactical auto-battler + social/competitive layer,
wrapped in a Telegram Mini App. Low-bandwidth, works on a mid/low-spec Android phone.

**The loop:**
1. **Build** — players grow a resistance camp (recruit fighters, forge simple
   weapons, gather provisions) — an idle/incremental layer that works even on patchy
   data, since most progress happens passively between sessions.
2. **Train & deploy** — spend resources to build a small "regiment" with
   stats/formations.
3. **Campaign battles** — short, auto-resolved or lightly-tactical battles against
   historically-inspired scenarios (terrain of Adwa, supply-line raids, etc.), 15–30
   seconds each, snackable for short Telegram sessions.
4. **History trivia interludes** — between campaign chapters, quick multiple-choice
   trivia on real Ethiopian resistance history unlocks bonus resources. This is the
   "utility" layer that keeps it from being a pure clicker, and it's genuinely shareable
   ("I scored X on Adwa history trivia — beat me").
5. **Clans/Regiments** — players group into small teams for weekly leaderboard
   competitions; regiments are named after campaigns or virtues (Ye-Wetat Regiment,
   etc.), not ethnic groups.
6. **Referral virality** — Telegram deep-link invites give both inviter and invitee a
   starter boost. This is the primary organic growth engine and costs nothing.

**Economically rewarding, compliantly:**
- **Free tier:** points, badges, cosmetic flags/banners — no real value, no legal
  exposure, this is most of the game for most players.
- **Sponsored tournaments:** local brands (telecoms, banks, FMCG, ride-hailing apps)
  fund a weekly/monthly prize pool distributed as **airtime, data bundles, or
  merchant vouchers** — no cash handling required, easiest to launch, good brand-fit
  for youth-focused sponsors.
- **Cash prize ladder (later phase):** entry-fee-free, skill-based leaderboard;
  cash prizes paid out via Chapa/Telebirr to verified accounts. **Check with a
  local lawyer whether a skill-based cash-prize contest needs registration with
  Ethiopia's gambling/lottery regulator before launch** — the skill-vs-chance
  distinction matters a lot here and rules can be strict.
- **Cosmetic monetization (developer revenue):** Telegram Stars for skins, banners,
  and cosmetic regiment flags — Telegram's own native in-app currency, purchased with
  real money but not a tradeable asset the player can cash out, which sits in a much
  safer compliance zone than a custom token. Still worth a quick legal sanity check
  given how broad the July 2026 notice reads.
- **Developer revenue overall:** rewarded video ads (extra energy/lives), sponsorship
  deals, Stars revenue share, and — once validated — a small rake on cash-prize
  tournament entry (subject to the gambling-law check above).

---

## 4. Tech stack — free-first, fast-to-ship

| Layer | Tool | Why |
|---|---|---|
| Game client | HTML5 + JS, rendered via **Phaser.js** (free, open-source) or plain Canvas/DOM for the idle screens | Runs inside Telegram's WebView, lightweight, huge free asset ecosystem |
| Telegram integration | **Telegram Bot API** (via BotFather) + **Telegram WebApp / Mini App JS SDK** (`@twa-dev/sdk` or `@telegram-apps/sdk`) | Official, free, well-documented |
| Backend | **Supabase** free tier (Postgres + Auth + Row-Level Security) or Firebase free tier | Free tier covers MVP scale, handles leaderboards/user state without your own server |
| Hosting | **Vercel** or **Netlify** free tier (frontend), Supabase Edge Functions or a small free-tier Render/Fly.io instance for backend logic | Zero-cost to launch |
| Payments | **Chapa API** (Telebirr, CBE Birr, cards) — for cosmetic purchases and later cash-prize payouts | NBE-licensed, developer-friendly, Ethiopia-specific |
| In-app currency | **Telegram Stars** via Telegram's native payments API | No separate payment integration needed for cosmetic Stars purchases |
| Localization | **Noto Sans Ethiopic** (free Google Font) for Amharic UI; store copy in a simple `en.json` / `am.json` i18n pair | Amharic-first UI materially widens reach beyond English-only youth |
| Art assets | **Kenney.nl** (free game asset packs), itch.io free sprite packs, custom flag/banner icons (simple, cheap to commission locally later) | Zero-cost to start, upgrade later |
| Vibe-coding / build acceleration | Claude Code, Cursor, or bolt.new/v0 for scaffolding the Mini App shell, Phaser scenes, and Supabase schema from a prompt (see Section 6) | Speeds up the boilerplate dramatically |
| Version control / CI | GitHub (free) + GitHub Actions free tier for basic build checks | Standard, free |

---

## 5. Phased roadmap

### Phase 0 — Validate before you build (3–5 days)
- Post concept art + a 1-paragraph pitch in a few Ethiopian youth Telegram
  channels/groups; gauge reaction, collect Amharic name suggestions.
- Confirm with a local lawyer/accountant: (a) current NBE virtual-asset stance,
  (b) whether a skill-based cash-prize contest triggers gambling regulation,
  (c) Chapa merchant onboarding requirements/timeline.
- **Exit criteria:** genuine interest signal + a clear legal path for at least the
  in-kind reward model (airtime/vouchers) even if cash prizes need more runway.

### Phase 1 — Appealing, feature-rich MVP (2–4 weeks)
Goal: something people actually want to open every day, before any money is involved.
- Telegram bot + Mini App shell (BotFather setup, WebApp SDK wired in)
- Idle camp-building loop with 3–4 resource types
- 8–10 auto-resolved campaign battles (Adwa-inspired chapters) with simple stylized
  animation
- History trivia interludes (20–30 question bank to start)
- Amharic/English toggle
- Leaderboard (global + friends, via Supabase)
- Telegram deep-link referral system with starter-boost reward
- Cosmetic-only rewards (badges, flags) — **no real-money features yet**
- Basic analytics (Supabase or free-tier Mixpanel/PostHog) to see what's actually engaging

**Success metric to move on:** Day-7 retention and organic invite rate — if people
aren't inviting friends organically off free content, adding money won't fix that.

### Phase 2 — Deeper gameplay + sponsor-funded rewards (4–6 weeks after Phase 1 ships)
- Lightweight tactical layer: player-chosen formations before each battle, not just
  auto-resolve
- Regiment/clan system with weekly competitions
- Telegram Stars cosmetic shop (skins, banners, camp decorations)
- First sponsored tournament: partner with one local brand (telecom, bank, ride-hailing
  app) to fund an airtime/data/voucher prize pool for a leaderboard event
- Rewarded video ads for extra energy/boosts
- Expand campaign content to 20–30 chapters with historian-reviewed copy

### Phase 3 — Robust, revenue-mature version (2–3 months after Phase 2)
- Cash-prize skill ladder via Chapa payouts (only once the Phase 0 legal check is
  cleared for this specific mechanic)
- Live PvP seasonal ladder
- Multiple concurrent brand sponsorships, formalized revenue share
- Amharic voiceover for key campaign moments
- Deeper anti-cheat / fraud checks on the payout path (this becomes essential the
  moment real money is involved)
- Consider a native wrapper only if you outgrow Telegram's reach — usually you won't
  need to, since Telegram Mini Apps already run everywhere Telegram runs

---

## 6. Launch prompt — paste this into Claude Code / Cursor / bolt.new / v0 to scaffold Phase 1

```
Build a Telegram Mini App game called "Zemene Arbegnoch" (working title) — an idle
base-building + light tactical battle game themed around Ethiopia's 1880s–1930s
resistance history, anchored on the 1896 Battle of Adwa as shared national pride.

TECH STACK
- Frontend: HTML5 + JavaScript using Phaser.js for the battle/camp scenes, plain
  DOM/CSS for menus and trivia screens
- Telegram integration: Telegram WebApp JS SDK (@telegram-apps/sdk or @twa-dev/sdk),
  authenticate users via Telegram initData validation
- Backend: Supabase (Postgres + Auth + Row Level Security) — free tier
- Hosting: static frontend on Vercel or Netlify; backend logic as Supabase Edge
  Functions where needed
- i18n: JSON-based translation files for Amharic (am.json) and English (en.json),
  using Noto Sans Ethiopic web font for Amharic text rendering
- No payment integration in this phase — cosmetic/point rewards only

CORE FEATURES TO SCAFFOLD
1. Telegram bot setup instructions (via BotFather) and Mini App registration
2. Landing/camp screen: idle resource system with 3 resources (Fighters, Provisions,
   Morale), each accruing over time and via manual "gather" taps, with a simple
   upgrade tree (e.g. "Recruit Post," "Grain Store," "Council Tent")
3. Campaign map screen: a linear sequence of 8-10 chapters, each a short
   auto-resolved battle (visual: two stylized formation icons clashing, resolved by
   a simple stat comparison + light randomness, 10-20 seconds), unlocking
   sequentially
4. Trivia interlude: after every 2 campaign chapters, a multiple-choice history
   question (store question bank in a Supabase table: question_am, question_en,
   options, correct_index, source_note) that grants bonus resources on a correct
   answer
5. Leaderboard screen: global top 50 + "friends" (players who joined via your
   referral link), pulling from a Supabase `players` table (telegram_id, display_name,
   score, resources, created_at)
6. Referral system: generate a per-user Telegram deep link
   (https://t.me/<botusername>/<appname>?startapp=ref_<user_id>); when a new user
   opens via that link, credit both the inviter and invitee a one-time resource boost
7. Language toggle (Amharic default, English fallback) persisted per user
8. Cosmetic badge system: unlockable flag/banner icons tied to campaign milestones,
   displayed on the player's profile — no monetary value, purely collectible

DATA MODEL (Supabase)
- players: id, telegram_id (unique), display_name, language_pref, resources (jsonb),
  score, referred_by, created_at
- campaign_progress: player_id, chapter_id, completed_at, result
- trivia_bank: id, question_am, question_en, options_am (jsonb), options_en (jsonb),
  correct_index, source_note
- referrals: inviter_id, invitee_id, created_at

DESIGN/CONTENT CONSTRAINTS (important, do not deviate)
- Keep combat stylized and abstract (icons/formations clashing) — no gore, no
  realistic violence, all-ages presentation
- Historical figures may be referenced factually and respectfully but do not
  invent quotes or events attributed to real people — flag any historical claim in
  a code comment as "NEEDS HISTORIAN REVIEW" so content can be fact-checked before
  launch
- Group competitive "regiments" by fictional/campaign names, never by real
  ethnic or regional identity
- No monetary, points-for-cash, or tradeable-token features in this build — this
  phase is engagement-only by design, monetization comes in a later phase

DELIVERABLES
- Working Telegram Mini App runnable locally and deployable to Vercel/Netlify
- Supabase schema + seed data (10 trivia questions, 8 campaign chapters) to start
- Basic README covering: BotFather setup steps, environment variables needed,
  Supabase project setup, and how to test inside Telegram's dev environment
```

---

## 7. Honest risk notes

- **Regulatory volatility:** Ethiopia's forex and virtual-asset rules have moved
  fast in 2026 and could move again — re-verify the compliance picture right before
  each phase that touches real money, not just once at the start.
- **Thin funding/ecosystem:** Ethiopia's startup funding pool is real but small and
  early-stage relative to Nairobi or Lagos — plan Phase 1/2 to be self-funded or
  sponsor-funded rather than counting on investor capital to reach the cash-prize phase.
- **Connectivity:** design every screen to degrade gracefully on patchy 3G/4G and to
  tolerate occasional outages (cache state locally, sync when back online).
