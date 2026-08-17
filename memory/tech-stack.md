---
name: tech-stack
description: Technology stack and infrastructure choices for Zemene Arbedech
metadata:
  type: reference
---

**Frontend:** HTML5 + JavaScript using Phaser.js for battle/camp scenes, plain DOM/CSS for menus and trivia screens
**Telegram integration:** Telegram WebApp JS SDK (@telegram-apps/sdk or @twa-dev/sdk), authenticate users via Telegram initData validation
**Backend:** Supabase (Postgres + Auth + Row Level Security) — free tier
**Hosting:** static frontend on Vercel or Netlify; backend logic as Supabase Edge Functions where needed
**i18n:** JSON-based translation files for Amharic (am.json) and English (en.json), using Noto Sans Ethiopic web font for Amharic text rendering
**Art assets:** Kenney.nl (free game asset packs), itch.io free sprite packs, custom flag/banner icons (simple, cheap to commission locally later)
**Build acceleration:** Claude Code, Cursor, or bolt.new/v0 for scaffolding the Mini App shell, Phaser scenes, and Supabase schema from a prompt
**Version control / CI:** GitHub (free) + GitHub Actions free tier for basic build checks
**In-app currency:** Telegram Stars via Telegram's native payments API
**Payments:** Chapa API (Telebirr, CBE Birr, cards) — for cosmetic purchases and later cash-prize payouts
**No payment integration in Phase 1** — cosmetic/point rewards only