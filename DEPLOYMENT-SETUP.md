# Deployment Setup Guide — Zemene Arbegnoch

## Quick Start: Get the Game Running

This guide walks through deploying the game for both **web users** and **Telegram users**.

---

## Prerequisites

- ✅ Supabase project created (https://supabase.com)
- ✅ Telegram Bot token from @BotFather (https://t.me/BotFather)
- ✅ Vercel account (or other hosting) for frontend deployment
- ✅ Git repository access

---

## Step 1: Supabase Database Setup

### 1a. Get Your Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings → API**
3. Copy these values and save them:
   - `NEXT_PUBLIC_SUPABASE_URL` (the "Project URL")
   - `NEXT_PUBLIC_ANON_KEY` (the "anon/public" key)

⚠️ **These will be used in Step 3 for environment variables.**

### 1b. Deploy the Database Migrations

The game's entire backend logic lives in SQL functions (RPCs). You must run the migrations once.

**Option A: Using Supabase CLI (recommended)**

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to your database
supabase db push
```

This will run both migration files:
- `supabase/migrations/202608220001_live_game.sql` — tables & baseline schema
- `supabase/migrations/202608230001_production_core.sql` — server-authoritative game logic (RPCs)

**Option B: Using the Supabase Dashboard (manual)**

1. Open your Supabase project → **SQL Editor**
2. Create a new query
3. Copy the entire contents of `supabase/migrations/202608220001_live_game.sql`
4. Paste into the editor and click **Run**
5. Repeat for `supabase/migrations/202608230001_production_core.sql`

⚠️ **The migrations are idempotent** (safe to run multiple times). If you see a message like `relation "public.players" already exists`, that's normal.

### 1c. Configure the Telegram Bot Token (Server Secret)

This token is **never sent to the client**. It lives in a private database schema.

1. Open Supabase **SQL Editor** → **New Query**
2. Paste this command (replace `YOUR_BOT_TOKEN` with your actual token from @BotFather):

```sql
insert into private_game.bot_settings (key, value)
values ('telegram_bot_token', 'YOUR_BOT_TOKEN')
on conflict (key) do update set value = excluded.value;
```

3. Click **Run**

✅ **Done.** The token is now secured server-side, and the game's `game_link_telegram` RPC can validate Telegram users.

**⚠️ IMPORTANT: If you previously committed a bot token to git history, revoke it NOW**
- Open @BotFather on Telegram
- Type `/revoke`
- Select your bot
- Generate a new token and update the database with the command above

---

## Step 2: Enable Anonymous Authentication (Required)

The game uses Supabase's anonymous auth mode for web players and guests.

1. Go to your Supabase project
2. Navigate to **Auth → Providers**
3. Find **Anonymous Sign-ins** and toggle it **ON**

✅ **Done.** Web and Telegram users can now log in anonymously.

---

## Step 3: Deploy the Frontend

### 3a. Vercel (One-Click Setup)

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. When prompted for environment variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = (from Step 1a)
   - `NEXT_PUBLIC_ANON_KEY` = (from Step 1a)
5. Click **Deploy**

### 3b. Other Hosting (Docker, self-hosted, etc.)

Set the environment variables in your `.env.local` or deployment config:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_ANON_KEY=YOUR_ANON_KEY
```

Then deploy as normal (e.g., `npm run build && npm start`).

---

## Step 4: Telegram Mini App Setup

### 4a. Create/Update Your Bot

1. Open @BotFather on Telegram
2. Type `/myapps`
3. Select your bot
4. Select **Edit Web App URL**
5. Enter your deployment URL (e.g., `https://your-game.vercel.app`)

### 4b. Test with a Fresh Telegram Account

1. Open your bot on Telegram
2. Tap the button to open the mini app
3. You should see:
   - A loading state briefly
   - The campaign screen with "The Highland Muster" available
   - A red error banner saying "Cannot reach the network" if migrations aren't deployed
   - ✅ Green "Sync" indicator if everything works

**If you see the red error banner:**
- Return to Step 1b and verify the migrations ran successfully
- Check Supabase logs for any errors

---

## Step 5: Verify Everything Works

### Test Checklist

- [ ] **Web User:** Navigate to your deployment URL directly (no Telegram)
  - Should see the campaign screen
  - Can tap "Begin Battle" to start a session
  - Battle resolves and shows results

- [ ] **Telegram User:** Open the mini app
  - Same flow as web user
  - After linking Telegram (in-app), your profile shows "Telegram Linked"

- [ ] **Persistence:** Reload the page
  - Your camp resources, buildings, and completed stages persist
  - Your score and achievements remain

- [ ] **Real Leaderboard:**
  - Complete some stages (or tap "Begin Battle" in the camp)
  - View the leaderboard screen
  - Your name appears in the rankings

---

## Troubleshooting

### "Cannot reach the network. Please retry."

**Cause:** Supabase RPC functions don't exist (migrations not deployed).

**Fix:**
1. Return to Supabase SQL Editor
2. Run `select * from information_schema.routines where routine_name like 'game_%' limit 5;`
3. If you see no results, the migrations didn't run. Re-run Step 1b.

### 404 on `/rest/v1/rpc/game_init_state`

**Cause:** Same as above — migrations not deployed.

**Fix:** Follow the troubleshooting step above.

### "Anonymous Sign-ins" toggle is grayed out

**Cause:** You don't have permissions in this Supabase project.

**Fix:** Ask your Supabase project owner to enable it.

### Telegram Mini App doesn't open

**Cause:** Bot's Web App URL is incorrect or not deployed yet.

**Fix:**
1. Check @BotFather → your bot → Web App URL
2. Test the URL in a browser to confirm it loads
3. Retry in Telegram

### Telegram link fails with "invalid_signature"

**Cause:** The Telegram bot token in the database doesn't match the bot.

**Fix:**
1. Verify the token in the database: `select * from private_game.bot_settings where key = 'telegram_bot_token';`
2. If it's different from your @BotFather token, update it (Step 1c)

---

## Production Checklist

Before launching to real players:

- [ ] Supabase migrations deployed and verified
- [ ] Telegram bot token securely stored in `private_game.bot_settings`
- [ ] Anonymous auth enabled in Supabase
- [ ] Environment variables set on Vercel/hosting
- [ ] Telegram mini app URL configured in @BotFather
- [ ] Tested with fresh Telegram account (camp → battle → victory → leaderboard)
- [ ] Amharic translations reviewed
- [ ] Historical accuracy reviewed (see "NEEDS HISTORIAN REVIEW" flags in SQL)
- [ ] Rate limiting and anti-cheat monitoring in place
- [ ] Support plan for player onboarding

---

## Next Steps

- **Retention:** Tune battle difficulty and rewards per `DEVELOPMENT-PLAN.md` Phase 1
- **Social:** Implement regiments and weekly leaderboards (Phase 2)
- **Content:** Add more stages and trivia questions (Phase 3)

---

For questions or issues, open an issue on GitHub or contact the team.
