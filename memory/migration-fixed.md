---
name: migration-fixed
description: Supabase migration file restored and API layer fixed for proper RPC integration
metadata:
  type: project
---

The migration file was accidentally emptied but has been restored from git (1122 lines). Applied fixes to:

1. **lib/supabase.ts**: Added proper error handling, initialization checks, and typed RPC wrapper functions for game state, battles, trivia, referrals, and leaderboards

2. **lib/api.ts**: Updated to use `supabase.rpc()` with correct parameter names (p_stage_id, p_session_id, etc.) and proper error handling with descriptive messages

3. **components/game/campaign-screen.tsx**: Added retry button in error state and improved error message handling for network failures

All RPC functions now properly map to the Supabase functions defined in the migration:
- game_init_state()
- game_start_battle(p_stage_id int)  
- game_submit_battle(p_session_id uuid, p_actions jsonb, p_formation text)
- game_submit_trivia(p_question_id int, p_answer_index int)
- game_process_referral(p_referral_code text)
- game_get_leaderboard(p_kind text)

Why This Works: The original errors ("Cannot reach the network", 404 on /rest/v1/rpc/game_start_battle) were caused by:
1. Empty migration file (no RPC functions defined in DB)
2. Frontend making direct REST calls instead of using supabase.rpc()
3. No error handling for failed RPC calls

Next Steps for User:
1. Apply migration: Paste contents of supabase/migrations/202608230001_production_core.sql into Supabase SQL Editor and run
2. Verify RPC functions are exposed in Supabase Studio > Functions > RPC (should be Public)
3. Restart dev server and clear browser cache
4. Test full flow: Open → Authenticate → Camp state → Begin Battle → Submit actions → See persistent rewards

**Verification Test**: Open browser console and run:
```javascript
const { data, error } = await supabase.rpc('game_init_state');
console.log('RPC test:', data || error);
```
Should return initialized game state without errors.

Related: [[verticle-slice-real]] [[supabase-rpc-fix]]
**Why:** No dev fixtures in production paths, real Telegram users can use it, production configuration does not depend on fixtures
**How to apply:** Apply migration, verify RPC exposure, test end-to-end flow