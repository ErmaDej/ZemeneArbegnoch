# ZEMENE ARBEGNOCH — PRODUCTION VIBE-CODING MASTER CONTEXT
### ዘመነ አርበኞች — Age of the Patriots
### Telegram Mini App • Adwa-Inspired Live Action Strategy / Action Game

> **Purpose of this document:** This is the new authoritative project context for vibe-coding agents working on the existing Zemene Arbegnoch project.
>
> It supersedes the earlier scaffold-oriented prompt where necessary, while preserving its core identity, historical framing, Telegram-first strategy, free-first technology choices, and existing visual appeal.
>
> The project is **already partially implemented**. The main problem is not that the concept needs to be reinvented; it is that the current implementation lacks the depth of interactivity, persistent real-user state, authoritative gameplay, and production robustness required to become a real Telegram game.
>
> **Primary objective:** turn the existing project into a genuinely playable, stateful, graphically rich, live-action Telegram Mini App based around the Battle of Adwa and the Ethiopian resistance era — with real users, real progression, real persistence, real competition, real backend validation, and no fake/demo gameplay data.

---

# 1. PROJECT IDENTITY

## Working name

**Zemene Arbegnoch**
**Amharic:** ዘመነ አርበኞች

The working name may be changed later, but the product identity should remain authentically Ethiopian rather than generic fantasy.

"Arbegna / አርበኛ" is intended to communicate the Ethiopian patriot/resistance theme directly.

## Core premise

A Telegram-native action/strategy game in which players build and strengthen a fictional patriot regiment, progress through a historically inspired campaign anchored on the 1896 Battle of Adwa, and participate in fast, skill-driven battle stages.

The game combines:

- persistent camp/base progression
- resource management
- recruitment and upgrades
- campaign progression
- active live-action battle gameplay
- stylized target/shooting mechanics
- tactical decisions
- history/trivia
- achievements
- referrals
- leaderboards
- fictional regiments/clans
- events and seasonal competition

The experience should feel like a **real game**, not a dashboard with buttons.

---

# 2. SOURCE OF TRUTH AND DESIGN CONTINUITY

The existing project came from three prior documents:

1. `adwa-legacy-game-plan.md`
2. `Project Context Prompt.md`
3. `DEVELOPMENT-PLAN.md`

Those documents established the following non-negotiable foundations:

- Ethiopian resistance-history theme, especially Adwa
- Telegram Mini App as the primary delivery platform
- free-first development stack
- Supabase backend
- Phaser.js for game scenes
- Amharic + English localization
- fictional/campaign-based regiments instead of real ethnic/regional group competition
- stylized combat without gore
- factual treatment of real historical figures
- trivia/education layer
- referral and social mechanics
- progressive development phases
- monetization only after validating engagement and legal feasibility

The old plan also described an idle camp system, 8–10 campaign chapters, trivia after every two chapters, leaderboards, referral rewards, badges, and a later tactical layer.

The newer context additionally introduced **sniper-mode / popping-up-enemy stages**.

### New product interpretation

Do NOT choose between:

- idle strategy, OR
- auto-battle, OR
- sniper action.

Instead, combine them into a coherent game loop:

**BUILD → PREPARE → ENTER BATTLE → PLAY ACTIVE ACTION STAGE → RESOLVE RESULT → REWARD → UPGRADE → PROGRESS → COMPETE**

The previous auto-battle concept should become a supporting simulation layer where useful, not the entire gameplay experience.

The player should spend meaningful time actually playing the battle.

---

# 3. THE CENTRAL EXPERIENCE

The player should open the Mini App and immediately understand:

> "I am building my regiment, preparing for the campaign, entering historical-inspired battles, and proving my skill."

The game must deliver three simultaneous feelings:

### 3.1 Identity

"I am part of an Ethiopian historical journey."

### 3.2 Agency

"My choices and my skill change the outcome."

### 3.3 Progression

"Everything I do makes my regiment stronger."

---

# 4. IMMUTABLE PRODUCT PRINCIPLES

These rules apply to every implementation decision.

## 4.1 Real users only

Production gameplay must never depend on fake users, fake leaderboards, fake profiles, fake battle opponents, fake resource balances, or hardcoded sample scores.

Development fixtures may exist only behind an explicit development-only flag and must never be loaded in production.

Do not create fake activity merely to make the UI appear populated.

Empty states must look intentional.

## 4.2 Backend owns truth

The browser/client is **not authoritative** for:

- resource amounts
- scores
- battle outcomes
- cooldowns
- energy
- rewards
- campaign completion
- achievement unlocks
- referral rewards
- leaderboard positions
- inventory ownership
- anti-cheat decisions

The client sends player intent/input.

The server validates and records the result.

## 4.3 Never trust the Telegram client

Telegram Mini App `initDataUnsafe` must not be treated as authoritative identity.

Use Telegram `initData`, validate it server-side, derive the authenticated player identity, and establish the game's authenticated session from that trusted result.

This is an explicit security requirement from Telegram's current Mini App documentation.

Reference:
https://core.telegram.org/bots/webapps

## 4.4 Preserve the existing visual appeal

Do not replace the current UI with generic Tailwind cards, generic SaaS dashboards, default Phaser demos, or an unrelated visual language.

Before changing visual components:

1. inspect the existing implementation
2. identify visual tokens
3. identify the strongest screens
4. preserve successful compositions
5. enhance them rather than flattening them

The redesign should feel like:

> **the same game, finally brought to life**

not:

> **a completely different game**

## 4.5 Low-end Android first

Optimize for:

- Telegram WebView
- Android
- low/mid-range devices
- intermittent 3G/4G
- small screens
- touch controls
- short sessions

The game must still look rich without requiring expensive rendering.

---

# 5. HISTORICAL AND CULTURAL POSITIONING

## 5.1 Historical anchor

The main thematic anchor is:

**The 1896 Battle of Adwa and the Ethiopian resistance era of the late 19th / early 20th century.**

The wider historical setting may draw from the Ethiopian resistance era described in the original project plan, but content must not drift into contemporary political conflict.

## 5.2 Avoid contemporary conflict

Do not incorporate:

- current Ethiopian political parties
- sitting politicians
- contemporary political slogans
- ongoing internal conflicts
- modern ethnic rivalries
- factional real-world identities

## 5.3 Regiments

Competitive teams must use fictional or campaign/virtue names.

Examples:

- Ye-Wetat Regiment
- Victory Regiment
- Highland Shield
- Lion Guard
- Patriots of Adwa
- Dawn Regiment
- Abay Guard

Never use actual ethnic groups or regions as competing teams.

## 5.4 Historical figures

Historical figures such as:

- Menelik II
- Empress Taytu
- and other historically relevant figures

may appear respectfully.

Rules:

- no invented quotations
- no fabricated events
- no fake historical achievements
- no misleading claims presented as fact

Every historical assertion should be marked internally:

`NEEDS HISTORIAN REVIEW`

until reviewed.

## 5.5 Combat presentation

Combat is stylized.

Allowed:

- target icons
- banners
- formations
- shields
- stylized projectile effects
- smoke/dust particles
- directional indicators
- muzzle flashes
- hit markers
- impact effects
- screen shake used sparingly
- animated target pop-ups

Avoid:

- gore
- dismemberment
- blood effects
- realistic wound simulation
- graphic death animations
- extreme realistic violence

The game should feel exciting, not gruesome.

---

# 6. GAME GENRE

The best product definition is:

> **Telegram-native historical action-strategy game with persistent base progression, active reaction/shooting battles, tactical preparation, social competition, and educational history content.**

It is not simply a clicker.

It is not simply a tower defense game.

It is not simply an idle game.

It is not simply a shooting game.

It is a hybrid.

---

# 7. CORE GAME LOOP

## Primary loop

1. Open the game
2. Collect passive camp output
3. Review current missions
4. Upgrade the camp
5. Recruit/prepare fighters
6. Choose a campaign stage
7. Configure pre-battle loadout
8. Enter the active battle
9. Shoot/interact with targets and enemy formations
10. Complete objectives
11. Receive validated rewards
12. Update player progression
13. Unlock the next stage
14. Improve the regiment
15. Compete on leaderboards
16. Return later for passive gains/events

## Meta loop

**Play → Improve → Unlock → Compete → Invite → Return**

---

# 8. CAMP / BASE SYSTEM

The player's home is a fictional patriot camp.

It should feel alive, not like a settings page.

## Main resources

Initial resources:

### Fighters
Represents available trained manpower.

### Provisions
Represents food/supplies needed for sustained activity.

### Morale
Represents readiness and momentum.

Additional resources may later be introduced, but do not create unnecessary currencies.

## Passive production

Buildings generate resources over time.

Examples:

### Recruit Post
Generates Fighters.

### Grain Store
Improves Provisions capacity and generation.

### Council Tent
Improves Morale generation and strategic capacity.

Future structures:

- Training Ground
- Scout Post
- Forge
- Messenger Post
- Medical Tent
- Command Pavilion

Do not overcomplicate the first production release.

## Upgrade mechanics

Every upgrade must be persistent.

The client should display:

- current level
- next level
- cost
- time if applicable
- actual server-derived values

The client must never simply add the resource after a click.

---

# 9. RESOURCE LEDGER

Do not rely only on a mutable JSON blob such as:

`resources: { fighters, provisions, morale }`

Use a proper transactional architecture.

Recommended structure:

### player_resources

- player_id
- fighters
- provisions
- morale
- updated_at

### resource_ledger

Each important resource mutation gets a record:

- id
- player_id
- resource_type
- amount_delta
- reason
- source_type
- source_id
- created_at
- idempotency_key

Examples:

- passive_generation
- battle_reward
- trivia_reward
- building_purchase
- referral_reward
- daily_reward

This makes debugging, anti-cheat investigation, rollback, analytics, and support significantly easier.

---

# 10. ACTIVE BATTLE SYSTEM

This is the most important upgrade over the previous MVP specification.

The player must actively participate.

## Battle philosophy

Each stage should last approximately:

**20–60 seconds**

depending on stage design.

The game should feel:

- immediate
- responsive
- skill-based
- readable
- replayable

## Battle types

Build the system so new battle types can be added without rewriting the engine.

Initial battle types:

### A. Target Sweep

Enemies/targets pop up in multiple locations.

Player taps/clicks targets quickly.

Score depends on:

- accuracy
- reaction time
- combo streak
- objective completion

### B. Wave Defense

Enemy formations appear in waves.

Player must eliminate targets before they reach a boundary.

### C. Precision Challenge

Fewer targets.

Higher scoring multiplier.

Misses reduce multiplier.

### D. Commander Challenge

A short boss/objective sequence with multiple target phases.

No graphic injury simulation.

## Input model

Desktop:

- mouse
- pointer events

Mobile:

- touch
- pointer events

Never build separate game logic for mouse and touch.

Use one normalized input system.

---

# 11. TARGET / "SNIPER MODE" DESIGN

The original project specifically requested popping-up enemies.

Preserve this concept while keeping the presentation stylized.

## Target behavior

Targets may:

- appear
- hide
- move slightly
- change position
- reveal briefly
- spawn in groups
- become armored/high-value targets
- carry mission objectives

The player must react.

## Hit processing

A hit consists of:

- target id
- client timestamp
- input coordinates
- local sequence number
- current battle session id

The server validates the event against the battle session's legal parameters.

Do not blindly accept:

`score += 100`

from the client.

## Anti-cheat principle

The server should verify:

- battle session exists
- session belongs to player
- session is currently active
- target exists in session
- target was available during legal timing
- target has not already been hit
- action is within allowed bounds
- action sequence is valid
- action rate is plausible
- session duration is valid
- action count is plausible

The server then calculates/accepts the authoritative score.

---

# 12. BATTLE SESSION ARCHITECTURE

Each battle creates a server-backed session.

### battle_sessions

Suggested fields:

- id
- player_id
- campaign_stage_id
- battle_type
- seed
- status
- started_at
- expires_at
- client_version
- score
- accuracy
- combo
- objective_state
- result
- completed_at

Possible status values:

- created
- active
- submitted
- validated
- completed
- expired
- rejected

## Deterministic battle seeds

Each battle can have a server-created seed.

The seed drives:

- target spawn timing
- target position choices
- wave composition
- variation

This enables the client to render the expected encounter while allowing the server to validate the underlying sequence.

Do not use client-only randomization for important gameplay outcomes.

---

# 13. SERVER AUTHORITATIVE ACTION FLOW

Example:

### Start

Client:

`startBattle(stageId)`

Server:

1. authenticate user
2. check stage unlocked
3. check energy/cost if applicable
4. create battle session
5. create seed
6. return battle session payload

### During battle

Client sends compressed action events or batched events.

Example conceptual event:

```json
{
  "battleSessionId": "...",
  "sequence": 37,
  "targetId": "t12",
  "clientTs": 1712345678,
  "x": 0.61,
  "y": 0.35
}
```

Server validates.

### Finish

Client:

`submitBattle(sessionId, finalActions)`

Server:

1. validate session
2. reconstruct or verify encounter
3. validate actions
4. calculate authoritative score
5. calculate rewards
6. update player state transactionally
7. write battle result
8. award achievements
9. update leaderboard materialization
10. return result

---

# 14. PLAYER FEEDBACK SHOULD REMAIN INSTANT

Authoritative backend does not mean slow gameplay.

The client may optimistically animate:

- target hit
- score counter
- combo
- hit effect
- target disappearance
- feedback sounds

But the client must eventually reconcile against the authoritative server result.

The player should never see a boring "saving..." screen after every shot.

Use:

**local visual responsiveness + batched authoritative validation**

instead of:

**client-only fake scoring**

---

# 15. CAMPAIGN MAP

The original concept used 8–10 initial chapters.

Keep that for the first production content set.

But design the data model so 20–30+ chapters can later be added without code changes.

Each chapter should have:

- id
- title
- subtitle
- historical context
- environment
- battle type
- difficulty
- energy/cost if applicable
- recommended power
- objectives
- rewards
- unlock requirement
- historical source note

The UI should visually represent progression.

Use:

- stylized map
- route
- nodes
- checkpoints
- locked stages
- completed stages
- current stage highlight

---

# 16. BATTLE OBJECTIVES

Do not make every battle simply:

"kill everything."

Examples:

- Hit 20 targets
- Complete with 80%+ accuracy
- Maintain a 10-hit combo
- Finish before the timer expires
- Protect supply targets
- Eliminate priority targets
- Complete without missing more than 5 shots
- Collect strategic markers while surviving waves
- Defeat a sequence of commander targets

This increases replayability without requiring massive new assets.

---

# 17. DIFFICULTY CURVE

Difficulty should evolve across:

- target speed
- spawn density
- target duration
- number of simultaneous targets
- decoy targets
- objective complexity
- environmental distractions
- combo requirements

Do not simply inflate HP or score requirements.

Skill progression should be visible.

---

# 18. PLAYER PROGRESSION

Players should have a persistent profile.

Core properties:

- Telegram identity
- display name
- avatar
- language
- progression level
- campaign stage
- total score
- battle wins/completions
- accuracy
- best combo
- achievements
- regiment
- referral count
- account creation date
- last active date

Optional later:

- profile title
- banner
- cosmetic flag
- camp theme
- historical trivia rank

---

# 19. ENERGY / SESSION CONTROL

Avoid aggressive monetization.

A free-first model is required.

Possible early system:

- limited daily battle energy
- energy regeneration over time
- free daily energy
- mission-based bonus energy

Do not introduce paid energy until the core game is proven.

Energy must be server-controlled.

Never let the browser decide:

`energy = energy - 1`

without backend validation.

---

# 20. TRIVIA / EDUCATIONAL SYSTEM

Trivia remains part of the identity.

After every two major chapters, or at appropriate campaign milestones, introduce a historical question.

Each question needs:

- question_en
- question_am
- options_en
- options_am
- correct_index
- explanation_en
- explanation_am
- source_note
- source_url if available
- historian_review_status

Questions should be real historical questions, not invented filler.

Correct answers may provide:

- provisions
- morale
- campaign points
- cosmetic unlock progress
- achievement progress

Do not turn trivia into a fake educational badge.

---

# 21. REGIMENT / CLAN SYSTEM

Regiments are social groups using fictional/campaign names.

Core features:

- create regiment
- join regiment
- leave regiment
- member list
- regiment score
- weekly score
- contribution tracking
- regiment achievements
- leaderboard

Do not use ethnic or regional groups as competitive categories.

Later:

- regiment missions
- cooperative goals
- group events
- basic chat/coordination

---

# 22. LEADERBOARDS

Initial leaderboards:

### Global

Top players.

### Friends / referrals

Players connected through referral network where practical.

### Regiment

Top fictional regiments.

### Weekly

Resettable seasonal score.

## No fake leaderboard padding

At launch, if only 12 real players exist, show 12 real players.

Do not fabricate 50 names to make the game look alive.

A truthful empty/early-stage leaderboard is preferable.

---

# 23. REFERRAL SYSTEM

Telegram deep links remain a major organic growth mechanism.

Each player gets a referral link conceptually like:

`https://t.me/<bot>/<app>?startapp=ref_<player>`

Referral rules:

- inviter must be real
- invitee must be a unique Telegram account
- reward must be one-time
- self-referral prohibited
- abuse detection required
- referral attribution must be stored server-side

Suggested tables:

### referrals

- id
- inviter_id
- invitee_id
- referral_code
- created_at
- reward_status

Never trust a referral code from the client without server validation.

---

# 24. ACHIEVEMENT SYSTEM

Achievements add long-term motivation.

Examples:

- First Battle
- First Victory
- Ten Battles
- Perfect Accuracy
- 20-Hit Combo
- First Trivia Mastery
- First Regiment
- Seven-Day Streak
- Adwa Campaign Complete

Achievement rules should be evaluated server-side.

---

# 25. DAILY / WEEKLY SYSTEMS

Use light recurring content.

### Daily

- daily mission
- daily reward
- daily battle objective
- trivia challenge

### Weekly

- leaderboard reset
- regiment competition
- special challenge

All schedules are based on server time.

Do not trust browser clocks.

---

# 26. LIVE / MULTIPLAYER DEFINITION

"Live action" does not require forcing every battle to be synchronous PvP.

The initial architecture should support:

### Real-time player activity

- live leaderboard updates
- active event notifications
- regiment activity
- presence where appropriate
- event state

### Asynchronous competition

- player score vs player score
- weekly leaderboard
- ghosts / records
- challenge replays if implemented

### Future synchronous PvP

Design interfaces so true PvP can be added later without replacing the campaign engine.

For real-time channels, use authenticated/private Realtime channels with appropriate RLS policies.

Supabase currently supports authorized private Realtime channels with RLS-based access control.

---

# 27. TELEGRAM INTEGRATION

Use the official Telegram Mini App capabilities.

Required:

- Mini App initialization
- theme synchronization
- viewport handling
- haptic feedback
- Telegram user identity
- deep links
- back button
- main button where useful
- sharing/invite flow
- cloud/device storage only for appropriate client convenience data

Critical rule:

**Telegram client data is not game authority.**

Telegram's current docs specifically warn that:

- `initDataUnsafe` is untrusted
- `initData` should be validated on the bot/server before use

Reference:
https://core.telegram.org/bots/webapps

---

# 28. AUTHENTICATION MODEL

Recommended flow:

1. Telegram launches Mini App.
2. Client receives `initData`.
3. Client sends it to an authentication Edge Function.
4. Edge Function validates Telegram signature.
5. Server finds or creates player.
6. Server creates/establishes the authenticated game session.
7. Client receives only the safe authenticated session data.
8. Every game operation uses authenticated identity.

Do not put Telegram bot secrets in frontend code.

Do not put Supabase service-role secrets in frontend code.

Supabase explicitly states that the service-role key bypasses RLS and should never be exposed in the browser.

---

# 29. BACKEND ARCHITECTURE

## Primary backend

**Supabase**

Use:

- PostgreSQL
- Row Level Security
- Edge Functions
- Realtime
- Storage
- database functions where appropriate

Supabase Edge Functions are currently TypeScript/Deno server-side functions suitable for authenticated HTTP logic and third-party integrations.

Reference:
https://supabase.com/docs/guides/functions

## Architecture layers

### Database

Persistent game truth.

### Edge Functions

Authoritative game actions and protected logic.

### Realtime

Live social/event updates.

### Storage

Game assets, user-visible uploads where eventually needed.

### Analytics tables/functions

Gameplay telemetry and operational metrics.

---

# 30. DATABASE — PRODUCTION MODEL

The previous model is too small for a real game.

Use a modular schema.

## Identity

### players

- id UUID
- telegram_id BIGINT / TEXT
- telegram_username
- display_name
- avatar_url
- language_pref
- created_at
- updated_at
- last_active_at
- status

Unique constraint on Telegram identity.

## Progression

### player_progress

- player_id
- level
- xp
- campaign_stage_id
- total_score
- lifetime_battles
- lifetime_wins
- best_accuracy
- best_combo
- current_streak

## Resources

### player_resources

- player_id
- fighters
- provisions
- morale
- updated_at

### resource_ledger

- id
- player_id
- resource_type
- amount_delta
- reason
- source_type
- source_id
- idempotency_key
- created_at

## Camp

### buildings

- id
- building_key
- name_en
- name_am
- base_cost
- max_level

### player_buildings

- player_id
- building_id
- level
- updated_at

## Campaign

### campaign_stages

- id
- chapter_number
- title_en
- title_am
- description_en
- description_am
- battle_type
- difficulty
- config_json
- reward_config
- unlock_requirement
- historical_note
- historical_source
- review_status
- active

### player_campaign

- player_id
- stage_id
- first_completed_at
- best_score
- best_accuracy
- best_combo
- completion_count
- stars
- updated_at

## Battle

### battle_sessions

- id
- player_id
- stage_id
- battle_type
- seed
- status
- started_at
- expires_at
- submitted_at
- validated_at
- authoritative_score
- accuracy
- combo
- result
- validation_version

### battle_actions

- id
- battle_session_id
- sequence
- target_id
- action_type
- client_timestamp
- normalized_x
- normalized_y
- accepted
- reject_reason
- created_at

For high-volume gameplay, consider batching actions or storing a compact validated event payload instead of inserting one database row per shot.

## Trivia

### trivia_questions

- id
- question_en
- question_am
- options_en
- options_am
- correct_index
- explanation_en
- explanation_am
- source_note
- source_url
- historian_review_status
- active

### trivia_attempts

- id
- player_id
- question_id
- answer_index
- correct
- reward
- created_at

## Social

### regiments

- id
- name
- slug
- leader_id
- created_at

### regiment_members

- regiment_id
- player_id
- role
- joined_at

### referrals

- id
- inviter_id
- invitee_id
- referral_code
- reward_status
- created_at

## Rewards / achievements

### achievements

- id
- key
- name_en
- name_am
- description_en
- description_am
- criteria_json

### player_achievements

- player_id
- achievement_id
- unlocked_at

## Leaderboards

Do not rely entirely on an expensive dynamic query at scale.

Use appropriate indexes and materialization/snapshot strategies.

Possible:

### leaderboard_snapshots

- id
- period
- leaderboard_type
- player_id
- score
- rank
- created_at

Only introduce complexity when real usage requires it.

## Anti-cheat

### anti_cheat_events

- id
- player_id
- battle_session_id
- event_type
- severity
- metadata
- created_at

---

# 31. RLS SECURITY MODEL

Every player must only be able to access data appropriate to their identity.

Client-side tables can allow:

- reading their own safe profile
- reading public campaign definitions
- reading public achievements
- reading eligible leaderboard data
- subscribing to authorized public/private event channels

Mutations for sensitive game state should preferably go through Edge Functions.

Never allow a client to directly update:

- resources
- score
- progression
- rewards
- battle outcome
- referral reward status
- achievements
- energy
- premium/cosmetic ownership

without server-side authorization and validation.

---

# 32. EDGE FUNCTION RESPONSIBILITIES

Create focused functions rather than one giant function.

Recommended functions:

- `telegram-auth`
- `get-player-state`
- `start-battle`
- `submit-battle`
- `claim-passive-resources`
- `upgrade-building`
- `claim-daily-reward`
- `submit-trivia`
- `process-referral`
- `join-regiment`
- `create-regiment`
- `claim-achievement`
- `get-leaderboard`
- `heartbeat`
- `report-battle-client-error`

Additional functions can be added later.

Keep each function:

- authenticated
- idempotent where appropriate
- rate-limited where necessary
- observable
- typed
- testable

---

# 33. IDEMPOTENCY

Every reward-affecting request needs an idempotency strategy.

Examples:

- repeated battle submission
- repeated referral processing
- double-click upgrade
- reconnect after timeout
- Telegram WebView retry
- network retry

Never allow:

> same request sent twice = two rewards

Use:

- idempotency keys
- unique database constraints
- transactional updates

---

# 34. OFFLINE / RECONNECT BEHAVIOR

The game should degrade gracefully.

Local storage may remember:

- UI preferences
- language
- audio setting
- tutorial state
- temporary cached campaign definitions
- unsent non-sensitive telemetry

Do not locally authorize rewards.

When the network returns:

1. reconnect
2. refresh authenticated state
3. reconcile resources
4. reconcile progression
5. refresh leaderboard
6. resume/restart battle depending on session rules

Never silently overwrite newer server state with stale local state.

---

# 35. FRONTEND ARCHITECTURE

Recommended stack for the production upgrade:

- React
- TypeScript
- Vite
- Phaser
- Supabase JS
- Telegram Mini App SDK / official WebApp integration
- CSS or a small UI styling layer
- Noto Sans Ethiopic for Amharic

Why React + Phaser:

React handles:

- shell
- navigation
- profile
- camp
- inventory
- trivia
- leaderboards
- social UI
- settings

Phaser handles:

- battle scenes
- target animation
- particles
- hit feedback
- timers
- battle input
- sprites
- effects

Do not put the entire application into Phaser.

Do not put active real-time battle rendering into ordinary DOM if Phaser can handle it more efficiently.

---

# 36. FRONTEND FOLDER MODEL

Suggested structure:

```text
src/
  app/
    App.tsx
    routes/
    providers/
    state/

  telegram/
    telegramClient.ts
    telegramAuth.ts
    haptics.ts
    theme.ts
    viewport.ts

  auth/
    authService.ts
    sessionStore.ts

  game/
    battle/
      BattleGame.ts
      BattleScene.ts
      battleTypes/
      targetSystem/
      input/
      effects/
      audio/
      validation/
    campaign/
    camp/
    progression/

  components/
    game/
    camp/
    battle/
    leaderboard/
    trivia/
    profile/
    shared/

  features/
    player/
    buildings/
    resources/
    trivia/
    referrals/
    regiments/
    achievements/
    leaderboard/

  lib/
    supabase.ts
    api.ts
    i18n/
    formatting/
    analytics/

  assets/
    sprites/
    backgrounds/
    icons/
    audio/

  styles/
    tokens.css
    global.css
```

Adapt this to the actual repository.

Do not blindly restructure the existing project if it would destroy working code.

---

# 37. STATE MANAGEMENT

Separate:

### Server state

- player profile
- resources
- progression
- buildings
- achievements
- leaderboard
- regiment
- campaign completion

### Client state

- current screen
- animation state
- local battle rendering
- settings
- temporary UI state
- current pointer position
- local prediction/reconciliation

Do not mix persistent server state with transient rendering state.

---

# 38. GRAPHICAL DIRECTION

The game should feel visually rich without needing photorealism.

Use:

- layered backgrounds
- parallax
- atmospheric particles
- mountain silhouettes
- warm earth textures
- parchment/map motifs
- Ethiopian-inspired ornamental shapes used respectfully
- shield/banner motifs
- stylized formations
- polished iconography
- subtle depth
- strong typography
- responsive animation

The goal is:

**historical + heroic + polished + mobile-friendly**

not:

**generic fantasy + random Ethiopian symbols**

---

# 39. VISUAL HIERARCHY

The strongest visual priorities:

1. Player identity
2. Current mission
3. Campaign progress
4. Battle CTA
5. Resources
6. Social/leaderboard
7. Secondary systems

Do not bury the main battle action beneath excessive menus.

---

# 40. BATTLE VISUAL DESIGN

Battle screen should communicate within 1–2 seconds:

- current objective
- remaining time
- score
- combo
- target field
- progress
- pause/exit state if allowed

Use restrained effects.

A hit should feel satisfying.

A miss should be readable but not punishingly disruptive.

Combo should have increasingly noticeable feedback.

---

# 41. AUDIO

Audio should be optional and efficient.

Provide:

- hit sound
- miss sound
- UI tap
- reward sound
- level completion
- victory/celebration
- subtle environment loop

Avoid loud default audio.

Respect Telegram/user device settings.

---

# 42. HAPTICS

Where Telegram supports it, use haptics selectively:

- successful hit
- combo milestone
- reward
- error
- mission completion

Do not vibrate on every minor event.

---

# 43. LOCALIZATION

Minimum:

- English
- Amharic

Preferred default:

**Amharic**

English is fallback.

All player-facing text must come from localization resources.

Never hardcode player-facing strings inside components.

Suggested:

```text
locales/
  en.json
  am.json
```

Use Noto Sans Ethiopic.

Review translations with a native speaker before public launch.

---

# 44. RESPONSIVE DESIGN

The game must work on:

- small Android phones
- large Android phones
- desktop Telegram
- browser development mode

Do not build only around one screen size.

Battle coordinates should use normalized coordinates rather than hardcoded pixel positions.

---

# 45. TELEGRAM WEBVIEW SAFETY

Test for:

- viewport changes
- safe areas
- theme changes
- back button behavior
- touch event behavior
- WebView refresh/reload
- reconnect
- browser fallback
- Telegram version differences

Avoid assuming every modern browser API behaves identically inside Telegram.

---

# 46. PRODUCTION DATA RULE

The database can contain legitimate static seed content such as:

- campaign definitions
- building definitions
- historical questions
- achievements

That is not "mock user data."

However, never ship:

- fake players
- fake battle history
- fake social activity
- fake leaderboard competitors
- fake rewards

Production data is generated by real players.

---

# 47. DEVELOPMENT DATA RULE

Development fixtures may be permitted only through an explicit environment guard.

Example concept:

```text
APP_ENV=development
ENABLE_DEV_FIXTURES=true
```

Production must enforce:

```text
APP_ENV=production
ENABLE_DEV_FIXTURES=false
```

The application must fail closed if production configuration attempts to enable dev fixtures.

---

# 48. ANTI-CHEAT FOUNDATION

The game may not need an enormous anti-cheat system on day one, but it must be architected correctly.

Minimum checks:

- authenticated identity
- battle ownership
- battle lifetime
- stage unlock status
- sequence numbers
- duplicate action rejection
- action-rate sanity
- impossible reaction-time detection
- impossible accuracy patterns
- replay consistency
- reward idempotency
- server-side score calculation

Later:

- statistical anomaly detection
- device fingerprint signals where privacy/legal conditions permit
- leaderboard moderation
- suspicious account review
- temporary score quarantine

---

# 49. ANALYTICS

Track real product behavior.

Important events:

- app_open
- onboarding_complete
- campaign_open
- battle_start
- battle_complete
- battle_abandoned
- hit
- miss
- trivia_start
- trivia_complete
- building_upgrade
- referral_created
- referral_converted
- regiment_join
- achievement_unlock
- daily_reward_claim
- session_duration
- reconnect
- client_error

Never send raw sensitive data unnecessarily.

---

# 50. PERFORMANCE BUDGET

The initial experience should load quickly.

Goals:

- small initial bundle
- lazy-load battle assets
- lazy-load Phaser only when entering battle if practical
- compress images
- use sprite atlases
- cache stable assets
- avoid giant background images where layered/vector alternatives work
- minimize network requests during startup

The camp screen should not download every campaign asset.

---

# 51. ASSET STRATEGY

Start with:

- SVG icons
- procedural/simple Phaser graphics where appropriate
- optimized PNG/WebP
- sprite atlases
- open/licensed assets
- custom assets with clear licensing

Maintain an `ASSET_MANIFEST`.

Example:

```ts
{
  key: "target_elite_01",
  path: "/assets/battle/targets/elite_01.webp",
  license: "owned"
}
```

Never use random internet images without tracking rights.

---

# 52. CONTENT PIPELINE

Historical content must be separated from code.

Use database or structured content files for:

- chapters
- historical descriptions
- trivia
- source notes
- translations
- rewards

This permits content updates without rewriting game logic.

---

# 53. GAME CONFIGURATION

Do not hardcode gameplay numbers in multiple files.

Create central configuration:

```text
game-config/
  resources
  buildings
  battle-types
  stages
  rewards
  achievements
  difficulty
```

Server and client must share or derive from a controlled canonical configuration where practical.

Do not trust client configs for reward calculation.

---

# 54. BATTLE DETERMINISM

Battle simulation should be reproducible where possible.

Every battle gets:

- seed
- stage
- difficulty
- rules version
- client version
- server validation version

This allows you to investigate:

> "Why did this player's battle score look strange?"

without guessing.

---

# 55. VERSIONING

Version:

- client
- battle rules
- database schema
- reward logic
- campaign definitions

Never silently change scoring rules in a way that makes old battle records impossible to understand.

---

# 56. TRANSACTIONAL REWARD PIPELINE

The completion pipeline must be atomic.

Example:

```text
validate battle
   ↓
calculate score
   ↓
calculate reward
   ↓
insert battle result
   ↓
update player progression
   ↓
update resources
   ↓
unlock achievement
   ↓
update campaign progress
   ↓
commit
```

If any required step fails, do not partially award rewards.

Use PostgreSQL transactions/RPCs or controlled server-side operations where appropriate.

---

# 57. ERROR HANDLING

Every user-facing action needs:

### Loading state

Never freeze silently.

### Retry state

Offer retry where safe.

### Failure state

Explain what happened in simple language.

### Reconciliation

Refresh from server after uncertain network failures.

### No duplicate rewards

Retries must be idempotent.

---

# 58. ONBOARDING

First launch should be short.

Suggested flow:

1. Welcome
2. Explain identity
3. Name/display confirmation
4. Choose language if needed
5. See camp
6. Collect initial resources
7. Start first battle
8. Complete first objective
9. Receive reward
10. Learn camp upgrade
11. Invite/share option

Do not dump the entire game's rules on the player at first launch.

Teach through play.

---

# 59. FIRST BATTLE

The first battle must be excellent.

Target:

**under 60 seconds from launch to first meaningful action**

But don't skip authentication or server setup.

First battle should teach:

- tap/aim
- target recognition
- combo
- score
- reward
- progression

The player should immediately understand:

> "This is not a mock screen. This is a real game."

---

# 60. GAME FEEL

Prioritize:

- fast input
- responsive visual feedback
- smooth transitions
- satisfying hit effects
- clear score increments
- readable objectives
- short loading time
- meaningful rewards

The result should feel alive even with a relatively small content footprint.

---

# 61. SOCIAL LOOP

After a satisfying moment, provide natural sharing.

Examples:

- "I scored 94% accuracy in the Adwa Challenge."
- "I unlocked a new regiment banner."
- "Our regiment reached #3 this week."
- "I completed Chapter 5."

Use Telegram share/deep-link flows where supported.

Never fabricate social proof.

---

# 62. REWARD DESIGN

Early game rewards:

- resources
- XP
- badges
- banners
- camp decoration
- progression points

Avoid creating many currencies.

A player should understand every reward.

---

# 63. MONETIZATION — LATER, NOT CORE DEVELOPMENT

The first robust interactive release should remain engagement-first.

Possible future options retained from the earlier plan:

- Telegram Stars for cosmetics
- sponsor-funded tournaments
- airtime/data/voucher prizes
- later legally cleared prize systems

Do not introduce tradeable tokens.

Do not introduce cash-reward mechanics until the legal path is verified for the specific mechanic and implementation.

Do not design the game around monetization before retention is demonstrated.

---

# 64. REGULATORY GUARDRAIL

The earlier project files identified regulatory volatility in Ethiopia and specifically required re-verification before any money/prize phase.

Therefore:

**Treat all real-money / cash-prize / token / gambling-adjacent features as feature-flagged future work.**

Phase 1 production gameplay should not depend on them.

Before enabling such features:

- obtain current local legal advice
- verify current NBE requirements
- verify Telegram payment rules
- verify contest/prize requirements
- verify tax/accounting requirements
- verify payout partner requirements

Never treat old regulatory assumptions as permanent truth.

---

# 65. FREE-FIRST TECHNOLOGY STACK

Preferred core stack:

| Layer | Technology |
|---|---|
| Mini App shell | React + TypeScript + Vite |
| Battle engine | Phaser |
| Telegram | Official Telegram Mini App APIs / SDK |
| Backend | Supabase |
| Database | PostgreSQL |
| Server logic | Supabase Edge Functions |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Hosting | Vercel / Netlify free tier where suitable |
| Source control | GitHub |
| CI | GitHub Actions |
| Fonts | Noto Sans Ethiopic |
| Analytics | Supabase-based events or free-tier analytics |
| Assets | Open/licensed/custom assets |
| i18n | JSON resources |

Verify current free-tier limits before production scaling.

---

# 66. WHAT NOT TO DO

Never:

- build fake gameplay that only looks interactive
- hardcode resource increments in the browser
- use fake leaderboard records in production
- trust client score
- trust client reward calculations
- expose Supabase service-role keys
- expose Telegram bot secrets
- put historical claims into code without review metadata
- use real ethnic groups as competitive factions
- add gore to make combat look exciting
- rewrite the existing UI unnecessarily
- create a huge monolithic React component
- put all logic into one Phaser scene
- use arbitrary random web assets without licensing
- create unnecessary dependencies
- create a giant server function handling everything
- make real-money systems a prerequisite for gameplay
- hide network failures behind fake animations

---

# 67. VIBE-CODING OPERATING RULES

Any AI coding agent working on this project must follow this sequence.

## Step 1 — Inspect first

Before changing anything:

- inspect repository structure
- inspect package.json
- inspect entry points
- inspect current UI
- inspect current Phaser scenes
- inspect Supabase client
- inspect existing schema/migrations
- inspect environment variables
- inspect current design tokens
- inspect current screenshots/assets if available

## Step 2 — Produce an implementation map

Identify:

- what already works
- what is simulated
- what is missing
- what is unsafe
- what can be preserved
- what must be replaced

## Step 3 — Preserve working systems

Do not rewrite working modules just for stylistic preference.

## Step 4 — Make one vertical slice real

The first real target is:

**Telegram auth → player creation → camp state → start battle → active target interaction → authoritative battle result → persistent reward → campaign progression**

This vertical slice must work with an actual Telegram user before adding dozens of features.

## Step 5 — Expand systemically

After the vertical slice is real:

- buildings
- resource generation
- campaign
- trivia
- leaderboards
- referrals
- regiments
- achievements
- seasonal content

---

# 68. DEFINITION OF "DONE"

A feature is not considered complete because:

- a button animates
- a screen loads
- a mock JSON object changes
- a fake timer counts
- a score increments locally

A feature is complete only when:

1. UI works
2. server logic exists where needed
3. database state persists
4. unauthorized access is prevented
5. errors are handled
6. reload/reconnect behavior is acceptable
7. real Telegram users can use it
8. production configuration does not depend on fixtures
9. mobile behavior is tested
10. tests or validation exist for important logic

---

# 69. FIRST PRODUCTION VERTICAL SLICE

Build this before everything else:

## Screen A — Camp

Shows real player data:

- player identity
- fighters
- provisions
- morale
- current campaign chapter
- battle CTA

## Screen B — Battle Preparation

Shows:

- selected stage
- difficulty
- mission
- expected reward
- current regiment readiness
- start button

## Screen C — Active Battle

Shows:

- timer
- score
- combo
- target field
- objective
- hit/miss feedback
- pause/exit behavior

## Backend

Provides:

- authenticated player
- battle session
- server seed
- target configuration
- action validation
- authoritative score
- reward calculation

## Screen D — Result

Shows:

- score
- accuracy
- combo
- mission status
- earned resources
- XP
- new unlocks

## Database

Persists:

- battle record
- resource changes
- player progression
- campaign completion
- achievement unlock where applicable

This is the minimum threshold for saying the project has become a real interactive game.

---

# 70. TESTING STRATEGY

## Unit tests

Test:

- scoring
- combo rules
- reward calculation
- unlock logic
- resource calculations
- referral logic
- idempotency
- battle validation

## Integration tests

Test:

- Telegram authentication
- Edge Functions
- Supabase transactions
- RLS
- battle submission
- reconnection
- reward persistence

## Manual device testing

At minimum:

- Android Telegram
- desktop Telegram
- small viewport
- larger phone
- slow network
- disconnected network
- refresh/relaunch
- first-time user
- returning user

---

# 71. SECURITY CHECKLIST

Before production:

- [ ] Telegram `initData` validated server-side
- [ ] `initDataUnsafe` never used as authoritative identity
- [ ] Supabase service-role secret never appears client-side
- [ ] RLS enabled
- [ ] Sensitive mutations routed through server-controlled functions
- [ ] Rate limiting considered
- [ ] Battle sessions expire
- [ ] Duplicate submissions blocked
- [ ] Referral self-abuse blocked
- [ ] Reward operations idempotent
- [ ] Secrets stored in environment variables
- [ ] Production build excludes dev fixtures
- [ ] Error logs avoid sensitive data

Supabase's current Edge Function documentation also supports authenticated server functions and RLS-aware clients, which fits this architecture.

---

# 72. OBSERVABILITY

Every production error should provide enough information to diagnose:

- player id
- battle session id
- request id
- function name
- client version
- error category
- timestamp

But never log secrets or unnecessary personal data.

---

# 73. RELEASE STRATEGY

## Internal Alpha

Small trusted Telegram group.

Focus:

- crashes
- battle feel
- data consistency
- onboarding
- device compatibility

## Closed Beta

Real users.

Focus:

- retention
- engagement
- referral behavior
- leaderboards
- performance
- cheating

## Public Release

Only after:

- real battle loop stable
- real persistence stable
- no fake production data
- security baseline complete
- historical content reviewed
- localization reviewed

---

# 74. PRODUCT SUCCESS METRICS

Retain the original project's success orientation but prioritize gameplay health.

Primary:

- Day-1 retention
- Day-7 retention
- sessions/user/day
- battles/user/day
- battle completion rate
- average battle duration
- campaign progression
- repeat battle rate
- referral conversion
- trivia completion

Secondary:

- average accuracy
- average combo
- regiment participation
- crash/error rate
- load time
- reconnect rate

Do not optimize for raw clicks.

---

# 75. CONTENT ROADMAP

## Release 1

- 8–10 campaign stages
- 2–4 battle types
- 20+ trivia questions
- camp with 3–5 buildings
- core achievements
- global leaderboard
- referrals
- Amharic + English

## Release 2

- 15–20 stages
- regiments
- weekly competitions
- additional target mechanics
- more achievements
- richer camp customization

## Release 3

- 20–30+ stages
- seasonal events
- live community events
- cosmetics
- deeper tactical layer

## Later

- synchronous PvP
- tournament infrastructure
- sponsorships
- monetization

---

# 76. AI CODING AGENT PROMPT

The following can be supplied to Claude Code, OpenCode, BlackBox, Cursor, Copilot, or another coding agent as the project master instruction.

---

## MASTER INSTRUCTION

You are the principal engineer and game-systems developer for **Zemene Arbegnoch (ዘመነ አርበኞች)**, an existing partially implemented Telegram Mini App game inspired by the Ethiopian resistance era and the 1896 Battle of Adwa.

Your job is NOT to create a disposable prototype.

Your job is to progressively transform the existing repository into a real, production-oriented, interactive game.

### PRIMARY MISSION

Preserve the project's current visual identity and appeal while making the actual game mechanics real, persistent, interactive, secure, and extensible.

The game must support real Telegram users.

Do not use fake production data.

Do not simulate backend operations when the real operation can be implemented.

Do not tell the user a feature is complete when only the UI exists.

---

## TECHNICAL MANDATE

Preferred architecture:

- React
- TypeScript
- Vite
- Phaser for interactive battle scenes
- Supabase PostgreSQL
- Supabase Edge Functions
- Supabase Realtime
- Telegram Mini App APIs/SDK
- English + Amharic
- Vercel/Netlify free-tier hosting where appropriate

Inspect the repository before altering architecture.

Use the existing implementation whenever it is sound.

---

## NON-NEGOTIABLE GAME RULE

**The client renders. The server decides.**

Client:

- input
- animation
- prediction
- feedback
- temporary state

Server:

- identity
- authorization
- resources
- progression
- rewards
- battle validation
- score
- leaderboard data
- achievements
- referral rewards

---

## NON-NEGOTIABLE AUTH RULE

Never trust:

`Telegram.WebApp.initDataUnsafe`

for authoritative identity.

Use and validate:

`Telegram.WebApp.initData`

on the server.

Never expose Telegram bot secrets or Supabase service-role secrets to the browser.

---

## NON-NEGOTIABLE ANTI-MOCK RULE

Production must never depend on:

- fake players
- fake leaderboard entries
- fake score results
- fake resources
- fake battle completion
- fake rewards

Static game definitions such as campaign chapters and trivia questions are legitimate seed content.

Development fixtures may exist only behind explicit development configuration.

---

## NON-NEGOTIABLE VISUAL RULE

Do not flatten or replace the existing design with a generic template.

First inspect the current project and preserve:

- color language
- typography hierarchy
- visual motifs
- layout strengths
- animations
- game identity

Enhance them.

---

## NON-NEGOTIABLE HISTORICAL RULE

The game is inspired by Adwa and the Ethiopian resistance era.

Keep the setting historical and educational.

Do not introduce:

- contemporary Ethiopian politics
- current ethnic conflict
- partisan political material

Use fictional/campaign-based regiments.

Historical claims require:

`NEEDS HISTORIAN REVIEW`

metadata/comment markers until reviewed.

No fabricated quotations.

---

## NON-NEGOTIABLE COMBAT RULE

Combat is stylized.

The main active battle mechanic is a fast reaction/target system:

- enemies/targets pop up
- player taps/clicks
- combos matter
- accuracy matters
- objectives matter
- time matters

No gore.

No realistic injury simulation.

---

# 77. IMPLEMENTATION PRIORITY

Always work in this order unless repository conditions justify a different order:

### P0
Inspect and understand the existing application.

### P1
Make Telegram authentication real.

### P2
Make player creation/state persistence real.

### P3
Make camp resources real.

### P4
Make one battle fully interactive.

### P5
Make battle result authoritative.

### P6
Make reward/progression persistence real.

### P7
Extend campaign.

### P8
Add trivia.

### P9
Add leaderboard.

### P10
Add referrals.

### P11
Add regiments.

### P12
Add achievements/events.

Do not build ten UI screens before one complete vertical slice works.

---

# 78. ACCEPTANCE TEST FOR THE FIRST VERTICAL SLICE

A completely fresh Telegram user should be able to:

1. open the Mini App
2. be authenticated through validated Telegram data
3. be created as a real player
4. see a persistent camp
5. see real resources from the database
6. choose the first campaign stage
7. create a real battle session
8. enter an active Phaser battle
9. hit targets
10. see immediate visual feedback
11. finish the battle
12. submit results
13. have the server validate the result
14. receive real rewards
15. see the rewards persisted after reload
16. unlock progression
17. reopen the app later and see the same progression

If this does not work, do not move to cosmetic expansion.

---

# 79. CODING STYLE

Use:

- strict TypeScript
- modular services
- typed API contracts
- small functions
- meaningful names
- centralized constants
- migrations for schema
- environment variable validation
- error boundaries
- reusable components
- comments only where they explain non-obvious reasoning

Avoid:

- `any`
- giant components
- hidden side effects
- duplicated game constants
- direct DOM manipulation from React unless deliberate
- direct table writes for sensitive state
- magic numbers
- untracked dependency proliferation

---

# 80. DATA FLOW PATTERN

Preferred pattern:

```text
Telegram
   ↓
Mini App
   ↓
Authenticated session
   ↓
React UI / Phaser
   ↓
Game API / Edge Function
   ↓
PostgreSQL transaction
   ↓
Authoritative result
   ↓
Realtime/UI reconciliation
```

---

# 81. DEVELOPMENT WORKFLOW

When given a task:

### First

Inspect the code.

### Second

State the exact files/modules involved.

### Third

Implement the smallest complete production-safe change.

### Fourth

Run type checking/lint/tests.

### Fifth

Verify database migration and RLS impact.

### Sixth

Test the user flow.

### Seventh

Report:

- what changed
- what is now real
- what remains
- tests performed
- known limitations

Never hide incomplete work.

---

# 82. WHEN A FEATURE IS DIFFICULT

Do not replace difficult requirements with fake UI.

Instead:

1. simplify the implementation
2. keep the real data flow
3. use a smaller first version
4. preserve extensibility

Example:

Bad:

> Make the leaderboard look live by adding sample users.

Good:

> Implement real leaderboard queries and show an honest empty/early-stage state.

---

# 83. CURRENT PROJECT TRANSITION

The project is moving from:

**MVP/scaffold mindset**

to:

**production vertical-slice mindset**

That means the next work should focus less on adding screens and more on making the existing screens truthful.

The key question for every feature is:

> "Does this feature actually work for a real Telegram user after a refresh, reconnect, and server reconciliation?"

If not, it is not complete.

---

# 84. FINAL PRODUCT VISION

The finished game should feel like:

> A polished Ethiopian historical action game living natively inside Telegram.

A player should be able to:

- open Telegram
- enter their patriot camp
- see their actual progression
- prepare for a campaign
- enter a lively battle
- actively hit targets
- feel the impact of their decisions
- receive persistent rewards
- learn a piece of Ethiopian history
- upgrade their camp
- compete with real players
- join a real regiment
- invite real friends
- return the next day and continue exactly where they left off

The game should remain:

- historically respectful
- culturally coherent
- visually distinctive
- low-bandwidth friendly
- mobile optimized
- free-first
- secure
- scalable
- honest about real user activity

Most importantly:

**Do not build a beautiful imitation of a game. Build the actual game.**

---

# 85. OFFICIAL TECH REFERENCES

Telegram Mini Apps:
https://core.telegram.org/bots/webapps

Supabase Edge Functions:
https://supabase.com/docs/guides/functions

Supabase Edge Function Auth:
https://supabase.com/docs/guides/functions/auth

Supabase Realtime:
https://supabase.com/docs/guides/realtime

Supabase Realtime Authorization:
https://supabase.com/docs/guides/realtime/authorization

---

# 86. HANDOFF INSTRUCTION

Whenever another AI agent takes over this repository, give it this document first.

Then instruct it:

> "Inspect the existing repository and treat this document as the production product context. Do not rebuild from scratch unless the current architecture is irreparably unsuitable. Identify the existing implemented portions, determine which parts are mock/simulated, and continue from the current state. Preserve visual appeal. Prioritize a complete real vertical slice from Telegram authentication through active battle through authoritative persistent rewards before broadening the feature set."

