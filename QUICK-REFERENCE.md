# Quick Reference — Deployment Commands

## TL;DR: Get the Game Running in 5 Minutes

### 1. Deploy Migrations to Supabase

```bash
# Option A: Using CLI (recommended)
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Option B: Manual via SQL Editor
# Copy & paste both files into Supabase SQL Editor and click Run:
# - supabase/migrations/202608220001_live_game.sql
# - supabase/migrations/202608230001_production_core.sql
```

### 2. Set Bot Token in Database

```sql
insert into private_game.bot_settings (key, value)
values ('telegram_bot_token', 'YOUR_BOT_TOKEN_FROM_@BOTFATHER')
on conflict (key) do update set value = excluded.value;
```

### 3. Set Environment Variables

For **Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_ANON_KEY=YOUR_ANON_KEY
```

For **local dev:**
```bash
# Create .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co" >> .env.local
echo "NEXT_PUBLIC_ANON_KEY=YOUR_ANON_KEY" >> .env.local
npm run dev
```

### 4. Configure Telegram Bot

```
@BotFather → /myapps → Select your bot → Edit Web App URL
Set URL to: https://your-deployment.com (e.g., your Vercel URL)
```

### 5. Test

**Web:** Open your deployment URL in a browser  
**Telegram:** Open your bot on Telegram and tap the mini app button

---

## Verify Deployment

### Check Migrations Deployed

```sql
select routine_name 
from information_schema.routines 
where routine_name like 'game_%' 
limit 5;
```

**Should return 5+ functions.** If empty, re-run migrations.

### Check Bot Token Set

```sql
select * from private_game.bot_settings where key = 'telegram_bot_token';
```

**Should show your bot token.** If empty or wrong, update it.

### Check Anonymous Auth Enabled

Go to Supabase → **Auth → Providers** → toggle **Anonymous Sign-ins** to **ON**

---

## Common Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| 404 on `/rpc/game_init_state` | Migrations not deployed | Re-run migrations (use supabase CLI) |
| "Telegram link failed" | Bot token wrong or not set | Update `private_game.bot_settings` with correct token |
| "Cannot reach network" | Env vars not set or migrations not deployed | Check env vars; re-run migrations |
| Web app doesn't open | Bot URL is wrong | Update bot's Web App URL in @BotFather |
| Anonymous auth fails | Anonymous auth disabled | Enable in Supabase Auth settings |

---

## Environment Variables Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set to your Supabase project URL
- [ ] `NEXT_PUBLIC_ANON_KEY` set to your anon key (not the service role!)
- [ ] Migrations deployed (`supabase db push` or manual SQL)
- [ ] Bot token set in `private_game.bot_settings`
- [ ] Anonymous auth enabled in Supabase
- [ ] Bot's Web App URL configured in @BotFather
- [ ] Frontend deployed (Vercel or other)

---

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables
echo "NEXT_PUBLIC_SUPABASE_URL=..." >> .env.local
echo "NEXT_PUBLIC_ANON_KEY=..." >> .env.local

# Run dev server
npm run dev

# Open http://localhost:3000

# Test with Telegram (if configured)
# Or test on web directly at localhost:3000
```

---

## Production Checklist

- [ ] Migrations deployed and tested
- [ ] Bot token securely stored (not in git history)
- [ ] Anonymous auth enabled
- [ ] Environment variables set on hosting platform
- [ ] Custom domain configured (if applicable)
- [ ] Telegram bot Web App URL points to production domain
- [ ] HTTPS enabled (required for Telegram mini apps)
- [ ] Tested with fresh Telegram account
- [ ] Tested on web at deployment URL
- [ ] Battle → Victory → Leaderboard flow works end-to-end

---

## Useful SQL Queries

### Clear All Test Data (Dev Only)

```sql
-- WARNING: This deletes all game data. Dev only!
truncate table public.battle_sessions cascade;
truncate table public.player_campaign cascade;
truncate table public.player_resources cascade;
truncate table public.player_buildings cascade;
truncate table public.players cascade;
```

### Check Active Players

```sql
select id, display_name, telegram_id, created_at, last_active_at 
from public.players 
order by last_active_at desc 
limit 20;
```

### View Leaderboard

```sql
select display_name, total_score, lifetime_battles, lifetime_wins 
from public.players 
where total_score > 0 
order by total_score desc 
limit 50;
```

### Check Battle History

```sql
select bs.id, p.display_name, cs.title_en, bs.result, bs.authoritative_score, bs.created_at
from public.battle_sessions bs
join public.players p on p.id = bs.player_id
join public.campaign_stages cs on cs.id = bs.stage_id
order by bs.created_at desc
limit 20;
```

---

## Supabase CLI Cheat Sheet

```bash
# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push local migrations to remote
supabase db push

# Pull remote migrations to local
supabase db pull

# View remote database (local tunnel)
supabase start  # Starts local Postgres mirror

# Stop local tunnel
supabase stop
```

---

## Debugging

### Enable verbose API logging (temporary)

Add to `lib/api.ts`:
```typescript
async function withRetry<T>(fn: () => Promise<T>, ...) {
  // ... existing code ...
  } catch (err) {
    console.log("[API Retry]", { attempt, error: err, fn: fn.toString() })
    // ... rest of code
  }
}
```

### Test RPC from browser console

```javascript
// In browser console, run:
const { data, error } = await supabase.rpc('game_init_state')
console.log(data || error)
```

### Check network tab

1. Open DevTools → Network tab
2. Play the game or reload
3. Look for requests to `supabase.co/rest/v1/rpc/*`
4. Click one and check the response status and body
5. 404 means RPC doesn't exist; 200 means it succeeded

---

For the full setup, see [DEPLOYMENT-SETUP.md](./DEPLOYMENT-SETUP.md)  
For troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
