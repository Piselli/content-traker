# Cursor — окремий проект

## 1. Відкрий тільки content-tracker

**Варіант A (рекомендую):**

1. Cursor → **File → New Window**
2. **File → Open Folder…**
3. Обери: `~/Desktop/content-tracker`
4. Закрий або лиш у другому вікні `ffl-moves` — не змішуй

**Варіант B — workspace file:**

1. **File → Open Workspace from File…**
2. Обери `content-tracker.code-workspace` у цій папці

---

## 2. Що вже налаштовано в репо

| Файл | Навіщо |
|------|--------|
| `.cursor/rules/project.mdc` | Agent **завжди** знає контекст проекту |
| `AGENTS.md` | Технічний guide для агента |
| `JARVIS.md` | X контент-стратегія (не код) |
| `docs/NEW-CHAT.md` | Перше повідомлення для нового чату |

Rules підхоплюються автоматично — **не треба** paste project context для коду.

---

## 3. Два типи чатів у Cursor

### A) Код (tracker, UI, features)

Новий чат у workspace `content-tracker`. Можеш просто писати:

> додай поле notes до log  
> зміни norm для meme на 6

Agent прочитає rules + AGENTS.md.

### B) X контент (твіти, PICK, polish)

Новий чat → paste **`docs/NEW-CHAT.md`** (або `JARVIS.md` якщо тільки контент).

Attach **`jarvis-week-*.json`** з кнопки **Copy for Jarvis** на сайті.

---

## 4. Dev + live

```bash
npm run dev          # localhost:3000
git push             # auto deploy Vercel
```

Live: https://content-tracker-vert.vercel.app

---

## 5. Не плутати з ffl-moves

| | content-tracker | ffl-moves |
|---|-----------------|-----------|
| Що | personal X habits | MoveMatch product |
| Folder | ~/Desktop/content-tracker | ~/Desktop/ffl-moves |
| Cursor window | окреме | окреме |
