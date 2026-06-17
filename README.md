# Content Tracker

Personal X (@piselliii) habit tracker — **Done → log → weekly norm progress + ideas**.

**Not related to MoveMatch / ffl-moves.**

Live: **https://content-tracker-vert.vercel.app**

## Cursor (окремий проект)

1. **File → New Window → Open Folder** → `~/Desktop/content-tracker`
2. Rules в `.cursor/rules/` — agent знає контекст автоматично
3. Новий чат для **твітів**: paste `docs/NEW-CHAT.md`
4. Деталі: **`docs/CURSOR.md`**

## Features

- 8 habit types · Done / − / + · count 1–20
- Weekly norm progress · 7-day dots
- Tweet URL + views/likes (manual)
- Ideas backlog · Backup · **Copy for Jarvis**
- localStorage (per browser)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy

Push to `github.com/Piselli/content-traker` → Vercel auto-deploy.

## Weekly norms

Edit `src/lib/norms.ts`:

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

## Docs

| File | Purpose |
|------|---------|
| `docs/CURSOR.md` | Як відкрити окремо в Cursor |
| `docs/NEW-CHAT.md` | Paste у новий чат (контент + код) |
| `JARVIS.md` | Скорочена X-стратегія |
| `AGENTS.md` | Guide для coding agent |
