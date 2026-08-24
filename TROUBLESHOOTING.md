# Troubleshooting Guide — Zemene Arbegnoch

This guide helps diagnose and fix common issues for both Telegram users and web users.

---

## Error: "Cannot reach the network. Please retry."

This is the most common error. It means the app can't connect to Supabase to load your game state.

### Root Causes

1. **Migrations not deployed** (most common)
   - Supabase database doesn't have the game functions yet
   - Fix: Follow [DEPLOYMENT-SETUP.md — Step 1b](#stepdeploymigrationsinthead)

2. **Network connection is down**
   - Your device has no internet
   - Fix: Check WiFi/mobile connection; refresh the page

3. **Environment variables not set**
   - The app doesn't know where the Supabase project is
   - Fix: Follow [DEPLOYMENT-SETUP.md — Step 3](#step3-deploy-the-frontend)

4. **Supabase project is down**
   - Rare but possible
   - Fix: Check https://status.supabase.com

---

## Error: "Failed to load resource: the server responded with a status of 404"

This appears in the browser's Developer Console and means the RPC function doesn't exist on the server.

### How to Fix

1. **Verify migrations are deployed:**
   - Open your Supabase SQL Editor
   - Run this query:
     ```sql
     select * from information_schema.routines
     where routine_name like 'game_%' limit 5;
     ```
   - **If you see 5+ functions** (like `game_init_state`, `game_start_battle`), migrations are deployed ✅
   - **If you see 0 functions**, re-run the migrations:
     - Copy `supabase/migrations/202608220001_live_game.sql` into SQL Editor and click **Run**
     - Copy `supabase/migrations/202608230001_production_core.sql` into SQL Editor and click **Run**

2. **Check Supabase URL and Key:**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_ANON_KEY` are set in your deployment
   - For Vercel: Go to **Settings → Environment Variables**
   - For other hosting: Check your `.env.local` or platform's config

3. **Verify Anonymous Auth is enabled:**
   - Go to Supabase **Auth → Providers**
   - Check that **Anonymous Sign-ins** is **ON**

---

## Error: "RPC function 'X' not found"

A specific function is missing from the database.

### How to Debug

1. **In Browser Console, run:**
   ```javascript
   // Check which function is missing (look for the error message)
   // Example: "RPC function 'game_start_battle' not found"
   ```

2. **Then in Supabase SQL Editor, check if it exists:**
   ```sql
   select * from information_schema.routines
   where routine_name = 'game_start_battle';
   ```

3. **If empty, re-run the migration that creates it:**
   - `202608230001_production_core.sql` contains most functions
   - Copy the entire file and paste into SQL Editor and click **Run**

---

## Error: "Cannot link Telegram account"

The app tried to link your Telegram identity but failed.

### Root Causes

1. **Telegram Bot token not set in database**
   - Fix: Follow [DEPLOYMENT-SETUP.md — Step 1c](#1c-configure-the-telegram-bot-token-server-secret)

2. **Wrong bot token**
   - The token in the database doesn't match your actual bot
   - Fix:
     - Get your current bot token from @BotFather
     - Update the database:
       ```sql
       update private_game.bot_settings
       set value = 'YOUR_NEW_BOT_TOKEN'
       where key = 'telegram_bot_token';
       ```

3. **Telegram mini app URL is wrong**
   - Your bot isn't pointing to the correct URL
   - Fix:
     - Go to @BotFather → your bot → **Edit Web App URL**
     - Make sure it matches your deployment URL (e.g., `https://your-game.vercel.app`)

---

## Error: "Locked" (can't start a battle)

The stage is locked because you haven't completed the previous stage.

### How to Unlock

1. **Stages unlock sequentially:**
   - Start with "The Highland Muster" (Chapter 1)
   - Complete it to unlock "The Mountain Pass" (Chapter 2)
   - And so on...

2. **If you already beat it and it's still locked:**
   - Refresh the page (the app may need to sync with server)
   - Check the browser console for errors
   - If the problem persists, contact support

---

## Error: "Telegram LinkBox Failed"

The Telegram mini app couldn't open or the bot configuration is wrong.

### How to Fix

1. **Verify the bot's Web App URL:**
   - Open @BotFather on Telegram
   - Type `/myapps` → select your bot → **Edit Web App URL**
   - Make sure the URL exactly matches your deployment (e.g., `https://example.com` not `https://example.com/`)

2. **Test the URL in a browser:**
   - Copy the Web App URL
   - Open it in a regular browser tab
   - You should see the game load (or at least the app shell)
   - If you get a 404, the deployment isn't running

3. **Redeploy if needed:**
   - Make sure your code is pushed to GitHub/Vercel
   - Wait for the deployment to finish (check Vercel dashboard)
   - Retry opening the bot on Telegram

---

## Telegram User: How to Test

If you're testing the Telegram mini app:

1. **Create a test bot:**
   - Open @BotFather
   - `/newbot` → name it something like "MyGameTest"
   - Save the token

2. **Link to your testing URL:**
   - `/myapps` → select the test bot → **Edit Web App URL**
   - Point it to your staging/test deployment

3. **Open the bot on Telegram:**
   - Search for `@YourTestBotUsername` in Telegram
   - Tap the button to open the mini app
   - You should see the game

4. **If it doesn't load:**
   - Check the **Telegram Mobile App Console** (swipe up on the mini app)
   - Look for red error messages
   - Screenshot and share with the team

---

## Web User: How to Test

If you're testing on the web:

1. **Open the deployment URL directly:**
   - `https://your-game.vercel.app` (or your hosting URL)
   - You should see the campaign screen immediately

2. **Check the browser console for errors:**
   - Press `F12` → **Console** tab
   - Look for red errors with `404`, `network`, or `RPC`
   - Screenshot the full error and share with the team

3. **Verify Supabase connection:**
   - In the console, run:
     ```javascript
     fetch('https://YOUR_SUPABASE_URL/rest/v1/', {
       headers: { 'apikey': 'YOUR_ANON_KEY' }
     }).then(r => console.log(r.status))
     ```
   - You should see `200` in the console
   - If you see `401` or `403`, your key is wrong

---

## Slow Performance / Freezing

The app feels laggy or battles run slowly.

### Fixes

1. **Close other browser tabs** — the game shares CPU/memory
2. **Clear browser cache:**
   - Chrome: **Settings → Privacy and security → Clear browsing data**
   - Set to "All time" and check "Cached images and files"
3. **Try a different browser** — e.g., Firefox, Safari, Edge
4. **Check your internet speed:**
   - Use https://speedtest.net
   - If less than 5Mbps, gaming will feel slow
5. **Disable browser extensions** — they can slow down the app

---

## Data Loss / Progress Not Saving

Your resources or completed stages are gone.

### Prevention

- **The game auto-saves every action** via Supabase
- If you close the browser, your progress is persisted
- If you refresh, it reloads from the server

### If Data Is Lost

1. **Check the browser console:**
   - Press `F12` → **Console**
   - Look for error messages from the hydration phase
   - Share these with the team

2. **Try a hard refresh:**
   - On Windows: `Ctrl + Shift + R`
   - On Mac: `Cmd + Shift + R`
   - This clears the cache and reloads your actual server data

3. **If still lost, contact support:**
   - Note the exact time the data disappeared
   - Check if the Supabase project was down at that time
   - The team can restore from backups if possible

---

## Common "Why" Questions

### Why does the game ask to "validate on server"?

This is **intentional and necessary**. The server must verify your battle results to prevent cheating. A player could otherwise modify their score in the browser (JavaScript is client-side and editable). Your battle is submitted to the server, validated, and the result comes back — all in ~2-5 seconds.

### Why can't I play offline?

Some app data (resources, progress) is stored locally for speed, but battles and resource claims must go to the server to prevent duplication and cheating. True offline play would require complex conflict resolution. For now, the game requires an internet connection for battles.

### Why do my resources sometimes look off?

The app displays **local, optimistic updates** between server syncs. When you tap "Gather," you see the resources increase immediately (great UX), but the server validates the claim and reconciles the actual amount ~1-2 seconds later. If you have more than you see, you're waiting for a sync. If you have less, you hit a rate limit. Refresh the page to force an immediate sync.

### Why was I "rate limited"?

The server blocks too many rapid actions to prevent exploitation:
- **Gathering:** max 30 taps per 60 seconds
- **Battles:** max 1 per 30 seconds

These are generous limits for legitimate play but block bots/automation. If you hit a limit, wait a minute and retry.

---

## Still Stuck?

If none of the above fixes the problem:

1. **Screenshot or describe:**
   - The exact error message
   - The URL you're accessing
   - What you were doing when it happened

2. **Open the browser console** (`F12` → **Console**) and copy any red error messages

3. **Check [DEPLOYMENT-SETUP.md](./DEPLOYMENT-SETUP.md)** for setup instructions

4. **Contact the team** with all the details above

---

## For Developers: Debug Mode

To enable more verbose logging (development only):

1. **Add this to `lib/api.ts`:**
   ```typescript
   const DEBUG = true; // Set to false in production
   ```

2. **Then use in error handling:**
   ```typescript
   if (DEBUG) console.error("Full error:", err, { fn, args })
   ```

3. **Check the browser console for details**

---

That's it! Most issues are solved by re-running the migrations. If you're stuck, the deployment guide and error details above should point you in the right direction.
