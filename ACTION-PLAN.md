# ⚠️ ACTION PLAN: Fix Network Errors and Deploy Database

**Your game is showing "Cannot reach the network" errors because database migrations are not deployed yet.**

This plan fixes it in 3 phases with clear next steps.

---

## 🔴 PHASE 1: SECURITY (Do This First — 5 minutes)

Your Telegram bot token is exposed in git and must be revoked **immediately**.

### Actions

1. **Follow [SECURITY-FIX-REQUIRED.md](./SECURITY-FIX-REQUIRED.md)** completely:
   - Revoke bot token via @BotFather (`/revoke`)
   - Generate new token from @BotFather
   - Update database with new token (SQL command provided)
   - Clean git history

2. **Verify:**
   ```bash
   git status
   # Should show nothing for .env, .env.local, .gitignore
   ```

**Do not proceed to phase 2 until this is complete.**

---

## 🟡 PHASE 2: DEPLOY DATABASE (20 minutes)

Database migrations are partially deployed and causing the "404" errors users see.

### Actions

1. **Follow [MIGRATE-DATABASE.md](./MIGRATE-DATABASE.md)** step by step:
   - Manually run migration SQL in Supabase SQL Editor (CLI failed due to permissions)
   - Verify all 10+ functions exist
   - Check bot token is set

2. **Verify:**
   - Run verification query in Supabase:
     ```sql
     select routine_name from information_schema.routines 
     where routine_name like 'game_%' limit 5;
     ```
   - Should return 5+ function names
   - If empty, migrations didn't deploy — troubleshoot with [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

3. **Enable Anonymous Auth:**
   - Supabase → Authentication → Providers → Toggle "Anonymous Sign-ins" ON

**Phase 2 is complete when you see 10+ functions in the verification query.**

---

## 🟢 PHASE 3: TEST & DEPLOY (10 minutes)

Now test the game works and deploy to production.

### Web Test (Quick Validation)

1. Open your Next.js dev server locally or deployed URL
2. You should see the **Campaign Screen**
3. Tap "Begin Battle" on the first stage
4. You should see the battle interface (sniper game)
5. Complete the battle
6. You should see victory/defeat results

✅ **If this works, the database is properly deployed.**

### Telegram Mini App Test (If Ready)

1. Make sure your bot's Web App URL is configured:
   - In @BotFather, select your bot → Edit Web App URL
   - Set it to your Vercel deployment URL

2. Search for your bot on Telegram
3. Tap the button to open mini app
4. Same test as web version above
5. Try the "Link Telegram" feature to ensure Telegram data persists

### Deploy to Vercel (If Not Done)

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Fix: Remove bot token, update .gitignore, add deployment guides"
   git push
   ```

2. Vercel should auto-deploy on push
3. Set environment variables in Vercel dashboard → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xoqwslvxeaqoztsajneb.supabase.co
   NEXT_PUBLIC_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   (These are already in `.env` so they're public; no secret needed)

4. Test the Vercel URL works

---

## 📋 Quick Checklist

### Phase 1: Security
- [ ] Bot token revoked via @BotFather
- [ ] New token set in Supabase `private_game.bot_settings`
- [ ] `.env` and `.env.local` files cleaned
- [ ] `.gitignore` updated to ignore `.env` files

### Phase 2: Database
- [ ] First migration deployed (`202608220001_live_game.sql`)
- [ ] Second migration deployed (`202608230001_production_core.sql`)
- [ ] 10+ `game_*` functions exist (verification query passed)
- [ ] Bot token is set in database
- [ ] Anonymous Auth enabled in Supabase

### Phase 3: Testing
- [ ] Web test: Campaign screen loads and battle works
- [ ] (Optional) Telegram test: Mini app works
- [ ] (Optional) Deployed to Vercel
- [ ] Environment variables set on Vercel

---

## 🆘 If Something Goes Wrong

**Before troubleshooting:**

1. First, check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — it covers all common errors
2. Run the SQL verification queries provided in [MIGRATE-DATABASE.md](./MIGRATE-DATABASE.md)
3. Check browser console (F12 → Console tab) for JavaScript errors

**Common Issues:**

- **"Cannot reach the network"** → Database migrations not deployed (phase 2)
- **404 on RPC endpoints** → Same as above
- **"policy already exists"** → See "SQL Error Handling" in [MIGRATE-DATABASE.md](./MIGRATE-DATABASE.md)
- **Function not found** → Run verification query; if empty, retry migration

---

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| [SECURITY-FIX-REQUIRED.md](./SECURITY-FIX-REQUIRED.md) | Revoke bot token, clean git history |
| [MIGRATE-DATABASE.md](./MIGRATE-DATABASE.md) | Deploy migrations manually, handle SQL errors |
| [DEPLOYMENT-SETUP.md](./DEPLOYMENT-SETUP.md) | Full production deployment guide |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Error diagnosis and SQL debugging queries |
| [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) | 5-minute dev reference |

---

## ⏰ Estimated Timeline

- **Phase 1 (Security):** 5 min
- **Phase 2 (Database):** 20 min
- **Phase 3 (Testing):** 10 min
- **Total:** ~35 min to full working game

---

## Next Step

👉 **Start with [SECURITY-FIX-REQUIRED.md](./SECURITY-FIX-REQUIRED.md) now** — revoke that bot token immediately, then proceed to phase 2.

**Status:** 🔴 Blocked on security fix  
**Action:** Revoke bot token via @BotFather
