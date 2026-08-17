---
name: phased-roadmap
description: Three-phase development roadmap for Zemene Arbegnoch
metadata:
  type: project
---

**Phase 0 — Validate before you build (3–5 days)**
- Post concept art + 1-paragraph pitch in Ethiopian youth Telegram channels/groups; gauge reaction, collect Amharic name suggestions
- Confirm with local lawyer/accountant: (a) current NBE virtual-asset stance, (b) whether skill-based cash-prize contest triggers gambling regulation, (c) Chapa merchant onboarding requirements/timeline
- **Exit criteria:** genuine interest signal + clear legal path for at least the in-kind reward model (airtime/vouchers) even if cash prizes need more runway

**Phase 1 — Appealing, feature-rich MVP (2–4 weeks)**
Goal: Something people actually want to open every day, before any money is involved
- Telegram bot + Mini App shell (BotFather setup, WebApp SDK wired in)
- Idle camp-building loop with 3–4 resource types (Fighters, Provisions, Morale)
- 8–10 auto-resolved campaign battles (Adwa-inspired chapters) with simple stylized animation
- History trivia interludes (20–30 question bank to start)
- Amharic/English toggle
- Leaderboard (global + friends, via Supabase)
- Telegram deep-link referral system with starter-boost reward
- Cosmetic-only rewards (badges, flags) — **no real-money features yet**
- Basic analytics (Supabase or free-tier Mixpanel/PostHog) to see what's actually engaging
- **Success metric to move on:** Day-7 retention and organic invite rate

**Phase 2 — Deeper gameplay + sponsor-funded rewards (4–6 weeks after Phase 1 ships)**
- Lightweight tactical layer: player-chosen formations before each battle, not just auto-resolve
- Regiment/clan system with weekly competitions
- Telegram Stars cosmetic shop (skins, banners, camp decorations)
- First sponsored tournament: partner with one local brand (telecom, bank, ride-hailing app) to fund an airtime/data/voucher prize pool for a leaderboard event
- Rewarded video ads for extra energy/boosts
- Expand campaign content to 20–30 chapters with historian-reviewed copy

**Phase 3 — Robust, revenue-mature version (2–3 months after Phase 2)**
- Cash-prize skill ladder via Chapa payouts (only once Phase 0 legal check is cleared)
- Live PvP seasonal ladder
- Multiple concurrent brand sponsorships, formalized revenue share
- Amharic voiceover for key campaign moments
- Deeper anti-cheat / fraud checks on the payout path
- Consider native wrapper only if you outgrow Telegram's reach