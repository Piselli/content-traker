# Judgment Record — DEPRECATED

**Status (2026-08-11): retired.** Do not require Judgment Records before posts. They slow content generation; agents must not prompt for `decision` / `prediction` / `reviewAt`.

File kept as archive only. Active agent contract: `.cursor/rules/project.mdc` (logging + ideas + radar).

---

~~Інфраструктура Judgment OS. Це **не** knowledge base і **не** BELIEFS.~~

Один запис = одна ставка на власне судження.  
Якщо немає прогнозу й дати перевірки — запис не першого класу (система його не приймає).

Агент у цьому циклі: не бібліотекар, а учасник. Допомагає зафіксувати ставку, вчасно відкрити review і жорстко запитати, **де судження помилкове сьогодні**.

---

## Життєвий цикл

```
decide → predict → act → (чекати reviewAt) → score outcome → update judgment
```

Запис народжується на `decide/predict`.  
Закривається тільки після `review`.  
Canon/переконання (якщо колись з’являться) — лише побічний продукт закритих review, ніколи навпаки.

---

## Схема запису (v0)

Мінімум полів. Кожне поле або крутить цикл, або його немає.

```ts
type JudgmentRecord = {
  /** Стабільний id: jr-YYYYMMDD-short */
  id: string;

  /** Коли зафіксовано ставку */
  at: string; // ISO

  /** Що вирішую зробити / не зробити / прийняти як робочу тезу */
  decision: string;

  /**
   * Що очікую побачити в реальності.
   * Має бути перевірюваним. Не настрій, не «зайде».
   */
  prediction: string;

  /** Коли зобов’язаний перевірити. Без цього запис невалідний. */
  reviewAt: string; // ISO

  /**
   * Наскільки я впевнений у prediction (калібрування).
   * 50 = монета; 90 = майже впевнений.
   */
  confidence: 50 | 60 | 70 | 80 | 90;

  /** open = чекає фідбеку; reviewed = цикл закрито */
  status: "open" | "reviewed";

  /** Опційно: артефакт дії (твіт тощо). Evidence, не суть запису. */
  evidenceUrl?: string;

  // --- заповнюється тільки на review ---

  /** Що сталось фактом (коротко, з числами/receipts якщо є) */
  outcome?: string;

  /**
   * Наскільки outcome розійшовся з prediction.
   * expected = в межах ставки; surprise = суд треба чіпати.
   */
  result?: "expected" | "surprise";

  /** Одне речення: що міняю в судженні після цього */
  judgmentUpdate?: string;

  reviewedAt?: string; // ISO
};
```

### Правила валідності

1. `decision` + `prediction` + `reviewAt` + `confidence` обов’язкові при створенні.
2. `prediction` без критерію перевірки → відхилити («зайде» / «буде дискусія» без метрики — сміття).
3. `status: reviewed` потребує `outcome` + `result` + `judgmentUpdate` + `reviewedAt`.
4. Немає окремого поля «belief»: оновлення суду живе в `judgmentUpdate`.
5. Немає типів твітів / норм / buckets — це ops/tracker, інший шар.

---

## Приклади (достатньо сильні / слабкі)

**Сильний**
```json
{
  "id": "jr-20260712-tenev",
  "at": "2026-07-12T01:00:00.000Z",
  "decision": "Ship one-tweet thesis: Robinhood volumes prove illusion-of-earn onboarding, not RWA demand",
  "prediction": "24h: ≥8 replies that argue the mechanism (not just emoji); RPV ≥12; no pile-on from outside CT/finance lane",
  "reviewAt": "2026-07-13T01:00:00.000Z",
  "confidence": 70,
  "status": "open",
  "evidenceUrl": "https://x.com/piselliii/status/…"
}
```

**Слабкий (відхилити)**
```json
{
  "decision": "Постити про меми",
  "prediction": "Зайде",
  "reviewAt": "коли-небудь"
}
```

---

## Контракт агента

| Момент | Агент робить | Агент не робить |
|--------|--------------|-----------------|
| Перед дією | Вимагає `prediction` + `reviewAt` + `confidence`, б’є слабкі формулювання | Не вигадує твою ставку за тебе мовчки |
| Під час очікування | Нагадує про due review | Не «оновлює» outcome заздалегідь |
| На review | Порівнює prediction vs evidence; питає: expected чи surprise?; вимагає `judgmentUpdate` | Не пише тобі нову особистість; не авто-промоутить у BELIEFS |
| Після review | Може запропонувати *кандидат* на принцип, якщо surprise повторився N разів | Не створює canon без твого OK |

Критерій першого класу для будь-якого іншого файла в системі:  
**чи змушує він зробити прогноз, перевірити його й оновити судження?**  
Агентські контракти й ops-доки — виняток: інфраструктурний шар, не judgment-шар.

---

## Зв’язок з Content Tracker

- Tracker = датчик (що запостили, views/replies).
- Judgment Record = бухгалтерія ставки.
- Зв’язок лише через опційний `evidenceUrl` (той самий tweet URL).
- Норми/типи **не** підміняють prediction. Можна влучити в норму й провалити ставку.

---

## Що свідомо відсутнє у v0

- Таксономія доменів, тегів, «framework links»
- Окремий BELIEFS store
- Скорингові формули / Brier UI
- Багато статусів workflow
- AI employees org chart

Спочатку один запис має вижити в реальному тижні. Якщо так — облік, нагадування й калібрування наростуть навколо нього. Якщо ні — не роздувати систему.
