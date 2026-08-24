# Database Migration Guide

This guide fixes the SQL error and properly sets up your Supabase database.

---

## Current Issue: "policy already exists" Error

**Error Message:**
```
ERROR: 42710: policy "events insert own row" for table "game_events" already exists
```

**Cause:** The second migration (`202608230001_production_core.sql`) ran partially, leaving incomplete state.

**Solution:** Run the migrations in the correct order and handle idempotency.

---

## Prerequisites

✅ **Telegram bot token revoked** (see [SECURITY-FIX-REQUIRED.md](./SECURITY-FIX-REQUIRED.md))  
✅ **New bot token set in database** (step 3 in security guide)  
✅ **Environment variables are set** (you've done this in `.env.local`)

---

## Migration Approach

Since `supabase link` failed due to account permissions, use **manual SQL in the Supabase dashboard**.

### Step 1: Clean Up Existing Policies (if needed)

Go to Supabase → **SQL Editor** → new query:

```sql
-- Drop conflicting policies if they exist
-- (These are already in the migration with "drop policy if exists" statements,
-- but we'll drop them manually to be safe)

drop policy if exists "events own row" on public.game_events;
drop policy if exists "events insert own row" on public.game_events;
drop policy if exists "players own row" on public.players;
drop policy if exists "state own row" on public.player_states;

-- Verify the policies were dropped
select schemaname, tablename, policyname 
from pg_policies 
where tablename in ('game_events', 'players', 'player_states');
```

Click **Run**. You should see no policies listed.

### Step 2: Run the First Migration

Go to **SQL Editor** → new query:

**Copy the entire contents of `supabase/migrations/202608220001_live_game.sql` and paste it in the editor.**

Then click **Run**.

✅ You should see: "completed successfully" (or similar)

**If you get errors:**
- If "table already exists", that's OK — the migration has `if not exists` clauses
- If anything else, note the error and check the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Step 3: Run the Second Migration

Go to **SQL Editor** → new query:

**Copy the entire contents of `supabase/migrations/202608230001_production_core.sql` and paste it in the editor.**

Then click **Run**.

✅ You should see: "completed successfully"

**If you get the "policy already exists" error again:**

Run this cleanup and retry:

```sql
-- Drop ALL policies on these tables
drop policy if exists "campaigns readable" on public.campaign_stages;
drop policy if exists "trivia readable" on public.trivia_questions;
drop policy if exists "achievements readable" on public.achievements;
drop policy if exists "resources own row" on public.player_resources;
drop policy if exists "buildings own row" on public.player_buildings;
drop policy if exists "campaign own row" on public.player_campaign;
drop policy if exists "ledger own row" on public.resource_ledger;
drop policy if exists "trivia attempts own row" on public.trivia_attempts;
drop policy if exists "badges own row" on public.player_achievements;
drop policy if exists "events own row" on public.game_events;
drop policy if exists "events insert own row" on public.game_events;
drop policy if exists "players own row" on public.players;
drop policy if exists "state own row" on public.player_states;
```

Then paste the second migration again and click **Run**.

### Step 4: Verify All Functions Exist

Run this verification query:

```sql
select routine_name 
from information_schema.routines 
where routine_schema = 'public' and routine_name like 'game_%' 
order by routine_name;
```

You should see at least these functions:

- `game_claim_passive`
- `game_gather`
- `game_get_leaderboard`
- `game_init_state`
- `game_link_telegram`
- `game_process_referral`
- `game_start_battle`
- `game_submit_battle`
- `game_submit_trivia`
- `game_upgrade_building`

✅ **If you see 10+ functions, migrations are deployed successfully!**

---

## Step 5: Verify Bot Token is Set

Run this query:

```sql
select * from private_game.bot_settings where key = 'telegram_bot_token';
```

✅ **Should return one row with your new bot token.**

---

## Step 6: Verify Anonymous Auth is Enabled

Go to Supabase → **Authentication → Providers**

✅ **Toggle "Anonymous Sign-ins" to ON** (if not already)

---

## Step 7: Test the Setup

### Web Test

1. Open your deployment URL in a browser
2. You should see the campaign screen
3. Try tapping "Begin Battle" on the first stage
4. If it works, the database is ready ✅

### Telegram Test (if ready)

1. Make sure your bot's Web App URL is set in @BotFather
2. Search for your bot on Telegram
3. Tap the button to open the mini app
4. You should see the campaign screen
5. Try tapping "Begin Battle"
6. If it works, everything is working ✅

---

## Troubleshooting

### Still Getting "policy already exists" Error?

1. Run this to see what policies exist:
   ```sql
   select schemaname, tablename, policyname from pg_policies 
   where schemaname = 'public' order by tablename, policyname;
   ```

2. Drop any conflicting ones:
   ```sql
   drop policy if exists "policy_name" on public.table_name;
   ```

3. Retry the migration

### "Table already exists" Error?

This is harmless — the migration script includes `if not exists` clauses. Just confirm the table is there:

```sql
select table_name from information_schema.tables 
where table_schema = 'public' order by table_name;
```

You should see: `players`, `player_resources`, `player_buildings`, `battle_sessions`, `campaign_stages`, etc.

### "Function not found" Error on Web App?

The functions didn't deploy properly. Retry step 3 above, and make sure you see all 10+ functions in the verification query.

---

## Success Checklist

- [ ] Telegram bot token revoked via @BotFather
- [ ] New bot token set in `private_game.bot_settings`
- [ ] First migration (`202608220001_live_game.sql`) runs without error
- [ ] Second migration (`202608230001_production_core.sql`) runs without error
- [ ] 10+ `game_*` functions exist in database
- [ ] Bot token is set in `private_game.bot_settings`
- [ ] Anonymous auth is enabled in Supabase
- [ ] Web test: Campaign screen loads and battle works
- [ ] (Optional) Telegram test: Mini app opens and battle works

---

## Next Steps

After migrations are complete:

1. ✅ **Database setup done**
2. → Deploy your web app to Vercel (if not done)
3. → Configure Telegram bot Web App URL in @BotFather
4. → Test end-to-end on both web and Telegram
5. → Monitor for any errors via browser console

See [DEPLOYMENT-SETUP.md](./DEPLOYMENT-SETUP.md) for full deployment steps.

---

**Need help?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed error diagnosis.
