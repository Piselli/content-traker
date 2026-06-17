# Content Tracker

Personal X (@piselliii) habit tracker — **Done → log → weekly norm progress + ideas**.

Not related to MoveMatch / ffl-moves.

## Features

- 8 habit types with **Done** + **Undo**
- **Weekly norm** progress (4/7, ✓ norm, over limit)
- 7-day activity dots per habit
- Activity log (calendar-style)
- Ideas backlog
- Export / Import JSON backup (localStorage)

## Run locally

```bash
cd content-tracker
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy (Vercel)

1. Push to GitHub (new repo `content-tracker`)
2. [vercel.com](https://vercel.com) → Import repo → Deploy
3. Optional: Vercel **Deployment Protection** (password) — personal data stays private

Data lives in **browser localStorage** — each device has its own data unless you export/import.

## Weekly norms

| Type | Norm |
|------|------|
| hot topic | 7+ |
| meme | 5+ |
| useful | 2+ |
| bait | 2–4 |
| provocative | 2 |
| strategic QT | 3–5 |
| builder | ≤2 |
| meta reach | ≤1 |

Edit `src/lib/norms.ts` to change.

## Project structure

```
src/
├── app/           # Next.js pages
├── components/    # UI
├── hooks/         # useTracker
└── lib/           # types, norms, storage, week utils
```
