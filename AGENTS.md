# Content Tracker — Agent guide

## What this repo is

Personal **X (@piselliii) content habit tracker** — weekly norms, Done logging, ideas, Jarvis export.

**Separate from** `ffl-moves` / MoveMatch. Do not merge repos or share deploy.

## Quick start

```bash
npm install
npm run dev   # http://localhost:3000
npm run build
```

## Architecture

```
src/app/page.tsx          → Dashboard
src/components/           → HabitCard, ActivityLog, IdeasPanel, WeekSummary
src/hooks/useTracker.ts   → localStorage CRUD
src/lib/norms.ts          → weekly norm definitions
src/lib/storage.ts        → piselli-content-tracker-v1 key
JARVIS.md                 → paste into Cursor chat for tweet strategy
docs/NEW-CHAT.md          → full first-message prompt for new chats
```

## Deploy

- GitHub: `Piselli/content-traker` (typo in name)
- Vercel project: `content-tracker`
- Production: https://content-tracker-vert.vercel.app

## Common tasks

| Task | Where |
|------|--------|
| Change norms | `src/lib/norms.ts` |
| New habit type | `src/lib/types.ts` CONTENT_TYPES + norms + styles |
| Jarvis prompt | `JARVIS.md` |
| User onboarding | `docs/CURSOR.md` |

## Data model

```ts
LogEntry { id, type, at, tweetUrl?, views?, likes?, note? }
Idea { id, text, type?, createdAt }
```

Stored in browser localStorage only.
