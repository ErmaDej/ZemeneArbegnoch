# URGENT: Security Fix Required

⚠️ **Your Telegram bot token is exposed in git history and must be revoked immediately.**

## What Happened

Your bot token was committed to `.env` and is visible in this repository's git history:
```
8995613908:AAEqy5PP6Xs07iwHWpfa4V0Z1hdK4qnKOxk
```

Anyone with access to this repo (or git history) can use this token to impersonate your bot.

---

## Immediate Actions Required

### Step 1: Revoke the Bot Token

1. Open Telegram and search for **@BotFather**
2. Send: `/revoke`
3. Select your bot
4. Confirm the revoke

This **permanently disables** the old token. Anyone who has it can no longer use it.

⏱️ **Do this NOW before going any further.**

### Step 2: Generate a New Token

1. In @BotFather, send: `/start`
2. Send: `/myapps`
3. Select your bot
4. Copy the **new** token

### Step 3: Update the Database

Go to Supabase → **SQL Editor** → new query:

```sql
insert into private_game.bot_settings (key, value)
values ('telegram_bot_token', 'YOUR_NEW_TOKEN_FROM_BOTFATHER')
on conflict (key) do update set value = excluded.value;
```

Replace `YOUR_NEW_TOKEN_FROM_BOTFATHER` with your actual new token (starts with `8995613908:AAE...` or similar).

Click **Run**.

✅ **Database is now updated with the new, safe token.**

### Step 4: Remove Token from Git History

The old token is in `.env` in git history. Remove it:

```bash
# Option A: Remove .env from git history (recommended for production)
git rm --cached .env
git rm --cached .env.local
git commit -m "Remove .env files with secrets from git history"
git push

# Option B: Full git cleanup (if this is a test repo only)
# See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
```

⏱️ **Do this before anyone else (or an automated tool) discovers the old token.**

### Step 5: Verify .gitignore

Confirm `.env` files are now ignored:

```bash
git status
# Should NOT show .env or .env.local
```

---

## Why This Happened

- `.env.local` was correctly ignored
- But `.env` was committed before gitignore rules were in place
- The new `.gitignore` now prevents this from happening again

---

## For Future Development

✅ **NEVER commit .env files** — they're now in `.gitignore`  
✅ **Keep secrets in `.env.local`** (local dev only) or environment variables (production)  
✅ **For Telegram bot token**: Store it ONLY in Supabase `private_game.bot_settings`, never in the client

---

## Next: Database Migration

After completing the security steps above, proceed to [MIGRATE-DATABASE.md](./MIGRATE-DATABASE.md) to finish setting up your database.

---

**Status:** 🔴 BLOCKED until bot token is revoked  
**Action Required:** Revoke token via @BotFather now
