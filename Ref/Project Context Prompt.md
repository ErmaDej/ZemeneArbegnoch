Build a Telegram Mini App game called "Zemene Arbegnoch" (working title) — an idle
base-building + light tactical battle game themed around Ethiopia's 1880s–1930s
resistance history, anchored on the 1896 Battle of Adwa as shared national pride, and 
sniper-mode shooting (various popping up enemies) battles/war levels in each stage.

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
