---
name: data-model
description: Supabase database schema for Zemene Arbegnoch
metadata:
  type: reference
---

**players table:**
- id (uuid, primary key)
- telegram_id (bigint, unique) — Telegram user ID from initData
- display_name (text)
- language_pref (text, default 'am') — 'am' or 'en'
- resources (jsonb) — { fighters: number, provisions: number, morale: number }
- score (bigint, default 0)
- referred_by (uuid, foreign key to players.id, nullable)
- created_at (timestamptz, default now())

**campaign_progress table:**
- id (uuid, primary key)
- player_id (uuid, foreign key to players.id)
- chapter_id (text) — e.g., "chapter-1", "chapter-2"
- completed_at (timestamptz, default now())
- result (text) — 'victory' | 'defeat'
- UNIQUE(player_id, chapter_id)

**trivia_bank table:**
- id (uuid, primary key)
- question_am (text) — Amharic question text
- question_en (text) — English question text
- options_am (jsonb) — array of 4 Amharic option strings
- options_en (jsonb) — array of 4 English option strings
- correct_index (smallint) — 0-3
- source_note (text, nullable) — citation for historian review

**referrals table:**
- id (uuid, primary key)
- inviter_id (uuid, foreign key to players.id)
- invitee_id (uuid, foreign key to players.id)
- created_at (timestamptz, default now())
- UNIQUE(inviter_id, invitee_id)