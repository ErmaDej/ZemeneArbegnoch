---
name: compliance-legal
description: Ethiopian regulatory compliance considerations for Zemene Arbegnoch
metadata:
  type: reference
---

**Key Regulations:**
- July 23, 2026: National Bank of Ethiopia expanded virtual-asset ban to cover any tradeable/exchangeable digital representation of value
- Rules out: TON reward tokens, in-game tradeable coins, anything functioning like a birr-pegged crypto asset for Ethiopian users
- Real cash rewards must move through a licensed fiat rail (Chapa is NBE-licensed Ethiopian payment gateway with clean API access to Telebirr, CBE Birr, and cards)

**Compliance Pathways:**
1. **Safe Path (Phase 1):** Telegram Stars for cosmetic purchases (skins, banners) - Telegram's native in-app currency purchased with real money but not tradeable
2. **In-kind Rewards:** Sponsored tournaments with airtime, data bundles, or merchant vouchers via Chapa (no direct cash handling)
3. **Cash Prizes (Phase 3):** Skill-based leaderboard with payouts via Chapa/Telebirr to verified accounts - requires legal review of gambling/lottery regulations

**Legal Checkpoints:**
- Verify current NBE virtual-asset stance with Ethiopian lawyer
- Confirm whether skill-based cash-prize contest triggers gambling regulation (skill-vs-chance distinction matters)
- Check Chapa merchant onboarding requirements and timeline
- Ethiopia's fintech regulation moves fast - re-verify compliance picture before each phase touching real money

**Design Constraints:**
- No monetary, points-for-cash, or tradeable-token features in Phase 1
- Monetization comes in later phases only after legal clearance
- Cosmetic monetization (developer revenue): Telegram Stars share
- Developer revenue overall: rewarded video ads, sponsorship deals, Stars revenue share