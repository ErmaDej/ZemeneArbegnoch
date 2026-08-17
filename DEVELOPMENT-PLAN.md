# Zemene Arbegnoch Development Plan

A robust, actionable plan to build and enrich the Telegram Mini App game themed around Ethiopia's resistance history.

## Executive Summary

**Project Goal:** Build a Telegram-native strategy/action game that educates users about Ethiopian resistance history while providing engaging gameplay, compliant monetization, and organic growth through social features.

**Target Users:** Young, price-sensitive, Android-first Ethiopian youth (primarily Addis Ababa).

**Key Differentiators:** 
- Historically grounded, authentic patriotic theme (Adwa era)
- Telegram-first approach with zero install friction
- Compliance-conscious monetization aligned with Ethiopian regulations
- Social competition through regiments/clans and referral system
- Educational trivia layer that provides genuine value

**Current State:** Project initialized with memory bank capturing core context, tech stack, data model, compliance requirements, and phased roadmap.

## Phase 1: Foundation & MVP (Weeks 1-4)

### Week 1: Setup & Core Infrastructure
**Objective:** Establish development environment and core backend/frontend scaffolding

#### Tasks:
1. **Environment Setup**
   - Initialize GitHub repository
   - Set up Supabase project (free tier)
   - Configure Telegram Bot via BotFather
   - Set up local development environment (Node.js, npm/yarn)

2. **Backend Foundation**
   ```bash
   # Create Supabase tables based on data model
   # Implement Row Level Security policies
   # Set up Supabase client in frontend
   ```

3. **Frontend Skeleton**
   - Basic Telegram Mini App shell with WebApp SDK integration
   - Telegram initData validation middleware
   - Responsive layout for mobile WebView
   - Language toggle framework (Amharic/English)

#### Deliverables:
- Working Telegram Mini App that loads in Telegram's test environment
- Supabase database with players table and basic RLS policies
- Telegram bot username and deep-link configuration

### Week 2: Core Gameplay Loop
**Objective:** Implement the idle base-building mechanic and campaign progression

#### Tasks:
1. **Resource System**
   - Fighters, Provisions, Morale resources with passive accumulation
   - Manual "gather" tap mechanic with cooldown
   - Upgrade tree: Recruit Post, Grain Store, Council Tent

2. **Campaign Map**
   - Linear sequence of 8-10 Adwa-inspired chapters
   - Chapter unlocking progression
   - Visual representation of campaign map

3. **Battle System**
   - Auto-resolved combat (Phase 1)
   - Stylized formation icons (no gore/violence)
   - Stat comparison + light randomness resolution
   - 10-20 second battle duration

#### Deliverables:
- Functional idle resource generation and spending
- Unlockable campaign chapters with auto-battles
- Resource management UI with upgrade options
- Basic battle visualization (formation icons clashing)

### Week 3: Social & Educational Features
**Objective:** Add referral system, trivia, and leaderboards

#### Tasks:
1. **Referral System**
   - Per-user Telegram deep-link generation
   - Starter resource boost for both inviter and invitee
   - Referral tracking in Supabase

2. **Trivia Interludes**
   - Multiple-choice history questions after every 2 chapters
   - Question bank storage in Supabase (Amharic/English)
   - Bonus resource rewards for correct answers
   - Source notes for historian review flagging

3. **Leaderboard System**
   - Global top 50 players
   - Friends leaderboard (referral network)
   - Score based on campaign progress and resources
   - Real-time updates via Supabase subscriptions

#### Deliverables:
- Working referral system with tracking
- Trivia question bank (20-30 questions seeded)
- Global and friends leaderboards
- Bonus resource system for trivia success

### Week 4: Polish & Validation
**Objective:** Refine user experience and validate with target audience

#### Tasks:
1. **User Experience**
   - Amharic language support with Noto Sans Ethiopic
   - Smooth animations and transitions
   - Intuitive onboarding flow
   - Error handling and loading states

2. **Compliance Verification**
   - Legal consultation on NBE virtual-asset stance
   - Confirmation of Telegram Stars compliance
   - Review of in-kind reward model viability

3. **User Testing**
   - Deploy to test Telegram group
   - Collect feedback on core gameplay loop
   - Measure Day-1 and Day-3 retention
   - Assess organic sharing via referrals

#### Deliverables:
- Fully functional Phase 1 MVP
- Legal compliance memo for Phase 1 features
- User testing report with retention metrics
- Ready for Phase 2 sponsor discussions

## Phase 2: Growth & Monetization (Weeks 5-10)

### Weeks 5-6: Tactical Depth & Competitive Layer
#### Features:
- Player-chosen formations before battles
- Regiment/clan system with weekly competitions
- Clan chat/coordination features (basic)
- Enhanced battle visuals with formation selection

### Weeks 7-8: Monetization Infrastructure
#### Features:
- Telegram Stars cosmetic shop (skins, banners, decorations)
- First sponsored tournament setup
- Rewarded video ads for energy/boosts
- Basic analytics dashboard

### Weeks 9-10: Content Expansion & Sponsor Activation
#### Features:
- Expanded campaign to 20-30 historian-reviewed chapters
- Multiple brand sponsorship activations
- Live seasonal events
- Community features (clan achievements, etc.)

## Phase 3: Maturity & Revenue (Months 4-6)

### Core Focus:
- Cash-prize skill ladder (post-legal clearance)
- Live PvP seasonal ladder
- Advanced anti-cheat systems
- Amharic voiceover integration
- Formalized revenue share with sponsors

## Success Metrics by Phase

### Phase 1 Success Criteria:
- Day-7 retention > 35%
- Organic invite rate > 0.3 invites/user/day
- Positive user feedback on historical accuracy
- Legal compliance confirmation for all features

### Phase 2 Success Criteria:
- Day-30 retention > 25%
- Sponsor revenue covering 50%+ of operating costs
- Clan system active with >40% user participation
- Trivia completion rate > 60%

### Phase 3 Success Criteria:
- Sustainable revenue model (multiple streams)
- Cash-prize system legally compliant and active
- Strong community engagement (clan wars, events)
- Recognition as educational/historical resource

## Technical Implementation Notes

### Key Integration Points:
1. **Telegram WebApp SDK**
   - Initialize with `window.Telegram.WebApp`
   - Validate initData signature for security
   - Use `Telegram.WebApp.sendData()` for communication

2. **Supabase Usage**
   - Row Level Security for all tables
   - Real-time subscriptions for leaderboards
   - Edge Functions for complex logic (referral processing)
   - Storage for asset hosting (flags, banners)

3. **Performance Optimization**
   - Lazy load Phaser scenes
   - Cache trivia questions locally
   - Minimize bundle size for fast Telegram loading
   - Offline capability for core idle mechanics

### Content Creation Guidelines:
- All historical claims flagged with `// NEEDS HISTORIAN REVIEW`
- Combat remains stylized/icon-based (no realism)
- Regiments use fictional/campaign names only
- Amharic translations reviewed by native speakers
- Source citations provided for all trivia questions

## Risk Mitigation

### Regulatory Risks:
- **Mitigation:** Quarterly legal check-ins, Phase-gated monetization, in-kind reward fallback
- **Monitoring:** Ethiopian NBE announcements, fintech regulation updates

### Technical Risks:
- **Mitigation:** Modular architecture, feature flags, gradual rollouts
- **Monitoring:** Performance metrics, crash rates, Telegram WebView compatibility

### User Acquisition Risks:
- **Mitigation:** Strong referral incentives, shareable trivia results, community building
- **Monitoring:** Organic growth rate, retention curves, referral conversion

### Content Risks:
- **Mitigation:** Historian review process, Ethiopian cultural consultants, sensitivity reading
- **Monitoring:** User feedback, community sentiment, historical accuracy assessments

## Next Steps Immediate Action Items

1. **Today:**
   - Review memory bank files for accuracy
   - Confirm legal consultation schedule
   - Set up development environment

2. **This Week:**
   - Initialize GitHub repo with .gitignore and README
   - Create Supabase project and initial schema
   - Set up Telegram Bot via BotFather
   - Begin Week 1 implementation tasks

3. **Ongoing:**
   - Update memory bank with new learnings
   - Track progress against phased roadmap
   - Maintain compliance vigilance
   - Iterate based on user feedback

This development plan provides a robust foundation while remaining flexible enough to adapt to user feedback, regulatory changes, and technical discoveries. The memory bank ensures all project context is preserved and accessible to any team member or AI assistant working on the project.