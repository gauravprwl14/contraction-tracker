# Baby Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-first newborn feeding and diaper tracker to the existing contraction tracker app, with both apps switchable from one shell.

**Architecture:** The existing contraction app moves into `src/features/contractions/` unchanged. New baby code lives in `src/features/baby/`. All timing logic is extracted into pure functions in `feedLogic.js` and `utils/dates.js` so it can be unit-tested without React. Two hooks (`useFeedStore`, `useDiaperStore`) own state, persistence, and derived stats; components only render. Charts are hand-rolled SVG — no chart library.

**Tech Stack:** React 19, Vite 8, Vitest (new), plain CSS, localStorage. No router, no chart library, no backend.

## Global Constraints

- No new runtime dependencies. Vitest is a devDependency only.
- No network calls. The app must work fully offline.
- All storage keys are versioned: `{ version: 1, items: [...] }`.
- Timestamps are stored as ms epoch integers. Durations are derived, never stored.
- Elapsed time is always recomputed from timestamps against `Date.now()`. Never accumulate by counting ticks.
- Every record field is editable after the fact, including date and time.
- Mobile-first: touch targets at least 44px tall, no hover-only affordances, no horizontal page scroll.
- The contraction tracker's behaviour and its `contraction_tracker_data` storage key must not change.
- Follow existing code style: named exports for components and hooks, default export for `App`, `crypto.randomUUID()` for ids, BEM-ish class names (`block__element--modifier`).
- Commit after every task.

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `vitest.config.js` | Test runner config |
| `src/test/localStorageMock.js` | In-memory localStorage for tests |
| `src/utils/storage.js` | Versioned localStorage load/save, corrupt-data backup |
| `src/utils/dates.js` | Day bucketing, day keys, gap math |
| `src/features/contractions/ContractionsApp.jsx` | Today's `App.jsx` body, moved |
| `src/features/contractions/contractions.css` | Contraction-specific styles |
| `src/styles/base.css` | Shared tokens, reset, buttons, sheets, tabs |
| `src/features/baby/feedLogic.js` | Pure feed/session/stat functions |
| `src/features/baby/diaperLogic.js` | Pure diaper stat functions |
| `src/features/baby/hooks/useFeedStore.js` | Feed state, persistence, derived stats |
| `src/features/baby/hooks/useDiaperStore.js` | Diaper state, persistence, derived stats |
| `src/features/baby/BabyApp.jsx` | Bottom tabs: Home / Charts / Log |
| `src/features/baby/components/HomeScreen.jsx` | Banner, action buttons, today summary, recent list |
| `src/features/baby/components/BreastFeedSheet.jsx` | Per-side timer sheet |
| `src/features/baby/components/ExternalFeedSheet.jsx` | Bottle/milk/quantity sheet |
| `src/features/baby/components/QuantityPicker.jsx` | Preset chips + ±10 stepper |
| `src/features/baby/components/LogTab.jsx` | Full history, grouped by day |
| `src/features/baby/components/EditSheet.jsx` | Edit any record type |
| `src/features/baby/components/Toast.jsx` | Confirm + undo toast |
| `src/features/baby/components/ChartsTab.jsx` | Chart tab container |
| `src/features/baby/components/charts/TimelineStrip.jsx` | 24h timeline |
| `src/features/baby/components/charts/FeedGapChart.jsx` | Gap between feeds |
| `src/features/baby/components/charts/DailyTotalsChart.jsx` | Daily totals bars |
| `src/features/baby/components/charts/SideBalanceChart.jsx` | Left/right balance |
| `src/features/baby/backup.js` | JSON/CSV export, JSON import |
| `src/features/baby/baby.css` | Baby-specific styles |

**Modified:**

- `src/App.jsx` — becomes a thin shell with a Baby/Contractions mode switch
- `src/main.jsx` — import `./styles/base.css` instead of `./index.css`
- `package.json` — add `vitest`, `test` script

**Deleted:** `src/App.css` (split), `src/index.css` (folded into `base.css`)

**Moved:** `src/components/*.jsx` → `src/features/contractions/components/`, `src/hooks/useContractionStore.js` → `src/features/contractions/hooks/`

---

### Task 1: Test infrastructure and storage utility

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/test/localStorageMock.js`
- Create: `src/utils/storage.js`
- Test: `src/utils/storage.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `loadItems(key: string): object[]` — returns `[]` on missing or corrupt data
  - `saveItems(key: string, items: object[]): void` — writes `{version:1, items}`
  - `loadValue(key: string, fallback: T): T` — for non-list values
  - `saveValue(key: string, value: unknown): void`
  - `installLocalStorageMock(): void` — test helper, resets storage

- [ ] **Step 1: Add Vitest**

```bash
npm install --save-dev vitest@^3
```

Then add to `package.json` `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

Node environment is deliberate — we test pure logic and stub `localStorage` ourselves, so jsdom is not needed.

- [ ] **Step 3: Create the localStorage mock**

`src/test/localStorageMock.js`:

```js
export function installLocalStorageMock() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  return globalThis.localStorage;
}
```

- [ ] **Step 4: Write the failing tests**

`src/utils/storage.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorageMock } from '../test/localStorageMock';
import { loadItems, saveItems, loadValue, saveValue } from './storage';

describe('storage', () => {
  beforeEach(() => installLocalStorageMock());

  it('returns an empty array when the key is missing', () => {
    expect(loadItems('nope')).toEqual([]);
  });

  it('round-trips items', () => {
    const items = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];
    saveItems('k', items);
    expect(loadItems('k')).toEqual(items);
  });

  it('writes a versioned envelope', () => {
    saveItems('k', [{ id: 'a' }]);
    expect(JSON.parse(localStorage.getItem('k'))).toEqual({
      version: 1,
      items: [{ id: 'a' }],
    });
  });

  it('returns an empty array for corrupt JSON', () => {
    localStorage.setItem('k', '{not json');
    expect(loadItems('k')).toEqual([]);
  });

  it('backs up corrupt data instead of discarding it', () => {
    localStorage.setItem('k', '{not json');
    loadItems('k');
    expect(localStorage.getItem('k__corrupt_backup')).toBe('{not json');
  });

  it('reads a bare legacy array', () => {
    localStorage.setItem('k', JSON.stringify([{ id: 'a' }]));
    expect(loadItems('k')).toEqual([{ id: 'a' }]);
  });

  it('returns an empty array when items is not an array', () => {
    localStorage.setItem('k', JSON.stringify({ version: 1, items: 'oops' }));
    expect(loadItems('k')).toEqual([]);
  });

  it('round-trips a plain value', () => {
    saveValue('v', { a: 1 });
    expect(loadValue('v', null)).toEqual({ a: 1 });
  });

  it('returns the fallback for a missing or corrupt value', () => {
    expect(loadValue('v', 'fb')).toBe('fb');
    localStorage.setItem('v', '{bad');
    expect(loadValue('v', 'fb')).toBe('fb');
  });
});
```

- [ ] **Step 5: Run the tests and verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./storage`

- [ ] **Step 6: Implement `src/utils/storage.js`**

```js
const VERSION = 1;

function backupCorrupt(key, raw) {
  try {
    localStorage.setItem(`${key}__corrupt_backup`, raw);
  } catch {
    // storage full — nothing useful we can do
  }
}

export function loadItems(key) {
  const raw = localStorage.getItem(key);
  if (raw == null) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    backupCorrupt(key, raw);
    return [];
  }
  if (Array.isArray(parsed)) return parsed; // legacy bare array
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

export function saveItems(key, items) {
  localStorage.setItem(key, JSON.stringify({ version: VERSION, items }));
}

export function loadValue(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    backupCorrupt(key, raw);
    return fallback;
  }
}

export function saveValue(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
```

- [ ] **Step 7: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS, 9 tests

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/test src/utils/storage.js src/utils/storage.test.js
git commit -m "feat: add vitest and versioned storage utility"
```

---

### Task 2: Date utilities

**Files:**
- Create: `src/utils/dates.js`
- Test: `src/utils/dates.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `startOfDay(ts: number): number`
  - `endOfDay(ts: number): number`
  - `dayKey(ts: number): string` — local `YYYY-MM-DD`
  - `addDays(ts: number, n: number): number`
  - `isSameDay(a: number, b: number): boolean`
  - `groupByDay(items: T[], getTime: (item: T) => number): Array<{ key: string, dayStart: number, items: T[] }>` — newest day first, items preserved in input order
  - `formatDayLabel(ts: number, now: number): string` — `'Today' | 'Yesterday' | 'Mon 3 Aug'`
  - `toDateInputValue(ts: number): string` — `YYYY-MM-DD` for `<input type="date">`
  - `toTimeInputValue(ts: number): string` — `HH:MM` for `<input type="time">`
  - `fromDateTimeInputs(dateStr: string, timeStr: string): number` — ms epoch, local

Every record is attributed to the day it **started**. `groupByDay` is the single place that decision lives.

- [ ] **Step 1: Write the failing tests**

`src/utils/dates.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  startOfDay, endOfDay, dayKey, addDays, isSameDay,
  groupByDay, formatDayLabel, toDateInputValue, toTimeInputValue,
  fromDateTimeInputs,
} from './dates';

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();

describe('dates', () => {
  it('startOfDay strips the time', () => {
    expect(startOfDay(at(2026, 8, 3, 14, 30))).toBe(at(2026, 8, 3, 0, 0));
  });

  it('endOfDay is the last millisecond of the day', () => {
    expect(endOfDay(at(2026, 8, 3, 14, 30))).toBe(at(2026, 8, 4, 0, 0) - 1);
  });

  it('dayKey formats as local YYYY-MM-DD', () => {
    expect(dayKey(at(2026, 8, 3, 23, 59))).toBe('2026-08-03');
    expect(dayKey(at(2026, 1, 9, 0, 1))).toBe('2026-01-09');
  });

  it('addDays moves forward and backward', () => {
    expect(addDays(at(2026, 8, 3), 1)).toBe(at(2026, 8, 4));
    expect(addDays(at(2026, 8, 1), -1)).toBe(at(2026, 7, 31));
  });

  it('isSameDay compares local calendar days', () => {
    expect(isSameDay(at(2026, 8, 3, 0, 1), at(2026, 8, 3, 23, 59))).toBe(true);
    expect(isSameDay(at(2026, 8, 3, 23, 59), at(2026, 8, 4, 0, 1))).toBe(false);
  });

  it('groups by the day an item started, newest day first', () => {
    const items = [
      { t: at(2026, 8, 4, 1, 0) },
      { t: at(2026, 8, 3, 23, 50) },
      { t: at(2026, 8, 3, 9, 0) },
    ];
    const groups = groupByDay(items, (i) => i.t);
    expect(groups.map((g) => g.key)).toEqual(['2026-08-04', '2026-08-03']);
    expect(groups[1].items).toHaveLength(2);
    expect(groups[0].dayStart).toBe(at(2026, 8, 4));
  });

  it('groups an empty list to an empty array', () => {
    expect(groupByDay([], (i) => i.t)).toEqual([]);
  });

  it('a feed starting before midnight belongs to the starting day', () => {
    const feed = { startTime: at(2026, 8, 3, 23, 40), endTime: at(2026, 8, 4, 0, 10) };
    const groups = groupByDay([feed], (f) => f.startTime);
    expect(groups[0].key).toBe('2026-08-03');
  });

  it('labels today and yesterday', () => {
    const now = at(2026, 8, 3, 12, 0);
    expect(formatDayLabel(at(2026, 8, 3, 2, 0), now)).toBe('Today');
    expect(formatDayLabel(at(2026, 8, 2, 22, 0), now)).toBe('Yesterday');
    expect(formatDayLabel(at(2026, 7, 30), now)).not.toMatch(/Today|Yesterday/);
  });

  it('formats values for date and time inputs', () => {
    expect(toDateInputValue(at(2026, 8, 3, 7, 5))).toBe('2026-08-03');
    expect(toTimeInputValue(at(2026, 8, 3, 7, 5))).toBe('07:05');
  });

  it('parses date and time inputs back to the same instant', () => {
    const ts = at(2026, 8, 3, 7, 5);
    expect(fromDateTimeInputs('2026-08-03', '07:05')).toBe(ts);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- src/utils/dates.test.js`
Expected: FAIL — cannot resolve `./dates`

- [ ] **Step 3: Implement `src/utils/dates.js`**

```js
const DAY_MS = 86400000;

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts) {
  return addDays(startOfDay(ts), 1) - 1;
}

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Calendar-aware so DST transitions don't drift the result.
export function addDays(ts, n) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function isSameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

export function groupByDay(items, getTime) {
  const map = new Map();
  for (const item of items) {
    const ts = getTime(item);
    const key = dayKey(ts);
    if (!map.has(key)) map.set(key, { key, dayStart: startOfDay(ts), items: [] });
    map.get(key).items.push(item);
  }
  return Array.from(map.values()).sort((a, b) => b.dayStart - a.dayStart);
}

export function formatDayLabel(ts, now = Date.now()) {
  const today = startOfDay(now);
  const day = startOfDay(ts);
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return new Date(ts).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function toDateInputValue(ts) {
  return dayKey(ts);
}

export function toTimeInputValue(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeInputs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0).getTime();
}

export { DAY_MS };
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS — storage and dates suites both green

- [ ] **Step 5: Commit**

```bash
git add src/utils/dates.js src/utils/dates.test.js
git commit -m "feat: add date utilities with day-of-start bucketing"
```

---

### Task 3: Restructure the shell and add the mode switch

No new behaviour. The contraction tracker must look and work exactly as before.

**Files:**
- Create: `src/features/contractions/ContractionsApp.jsx` (from today's `src/App.jsx` body)
- Move: `src/components/*.jsx` → `src/features/contractions/components/`
- Move: `src/hooks/useContractionStore.js` → `src/features/contractions/hooks/useContractionStore.js`
- Create: `src/styles/base.css`, `src/features/contractions/contractions.css`
- Modify: `src/App.jsx`, `src/main.jsx`
- Delete: `src/App.css`, `src/index.css`

**Interfaces:**
- Consumes: `loadValue`, `saveValue` from Task 1
- Produces: `<ContractionsApp />` default-exported from `src/features/contractions/ContractionsApp.jsx`; `App.jsx` renders the mode switch and one feature at a time

- [ ] **Step 1: Move files with git**

```bash
mkdir -p src/features/contractions/components src/features/contractions/hooks src/styles
git mv src/components/TimerButton.jsx src/components/StatsBar.jsx \
       src/components/ContractionGraph.jsx src/components/ContractionList.jsx \
       src/features/contractions/components/
git mv src/hooks/useContractionStore.js src/features/contractions/hooks/
rmdir src/components src/hooks
```

- [ ] **Step 2: Fix imports in the moved files**

In all four moved components, `import { formatDuration } from '../utils/format'` becomes `'../../../utils/format'`. Check each file — `TimerButton.jsx`, `StatsBar.jsx`, `ContractionGraph.jsx`, and `ContractionList.jsx` all import from `../utils/format`.

- [ ] **Step 3: Create `ContractionsApp.jsx`**

Move the entire current body of `src/App.jsx` — the `exportCSV` function and the `App` component — into `src/features/contractions/ContractionsApp.jsx`. Rename the component to `ContractionsApp`, keep it as the default export, and change the imports to:

```js
import { useState } from 'react';
import { useContractionStore } from './hooks/useContractionStore';
import { TimerButton } from './components/TimerButton';
import { StatsBar } from './components/StatsBar';
import { ContractionGraph } from './components/ContractionGraph';
import { ContractionList } from './components/ContractionList';
import { formatTime, formatDate } from '../../utils/format';
import './contractions.css';
```

Remove the `<header>` and `<footer>` blocks and the outer `<div className="app">` — those move to the shell. `ContractionsApp` returns only the `<main className="app-main">…</main>` content. Keep everything inside it byte-identical.

Note `formatDuration` is not used in `App.jsx` itself — only import what is used, or ESLint will complain.

- [ ] **Step 4: Split the CSS**

Move from `src/App.css` into `src/styles/base.css`: the reset block, the `:root` custom properties, the `body` rule, and the `.app`, `.app-header`, `.app-title`, `.app-subtitle`, `.app-main`, `.app-footer`, `.tab-bar`, `.tab-btn` rules. Prepend the three rules from `src/index.css`.

Everything else in `App.css` — timer, stats, graph, history, list rules — moves verbatim to `src/features/contractions/contractions.css`.

Then:

```bash
git rm src/App.css src/index.css
```

- [ ] **Step 5: Update `src/main.jsx`**

Change `import './index.css'` to `import './styles/base.css'`.

- [ ] **Step 6: Rewrite `src/App.jsx` as the shell**

```jsx
import { useState, useEffect } from 'react';
import ContractionsApp from './features/contractions/ContractionsApp';
import BabyApp from './features/baby/BabyApp';
import { loadValue, saveValue } from './utils/storage';

const MODE_KEY = 'app_mode_v1';

export default function App() {
  const [mode, setMode] = useState(() => loadValue(MODE_KEY, 'baby'));

  useEffect(() => {
    saveValue(MODE_KEY, mode);
  }, [mode]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="mode-switch" role="tablist" aria-label="App mode">
          <button
            role="tab"
            aria-selected={mode === 'baby'}
            className={`mode-switch__btn ${mode === 'baby' ? 'mode-switch__btn--active' : ''}`}
            onClick={() => setMode('baby')}
          >
            Baby
          </button>
          <button
            role="tab"
            aria-selected={mode === 'contractions'}
            className={`mode-switch__btn ${mode === 'contractions' ? 'mode-switch__btn--active' : ''}`}
            onClick={() => setMode('contractions')}
          >
            Contractions
          </button>
        </div>
        <h1 className="app-title">
          {mode === 'baby' ? 'Baby Tracker' : 'Contraction Tracker'}
        </h1>
        <p className="app-subtitle">Offline · All data stays on your device</p>
      </header>

      {mode === 'baby' ? <BabyApp /> : <ContractionsApp />}

      <footer className="app-footer">
        All data stored locally in your browser. Nothing leaves this device.
      </footer>
    </div>
  );
}
```

- [ ] **Step 7: Create a placeholder `BabyApp` so the build runs**

`src/features/baby/BabyApp.jsx`:

```jsx
export default function BabyApp() {
  return <main className="app-main">Baby tracker coming up.</main>;
}
```

This is replaced wholesale in Task 7.

- [ ] **Step 8: Add mode-switch styles to `src/styles/base.css`**

```css
.mode-switch {
  display: flex;
  gap: 0.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.2rem;
  width: fit-content;
  margin: 0 auto 0.75rem;
}

.mode-switch__btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.8rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
}

.mode-switch__btn--active {
  background: var(--accent);
  color: #fff;
}
```

- [ ] **Step 9: Verify nothing regressed**

Run: `npm run lint && npm run build && npm test`
Expected: all pass, no unused-import warnings.

Then run `npm run dev`, open the app, switch to Contractions, and confirm: the timer starts and stops, existing history still loads from `contraction_tracker_data`, the graph renders, and Export CSV works.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: move contraction app into features/, add mode switch shell"
```

---

### Task 4: Feed logic — pure functions

All feed timing and stat math, with no React. This is where the bugs would otherwise hide.

**Files:**
- Create: `src/features/baby/feedLogic.js`
- Test: `src/features/baby/feedLogic.test.js`

**Interfaces:**
- Consumes: `startOfDay`, `dayKey`, `groupByDay`, `addDays` from `src/utils/dates`
- Produces:
  - `STALE_MS: number` (6h), `LONG_FEED_MS: number` (2h)
  - `createBreastSession(side: 'left'|'right', now: number): Active`
  - `createExternalSession(now: number, prefs: {milk, method}): Active`
  - `commitSide(active: Active, now: number): Active` — folds the running side's elapsed into `leftMs`/`rightMs`
  - `switchSide(active: Active, side: 'left'|'right', now: number): Active`
  - `sideElapsedMs(active: Active, side: 'left'|'right', now: number): number`
  - `finalizeBreastFeed(active: Active, now: number): Feed | null` — `null` when no side ever ran
  - `finalizeExternalFeed(active: Active, now: number): Feed`
  - `isStale(active: Active | null, now: number): boolean`
  - `feedDurationMs(feed: Feed): number`
  - `suggestedSide(feeds: Feed[]): 'left' | 'right'`
  - `lastExternalPrefs(feeds: Feed[]): { milk, method }`
  - `gapsBetweenFeeds(feeds: Feed[]): number[]` — ms, newest gap first
  - `todayFeedStats(feeds: Feed[], now: number): { feedCount, totalMl, breastMs }`
  - `dailyFeedTotals(feeds: Feed[], now: number, days: number): Array<{ key, dayStart, feedCount, totalMl, breastMs }>` — oldest first, gap days included as zeros
  - `sideBalance(feeds: Feed[], fromTs: number): { leftMs, rightMs }`

`Feed` shape is exactly as specified in the design doc. `feeds` arrays are always newest-first.

- [ ] **Step 1: Write the failing tests**

`src/features/baby/feedLogic.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  STALE_MS, createBreastSession, createExternalSession, commitSide, switchSide,
  sideElapsedMs, finalizeBreastFeed, finalizeExternalFeed, isStale, feedDurationMs,
  suggestedSide, lastExternalPrefs, gapsBetweenFeeds, todayFeedStats,
  dailyFeedTotals, sideBalance,
} from './feedLogic';

const MIN = 60000;
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();
const T0 = at(2026, 8, 3, 10, 0);

const breastFeed = (over) => ({
  id: 'f', type: 'breast', startTime: T0, endTime: T0 + 10 * MIN,
  leftMs: 6 * MIN, rightMs: 4 * MIN, lastSide: 'right', note: '', ...over,
});

const externalFeed = (over) => ({
  id: 'e', type: 'external', startTime: T0, endTime: T0 + 8 * MIN,
  milk: 'formula', method: 'bottle', offeredMl: 90, takenMl: 60, note: '', ...over,
});

describe('session lifecycle', () => {
  it('creates a breast session with the chosen side running', () => {
    const a = createBreastSession('left', T0);
    expect(a).toMatchObject({
      type: 'breast', startTime: T0, activeSide: 'left',
      sideStartedAt: T0, leftMs: 0, rightMs: 0,
    });
  });

  it('accumulates elapsed time on the running side only', () => {
    const a = createBreastSession('left', T0);
    expect(sideElapsedMs(a, 'left', T0 + 5 * MIN)).toBe(5 * MIN);
    expect(sideElapsedMs(a, 'right', T0 + 5 * MIN)).toBe(0);
  });

  it('preserves the first side time when switching', () => {
    let a = createBreastSession('left', T0);
    a = switchSide(a, 'right', T0 + 8 * MIN);
    expect(a.leftMs).toBe(8 * MIN);
    expect(a.activeSide).toBe('right');
    expect(a.sideStartedAt).toBe(T0 + 8 * MIN);
    expect(sideElapsedMs(a, 'left', T0 + 12 * MIN)).toBe(8 * MIN);
    expect(sideElapsedMs(a, 'right', T0 + 12 * MIN)).toBe(4 * MIN);
  });

  it('accumulates correctly across several switches', () => {
    let a = createBreastSession('left', T0);
    a = switchSide(a, 'right', T0 + 3 * MIN);
    a = switchSide(a, 'left', T0 + 5 * MIN);
    a = switchSide(a, 'right', T0 + 9 * MIN);
    expect(a.leftMs).toBe(7 * MIN);
    expect(a.rightMs).toBe(2 * MIN);
    expect(sideElapsedMs(a, 'right', T0 + 10 * MIN)).toBe(3 * MIN);
  });

  it('switching to the already-active side is a no-op on totals', () => {
    let a = createBreastSession('left', T0);
    a = switchSide(a, 'left', T0 + 4 * MIN);
    expect(a.leftMs).toBe(4 * MIN);
    expect(a.activeSide).toBe('left');
    expect(sideElapsedMs(a, 'left', T0 + 6 * MIN)).toBe(6 * MIN);
  });

  it('commitSide is idempotent at the same instant', () => {
    let a = createBreastSession('left', T0);
    a = commitSide(a, T0 + 5 * MIN);
    const twice = commitSide(a, T0 + 5 * MIN);
    expect(twice.leftMs).toBe(5 * MIN);
  });

  it('finalizes a breast feed with committed side times', () => {
    let a = createBreastSession('left', T0);
    a = switchSide(a, 'right', T0 + 6 * MIN);
    const feed = finalizeBreastFeed(a, T0 + 10 * MIN);
    expect(feed).toMatchObject({
      type: 'breast', startTime: T0, endTime: T0 + 10 * MIN,
      leftMs: 6 * MIN, rightMs: 4 * MIN, lastSide: 'right',
    });
    expect(feed.id).toBeTruthy();
  });

  it('does not save a breast feed where no side ever ran', () => {
    const a = { type: 'breast', startTime: T0, activeSide: null, sideStartedAt: null, leftMs: 0, rightMs: 0 };
    expect(finalizeBreastFeed(a, T0 + MIN)).toBeNull();
  });

  it('finalizes an external feed from its draft', () => {
    let a = createExternalSession(T0, { milk: 'expressed', method: 'spoon' });
    a = { ...a, draft: { ...a.draft, offeredMl: 90, takenMl: 75 } };
    const feed = finalizeExternalFeed(a, T0 + 8 * MIN);
    expect(feed).toMatchObject({
      type: 'external', startTime: T0, endTime: T0 + 8 * MIN,
      milk: 'expressed', method: 'spoon', offeredMl: 90, takenMl: 75,
    });
  });
});

describe('stale sessions', () => {
  it('is not stale inside the window', () => {
    expect(isStale(createBreastSession('left', T0), T0 + STALE_MS - 1)).toBe(false);
  });

  it('is stale past the window', () => {
    expect(isStale(createBreastSession('left', T0), T0 + STALE_MS + 1)).toBe(true);
  });

  it('a null session is never stale', () => {
    expect(isStale(null, T0)).toBe(false);
  });
});

describe('derived values', () => {
  it('derives duration from the timestamps', () => {
    expect(feedDurationMs(breastFeed())).toBe(10 * MIN);
  });

  it('suggests the opposite of the last side used', () => {
    expect(suggestedSide([breastFeed({ lastSide: 'right' })])).toBe('left');
    expect(suggestedSide([breastFeed({ lastSide: 'left' })])).toBe('right');
  });

  it('suggests left with no history and skips external feeds', () => {
    expect(suggestedSide([])).toBe('left');
    expect(suggestedSide([externalFeed(), breastFeed({ lastSide: 'left' })])).toBe('right');
  });

  it('recalls the last external preferences', () => {
    expect(lastExternalPrefs([externalFeed({ milk: 'expressed', method: 'syringe' })]))
      .toEqual({ milk: 'expressed', method: 'syringe' });
  });

  it('defaults external preferences with no history', () => {
    expect(lastExternalPrefs([])).toEqual({ milk: 'formula', method: 'bottle' });
  });

  it('measures gaps from the previous end to the next start', () => {
    const feeds = [
      breastFeed({ id: 'c', startTime: T0 + 200 * MIN, endTime: T0 + 210 * MIN }),
      breastFeed({ id: 'b', startTime: T0 + 100 * MIN, endTime: T0 + 110 * MIN }),
      breastFeed({ id: 'a', startTime: T0, endTime: T0 + 10 * MIN }),
    ];
    expect(gapsBetweenFeeds(feeds)).toEqual([90 * MIN, 90 * MIN]);
  });

  it('returns no gaps for zero or one feed', () => {
    expect(gapsBetweenFeeds([])).toEqual([]);
    expect(gapsBetweenFeeds([breastFeed()])).toEqual([]);
  });

  it("sums today's feeds by start day", () => {
    const now = at(2026, 8, 3, 20, 0);
    const feeds = [
      externalFeed({ id: '2', startTime: at(2026, 8, 3, 14, 0), endTime: at(2026, 8, 3, 14, 10), takenMl: 60 }),
      breastFeed({ id: '1', startTime: at(2026, 8, 3, 9, 0), endTime: at(2026, 8, 3, 9, 12) }),
      breastFeed({ id: '0', startTime: at(2026, 8, 2, 23, 50), endTime: at(2026, 8, 3, 0, 5) }),
    ];
    expect(todayFeedStats(feeds, now)).toEqual({
      feedCount: 2, totalMl: 60, breastMs: 10 * MIN,
    });
  });

  it('builds daily totals oldest-first including empty days', () => {
    const now = at(2026, 8, 3, 20, 0);
    const feeds = [externalFeed({ startTime: at(2026, 8, 3, 9, 0), endTime: at(2026, 8, 3, 9, 10), takenMl: 60 })];
    const rows = dailyFeedTotals(feeds, now, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0].key).toBe('2026-08-01');
    expect(rows[2].key).toBe('2026-08-03');
    expect(rows[0].feedCount).toBe(0);
    expect(rows[2].totalMl).toBe(60);
  });

  it('sums side balance from a cutoff', () => {
    const feeds = [
      breastFeed({ id: 'new', startTime: at(2026, 8, 3, 9, 0), leftMs: 6 * MIN, rightMs: 4 * MIN }),
      breastFeed({ id: 'old', startTime: at(2026, 7, 1, 9, 0), leftMs: 99 * MIN, rightMs: 99 * MIN }),
    ];
    expect(sideBalance(feeds, at(2026, 8, 1))).toEqual({ leftMs: 6 * MIN, rightMs: 4 * MIN });
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- src/features/baby/feedLogic.test.js`
Expected: FAIL — cannot resolve `./feedLogic`

- [ ] **Step 3: Implement `src/features/baby/feedLogic.js`**

```js
import { startOfDay, dayKey, addDays } from '../../utils/dates';

export const STALE_MS = 6 * 60 * 60 * 1000;
export const LONG_FEED_MS = 2 * 60 * 60 * 1000;

const DEFAULT_EXTERNAL_PREFS = { milk: 'formula', method: 'bottle' };

export function createBreastSession(side, now) {
  return {
    type: 'breast',
    startTime: now,
    activeSide: side,
    sideStartedAt: now,
    leftMs: 0,
    rightMs: 0,
  };
}

export function createExternalSession(now, prefs = DEFAULT_EXTERNAL_PREFS) {
  return {
    type: 'external',
    startTime: now,
    draft: {
      milk: prefs.milk ?? DEFAULT_EXTERNAL_PREFS.milk,
      method: prefs.method ?? DEFAULT_EXTERNAL_PREFS.method,
      offeredMl: 60,
      takenMl: 60,
      note: '',
    },
  };
}

export function commitSide(active, now) {
  if (!active || active.type !== 'breast' || !active.activeSide) return active;
  const ran = Math.max(0, now - active.sideStartedAt);
  const key = active.activeSide === 'left' ? 'leftMs' : 'rightMs';
  return { ...active, [key]: active[key] + ran, sideStartedAt: now };
}

export function switchSide(active, side, now) {
  const committed = commitSide(active, now);
  return { ...committed, activeSide: side, sideStartedAt: now };
}

export function sideElapsedMs(active, side, now) {
  if (!active || active.type !== 'breast') return 0;
  const base = side === 'left' ? active.leftMs : active.rightMs;
  if (active.activeSide !== side) return base;
  return base + Math.max(0, now - active.sideStartedAt);
}

export function finalizeBreastFeed(active, now) {
  const leftMs = sideElapsedMs(active, 'left', now);
  const rightMs = sideElapsedMs(active, 'right', now);
  if (leftMs + rightMs === 0) return null;
  return {
    id: crypto.randomUUID(),
    type: 'breast',
    startTime: active.startTime,
    endTime: now,
    leftMs,
    rightMs,
    lastSide: active.activeSide ?? (leftMs >= rightMs ? 'left' : 'right'),
    note: '',
  };
}

export function finalizeExternalFeed(active, now) {
  const d = active.draft;
  return {
    id: crypto.randomUUID(),
    type: 'external',
    startTime: active.startTime,
    endTime: now,
    milk: d.milk,
    method: d.method,
    offeredMl: d.offeredMl,
    takenMl: d.takenMl,
    note: d.note ?? '',
  };
}

export function isStale(active, now) {
  if (!active) return false;
  return now - active.startTime > STALE_MS;
}

export function feedDurationMs(feed) {
  return Math.max(0, feed.endTime - feed.startTime);
}

export function suggestedSide(feeds) {
  const lastBreast = feeds.find((f) => f.type === 'breast');
  if (!lastBreast) return 'left';
  return lastBreast.lastSide === 'left' ? 'right' : 'left';
}

export function lastExternalPrefs(feeds) {
  const last = feeds.find((f) => f.type === 'external');
  if (!last) return { ...DEFAULT_EXTERNAL_PREFS };
  return { milk: last.milk, method: last.method };
}

// feeds are newest-first; gaps[i] sits between feeds[i] and feeds[i + 1]
export function gapsBetweenFeeds(feeds) {
  const gaps = [];
  for (let i = 0; i < feeds.length - 1; i += 1) {
    gaps.push(Math.max(0, feeds[i].startTime - feeds[i + 1].endTime));
  }
  return gaps;
}

function emptyRow(dayStart) {
  return { key: dayKey(dayStart), dayStart, feedCount: 0, totalMl: 0, breastMs: 0 };
}

function addFeedToRow(row, feed) {
  row.feedCount += 1;
  if (feed.type === 'external') row.totalMl += feed.takenMl ?? 0;
  else row.breastMs += (feed.leftMs ?? 0) + (feed.rightMs ?? 0);
  return row;
}

export function todayFeedStats(feeds, now) {
  const today = startOfDay(now);
  const row = emptyRow(today);
  for (const feed of feeds) {
    if (startOfDay(feed.startTime) === today) addFeedToRow(row, feed);
  }
  return { feedCount: row.feedCount, totalMl: row.totalMl, breastMs: row.breastMs };
}

export function dailyFeedTotals(feeds, now, days) {
  const rows = [];
  const index = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const row = emptyRow(addDays(startOfDay(now), -i));
    rows.push(row);
    index.set(row.key, row);
  }
  for (const feed of feeds) {
    const row = index.get(dayKey(feed.startTime));
    if (row) addFeedToRow(row, feed);
  }
  return rows;
}

export function sideBalance(feeds, fromTs) {
  let leftMs = 0;
  let rightMs = 0;
  for (const feed of feeds) {
    if (feed.type !== 'breast' || feed.startTime < fromTs) continue;
    leftMs += feed.leftMs ?? 0;
    rightMs += feed.rightMs ?? 0;
  }
  return { leftMs, rightMs };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS — all suites green

- [ ] **Step 5: Commit**

```bash
git add src/features/baby/feedLogic.js src/features/baby/feedLogic.test.js
git commit -m "feat: add pure feed timing and stats logic"
```

---

### Task 5: `useFeedStore` hook

**Files:**
- Create: `src/features/baby/hooks/useFeedStore.js`
- Test: `src/features/baby/hooks/useFeedStore.session.test.js`

**Interfaces:**
- Consumes: everything from `feedLogic` (Task 4), `loadItems`/`saveItems`/`loadValue`/`saveValue` (Task 1)
- Produces: `useFeedStore()` returning the object below, plus the exported constants `FEEDS_KEY = 'baby_tracker_feeds_v1'`, `ACTIVE_KEY = 'baby_tracker_active_v1'`, `PREFS_KEY = 'baby_tracker_prefs_v1'`, and `restoreActive(now)` (exported separately so it can be tested without React).

```
{
  feeds, active, staleActive,
  elapsedMs, leftElapsedMs, rightElapsedMs,
  msSinceLastFeed, lastFeed, suggestion, prefs, quantityPresets,
  todayStats,
  startBreast(side), switchTo(side), stopBreast(),
  startExternal(), updateDraft(fields), saveExternal(), discardActive(),
  addFeed(feed), updateFeed(id, fields), deleteFeed(id), undoLast(),
  setQuantityPresets(list), replaceAll(feeds),
}
```

`undoLast()` removes the most recently added feed and returns it. Toast components call it.

- [ ] **Step 1: Write the failing tests for restore behaviour**

`src/features/baby/hooks/useFeedStore.session.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorageMock } from '../../../test/localStorageMock';
import { saveValue } from '../../../utils/storage';
import { restoreActive, ACTIVE_KEY } from './useFeedStore';
import { createBreastSession, sideElapsedMs, STALE_MS } from '../feedLogic';

const MIN = 60000;
const T0 = new Date(2026, 7, 3, 10, 0, 0, 0).getTime();

describe('restoreActive', () => {
  beforeEach(() => installLocalStorageMock());

  it('returns nothing when there is no stored session', () => {
    expect(restoreActive(T0)).toEqual({ active: null, stale: false });
  });

  it('restores a session and computes elapsed time from timestamps', () => {
    saveValue(ACTIVE_KEY, createBreastSession('left', T0));
    const { active, stale } = restoreActive(T0 + 20 * MIN);
    expect(stale).toBe(false);
    // 20 minutes passed while the app was closed — no ticks were counted
    expect(sideElapsedMs(active, 'left', T0 + 20 * MIN)).toBe(20 * MIN);
  });

  it('flags a session older than the stale window without discarding it', () => {
    saveValue(ACTIVE_KEY, createBreastSession('left', T0));
    const { active, stale } = restoreActive(T0 + STALE_MS + MIN);
    expect(stale).toBe(true);
    expect(active).not.toBeNull();
    expect(localStorage.getItem(ACTIVE_KEY)).not.toBeNull();
  });

  it('ignores a corrupt stored session', () => {
    localStorage.setItem(ACTIVE_KEY, '{bad');
    expect(restoreActive(T0)).toEqual({ active: null, stale: false });
  });

  it('ignores a stored session with no startTime', () => {
    saveValue(ACTIVE_KEY, { type: 'breast' });
    expect(restoreActive(T0)).toEqual({ active: null, stale: false });
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- src/features/baby/hooks/useFeedStore.session.test.js`
Expected: FAIL — cannot resolve `./useFeedStore`

- [ ] **Step 3: Implement `src/features/baby/hooks/useFeedStore.js`**

```js
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadItems, saveItems, loadValue, saveValue } from '../../../utils/storage';
import { startOfDay, addDays } from '../../../utils/dates';
import {
  createBreastSession, createExternalSession, switchSide, sideElapsedMs,
  finalizeBreastFeed, finalizeExternalFeed, isStale, suggestedSide,
  lastExternalPrefs, todayFeedStats,
} from '../feedLogic';

export const FEEDS_KEY = 'baby_tracker_feeds_v1';
export const ACTIVE_KEY = 'baby_tracker_active_v1';
export const PREFS_KEY = 'baby_tracker_prefs_v1';

export const DEFAULT_PRESETS = [30, 60, 90, 120];

// Exported for testing without React.
export function restoreActive(now) {
  const stored = loadValue(ACTIVE_KEY, null);
  if (!stored || typeof stored.startTime !== 'number') {
    return { active: null, stale: false };
  }
  return { active: stored, stale: isStale(stored, now) };
}

const byNewest = (a, b) => b.startTime - a.startTime;

export function useFeedStore() {
  const [feeds, setFeeds] = useState(() => loadItems(FEEDS_KEY).sort(byNewest));
  const [{ active, stale: staleActive }, setSession] = useState(() => restoreActive(Date.now()));
  const [presets, setPresets] = useState(
    () => loadValue(PREFS_KEY, { quantityPresets: DEFAULT_PRESETS }).quantityPresets ?? DEFAULT_PRESETS
  );
  const [now, setNow] = useState(() => Date.now());
  const lastAddedRef = useRef(null);

  useEffect(() => { saveItems(FEEDS_KEY, feeds); }, [feeds]);
  useEffect(() => { saveValue(PREFS_KEY, { quantityPresets: presets }); }, [presets]);

  useEffect(() => {
    if (active) saveValue(ACTIVE_KEY, active);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [active]);

  // One clock for the whole store. Everything time-dependent derives from `now`.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const setActive = useCallback((next, stale = false) => setSession({ active: next, stale }), []);

  const addFeed = useCallback((feed) => {
    if (!feed) return;
    lastAddedRef.current = feed.id;
    setFeeds((prev) => [feed, ...prev].sort(byNewest));
  }, []);

  const startBreast = useCallback((side) => {
    setActive(createBreastSession(side, Date.now()));
  }, [setActive]);

  const switchTo = useCallback((side) => {
    setSession(({ active: a }) => ({
      active: a ? switchSide(a, side, Date.now()) : a,
      stale: false,
    }));
  }, []);

  const stopBreast = useCallback(() => {
    if (!active) return null;
    const feed = finalizeBreastFeed(active, Date.now());
    setActive(null);
    addFeed(feed);
    return feed;
  }, [active, addFeed, setActive]);

  const startExternal = useCallback(() => {
    setActive(createExternalSession(Date.now(), lastExternalPrefs(feeds)));
  }, [feeds, setActive]);

  const updateDraft = useCallback((fields) => {
    setSession(({ active: a }) => ({
      active: a ? { ...a, draft: { ...a.draft, ...fields } } : a,
      stale: false,
    }));
  }, []);

  const saveExternal = useCallback(() => {
    if (!active) return null;
    const feed = finalizeExternalFeed(active, Date.now());
    setActive(null);
    addFeed(feed);
    return feed;
  }, [active, addFeed, setActive]);

  const discardActive = useCallback(() => setActive(null), [setActive]);

  const updateFeed = useCallback((id, fields) => {
    setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, ...fields } : f)).sort(byNewest));
  }, []);

  const deleteFeed = useCallback((id) => {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const undoLast = useCallback(() => {
    const id = lastAddedRef.current;
    if (!id) return;
    lastAddedRef.current = null;
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const replaceAll = useCallback((next) => setFeeds([...next].sort(byNewest)), []);

  const lastFeed = feeds[0] ?? null;

  return {
    feeds,
    active,
    staleActive,
    elapsedMs: active ? Math.max(0, now - active.startTime) : 0,
    leftElapsedMs: sideElapsedMs(active, 'left', now),
    rightElapsedMs: sideElapsedMs(active, 'right', now),
    msSinceLastFeed: lastFeed && !active ? Math.max(0, now - lastFeed.endTime) : null,
    lastFeed,
    suggestion: suggestedSide(feeds),
    prefs: lastExternalPrefs(feeds),
    quantityPresets: presets,
    todayStats: todayFeedStats(feeds, now),
    startBreast, switchTo, stopBreast,
    startExternal, updateDraft, saveExternal, discardActive,
    addFeed, updateFeed, deleteFeed, undoLast,
    setQuantityPresets: setPresets,
    replaceAll,
    weekStart: addDays(startOfDay(now), -6),
    now,
  };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/baby/hooks/useFeedStore.js src/features/baby/hooks/useFeedStore.session.test.js
git commit -m "feat: add useFeedStore with session restore across app close"
```

---

### Task 6: Diaper logic and `useDiaperStore`

**Files:**
- Create: `src/features/baby/diaperLogic.js`
- Create: `src/features/baby/hooks/useDiaperStore.js`
- Test: `src/features/baby/diaperLogic.test.js`

**Interfaces:**
- Consumes: `startOfDay`, `dayKey`, `addDays`; `loadItems`/`saveItems`
- Produces:
  - `createDiaper({ pee, poop }, now): Diaper`
  - `todayDiaperStats(diapers, now): { peeCount, poopCount }`
  - `dailyDiaperTotals(diapers, now, days): Array<{ key, dayStart, peeCount, poopCount }>` — oldest first
  - `msSinceLastPoop(diapers, now): number | null`
  - `DIAPER_COLORS`, `DIAPER_CONSISTENCIES`, `DIAPER_AMOUNTS` — option arrays for the edit sheet
  - `useDiaperStore()` returning `{ diapers, todayStats, msSinceLastPoop, logDiaper, updateDiaper, deleteDiaper, undoLast, replaceAll }`
  - `DIAPERS_KEY = 'baby_tracker_diapers_v1'`

A "Both" entry counts once toward pee and once toward poop.

- [ ] **Step 1: Write the failing tests**

`src/features/baby/diaperLogic.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  createDiaper, todayDiaperStats, dailyDiaperTotals, msSinceLastPoop,
} from './diaperLogic';

const MIN = 60000;
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();

describe('diaperLogic', () => {
  it('creates a diaper at the given instant', () => {
    const d = createDiaper({ pee: true, poop: false }, at(2026, 8, 3, 3, 14));
    expect(d).toMatchObject({ pee: true, poop: false, time: at(2026, 8, 3, 3, 14), note: '' });
    expect(d.id).toBeTruthy();
  });

  it('counts both pee and poop for a combined entry', () => {
    const now = at(2026, 8, 3, 20, 0);
    const diapers = [createDiaper({ pee: true, poop: true }, at(2026, 8, 3, 9, 0))];
    expect(todayDiaperStats(diapers, now)).toEqual({ peeCount: 1, poopCount: 1 });
  });

  it("counts only today's diapers", () => {
    const now = at(2026, 8, 3, 20, 0);
    const diapers = [
      createDiaper({ pee: true, poop: false }, at(2026, 8, 3, 9, 0)),
      createDiaper({ pee: true, poop: false }, at(2026, 8, 2, 23, 59)),
    ];
    expect(todayDiaperStats(diapers, now)).toEqual({ peeCount: 1, poopCount: 0 });
  });

  it('builds daily totals oldest-first including empty days', () => {
    const now = at(2026, 8, 3, 20, 0);
    const diapers = [createDiaper({ pee: true, poop: true }, at(2026, 8, 3, 9, 0))];
    const rows = dailyDiaperTotals(diapers, now, 3);
    expect(rows.map((r) => r.key)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    expect(rows[0].peeCount).toBe(0);
    expect(rows[2]).toMatchObject({ peeCount: 1, poopCount: 1 });
  });

  it('measures time since the last poop, ignoring pee-only entries', () => {
    const now = at(2026, 8, 3, 12, 0);
    const diapers = [
      createDiaper({ pee: true, poop: false }, at(2026, 8, 3, 11, 30)),
      createDiaper({ pee: true, poop: true }, at(2026, 8, 3, 10, 0)),
    ];
    expect(msSinceLastPoop(diapers, now)).toBe(120 * MIN);
  });

  it('returns null when there has never been a poop', () => {
    expect(msSinceLastPoop([], at(2026, 8, 3))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- src/features/baby/diaperLogic.test.js`
Expected: FAIL — cannot resolve `./diaperLogic`

- [ ] **Step 3: Implement `src/features/baby/diaperLogic.js`**

```js
import { startOfDay, dayKey, addDays } from '../../utils/dates';

export const DIAPER_COLORS = ['yellow', 'green', 'brown', 'black', 'red', 'white'];
export const DIAPER_CONSISTENCIES = ['runny', 'soft', 'seedy', 'formed', 'hard'];
export const DIAPER_AMOUNTS = ['small', 'medium', 'large'];

export function createDiaper({ pee, poop }, now) {
  return {
    id: crypto.randomUUID(),
    time: now,
    pee: Boolean(pee),
    poop: Boolean(poop),
    note: '',
  };
}

export function todayDiaperStats(diapers, now) {
  const today = startOfDay(now);
  let peeCount = 0;
  let poopCount = 0;
  for (const d of diapers) {
    if (startOfDay(d.time) !== today) continue;
    if (d.pee) peeCount += 1;
    if (d.poop) poopCount += 1;
  }
  return { peeCount, poopCount };
}

export function dailyDiaperTotals(diapers, now, days) {
  const rows = [];
  const index = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = addDays(startOfDay(now), -i);
    const row = { key: dayKey(dayStart), dayStart, peeCount: 0, poopCount: 0 };
    rows.push(row);
    index.set(row.key, row);
  }
  for (const d of diapers) {
    const row = index.get(dayKey(d.time));
    if (!row) continue;
    if (d.pee) row.peeCount += 1;
    if (d.poop) row.poopCount += 1;
  }
  return rows;
}

export function msSinceLastPoop(diapers, now) {
  const last = diapers.find((d) => d.poop);
  if (!last) return null;
  return Math.max(0, now - last.time);
}
```

- [ ] **Step 4: Implement `src/features/baby/hooks/useDiaperStore.js`**

```js
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadItems, saveItems } from '../../../utils/storage';
import { createDiaper, todayDiaperStats, msSinceLastPoop } from '../diaperLogic';

export const DIAPERS_KEY = 'baby_tracker_diapers_v1';

const byNewest = (a, b) => b.time - a.time;

export function useDiaperStore() {
  const [diapers, setDiapers] = useState(() => loadItems(DIAPERS_KEY).sort(byNewest));
  const [now, setNow] = useState(() => Date.now());
  const lastAddedRef = useRef(null);

  useEffect(() => { saveItems(DIAPERS_KEY, diapers); }, [diapers]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const logDiaper = useCallback(({ pee, poop }) => {
    const entry = createDiaper({ pee, poop }, Date.now());
    lastAddedRef.current = entry.id;
    setDiapers((prev) => [entry, ...prev].sort(byNewest));
    return entry;
  }, []);

  const updateDiaper = useCallback((id, fields) => {
    setDiapers((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)).sort(byNewest));
  }, []);

  const deleteDiaper = useCallback((id) => {
    setDiapers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const undoLast = useCallback(() => {
    const id = lastAddedRef.current;
    if (!id) return;
    lastAddedRef.current = null;
    setDiapers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const replaceAll = useCallback((next) => setDiapers([...next].sort(byNewest)), []);

  return {
    diapers,
    todayStats: todayDiaperStats(diapers, now),
    msSinceLastPoop: msSinceLastPoop(diapers, now),
    logDiaper, updateDiaper, deleteDiaper, undoLast, replaceAll,
  };
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/baby/diaperLogic.js src/features/baby/diaperLogic.test.js src/features/baby/hooks/useDiaperStore.js
git commit -m "feat: add diaper logic and store"
```

---

### Task 7: Baby shell, Home screen, and toast

**Files:**
- Create: `src/features/baby/components/Toast.jsx`
- Create: `src/features/baby/components/HomeScreen.jsx`
- Create: `src/features/baby/baby.css`
- Modify: `src/features/baby/BabyApp.jsx` (replaces the Task 3 placeholder)
- Modify: `src/utils/format.js` (add `formatMs`, `formatGap`)

**Interfaces:**
- Consumes: `useFeedStore`, `useDiaperStore`, `feedDurationMs`, `formatTime`
- Produces:
  - `formatMs(ms): string` — `'12m 30s'`
  - `formatGap(ms): string` — `'2h 10m'`, coarse, for the banner
  - `<Toast message onUndo onDismiss />`
  - `<HomeScreen feedStore diaperStore onOpenBreast onOpenExternal onEdit />`
  - `BabyApp` renders tabs and owns which sheet is open

Sheets are opened from `BabyApp`, not `HomeScreen`, so the Log tab can open the same edit sheet in Task 10.

- [ ] **Step 1: Add the formatters**

Append to `src/utils/format.js`:

```js
export function formatMs(ms) {
  if (ms == null) return '--';
  return formatDuration(Math.round(ms / 1000));
}

// Coarse "how long ago" for banners: 2h 10m, 45m, just now
export function formatGap(ms) {
  if (ms == null) return '--';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return 'just now';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
```

- [ ] **Step 2: Create `Toast.jsx`**

```jsx
import { useEffect } from 'react';

export function Toast({ message, onUndo, onDismiss, duration = 5000 }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [onDismiss, duration, message]);

  return (
    <div className="toast" role="status">
      <span className="toast__msg">{message}</span>
      {onUndo && (
        <button
          className="toast__undo"
          onClick={() => { onUndo(); onDismiss(); }}
        >
          Undo
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `HomeScreen.jsx`**

```jsx
import { formatGap, formatMs, formatTime } from '../../../utils/format';
import { feedDurationMs } from '../feedLogic';

function feedSummary(feed) {
  if (!feed) return null;
  if (feed.type === 'breast') {
    const parts = [];
    if (feed.leftMs > 0) parts.push(`L ${Math.round(feed.leftMs / 60000)}m`);
    if (feed.rightMs > 0) parts.push(`R ${Math.round(feed.rightMs / 60000)}m`);
    return parts.join(' · ') || formatMs(feedDurationMs(feed));
  }
  return `${feed.takenMl} ml · ${feed.milk === 'formula' ? 'Formula' : 'Expressed'}`;
}

function diaperSummary(d) {
  if (d.pee && d.poop) return 'Pee + Poop';
  return d.poop ? 'Poop' : 'Pee';
}

export function HomeScreen({ feedStore, diaperStore, onOpenBreast, onOpenExternal, onLogDiaper, onEdit }) {
  const { lastFeed, msSinceLastFeed, todayStats } = feedStore;
  const diaperToday = diaperStore.todayStats;

  const recent = [
    ...feedStore.feeds.slice(0, 8).map((f) => ({ kind: 'feed', time: f.startTime, item: f })),
    ...diaperStore.diapers.slice(0, 8).map((d) => ({ kind: 'diaper', time: d.time, item: d })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 8);

  return (
    <div className="home">
      <div className="banner">
        {lastFeed ? (
          <>
            <p className="banner__main">Last feed {formatGap(msSinceLastFeed)} ago</p>
            <p className="banner__sub">
              {feedSummary(lastFeed)} · {formatTime(lastFeed.startTime)}
            </p>
          </>
        ) : (
          <p className="banner__main">No feeds recorded yet</p>
        )}
      </div>

      <div className="actions">
        <button className="action action--breast" onClick={onOpenBreast}>
          <span className="action__icon" aria-hidden="true">🤱</span>
          <span>Breast</span>
        </button>
        <button className="action action--bottle" onClick={onOpenExternal}>
          <span className="action__icon" aria-hidden="true">🍼</span>
          <span>Bottle</span>
        </button>
      </div>

      <div className="actions actions--diaper">
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: true, poop: false })}>
          💧 Pee
        </button>
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: false, poop: true })}>
          💩 Poop
        </button>
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: true, poop: true })}>
          Both
        </button>
      </div>

      <p className="today-summary">
        Today · {todayStats.feedCount} feeds
        {todayStats.totalMl > 0 && ` · ${todayStats.totalMl} ml`}
        {todayStats.breastMs > 0 && ` · ${Math.round(todayStats.breastMs / 60000)}m breast`}
        {' · '}{diaperToday.peeCount}💧 · {diaperToday.poopCount}💩
      </p>

      <ul className="recent">
        {recent.length === 0 && <li className="recent__empty">Nothing logged yet.</li>}
        {recent.map(({ kind, time, item }) => (
          <li key={item.id}>
            <button className="recent__row" onClick={() => onEdit(kind, item)}>
              <span className="recent__time">{formatTime(time)}</span>
              <span className="recent__icon" aria-hidden="true">
                {kind === 'feed' ? (item.type === 'breast' ? '🤱' : '🍼') : (item.poop ? '💩' : '💧')}
              </span>
              <span className="recent__text">
                {kind === 'feed' ? feedSummary(item) : diaperSummary(item)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `BabyApp.jsx`**

```jsx
import { useState } from 'react';
import { useFeedStore } from './hooks/useFeedStore';
import { useDiaperStore } from './hooks/useDiaperStore';
import { HomeScreen } from './components/HomeScreen';
import { Toast } from './components/Toast';
import './baby.css';

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'charts', label: 'Charts' },
  { id: 'log', label: 'Log' },
];

export default function BabyApp() {
  const feedStore = useFeedStore();
  const diaperStore = useDiaperStore();
  const [tab, setTab] = useState('home');
  const [toast, setToast] = useState(null);

  const handleLogDiaper = ({ pee, poop }) => {
    diaperStore.logDiaper({ pee, poop });
    setToast({
      message: pee && poop ? 'Pee + poop logged' : poop ? 'Poop logged' : 'Pee logged',
      onUndo: diaperStore.undoLast,
    });
  };

  return (
    <main className="app-main baby">
      {tab === 'home' && (
        <HomeScreen
          feedStore={feedStore}
          diaperStore={diaperStore}
          onOpenBreast={() => {}}
          onOpenExternal={() => {}}
          onLogDiaper={handleLogDiaper}
          onEdit={() => {}}
        />
      )}
      {tab === 'charts' && <p className="placeholder">Charts coming up.</p>}
      {tab === 'log' && <p className="placeholder">Log coming up.</p>}

      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      <nav className="bottom-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`bottom-tabs__btn ${tab === t.id ? 'bottom-tabs__btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
```

The `onOpenBreast`, `onOpenExternal`, and `onEdit` no-ops are wired in Tasks 8, 9, and 10.

- [ ] **Step 5: Create `src/features/baby/baby.css`**

Write styles for `.baby` (bottom padding of 5rem so the tab bar never covers content), `.banner`, `.actions`, `.action` (min-height 64px, `--sm` variant 48px), `.today-summary`, `.recent`, `.recent__row` (full-width, left-aligned, 44px min height), `.toast` (fixed, bottom 5rem, centered, slide-in), and `.bottom-tabs` (fixed bottom, safe-area inset via `padding-bottom: env(safe-area-inset-bottom)`). Use the existing `:root` custom properties from `base.css` — do not introduce new colours.

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev`

Check: Home renders, the three diaper buttons log and show a toast with a working Undo, the today summary counts update, tabs switch, no horizontal scroll at 375px width, and the bottom tab bar does not cover the last list row.

- [ ] **Step 7: Run checks and commit**

```bash
npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add baby app shell, home screen, and diaper quick-log"
```

---

### Task 8: Breast feed sheet

**Files:**
- Create: `src/features/baby/components/BreastFeedSheet.jsx`
- Modify: `src/features/baby/BabyApp.jsx`, `src/features/baby/baby.css`

**Interfaces:**
- Consumes: `feedStore` from Task 5, `formatMs`, `LONG_FEED_MS`
- Produces: `<BreastFeedSheet feedStore onClose onSaved />` — `onSaved(feed)` fires with the saved feed so `BabyApp` can raise the undo toast

- [ ] **Step 1: Create the sheet**

```jsx
import { formatMs } from '../../../utils/format';
import { LONG_FEED_MS } from '../feedLogic';

export function BreastFeedSheet({ feedStore, onClose, onSaved }) {
  const {
    active, suggestion, elapsedMs, leftElapsedMs, rightElapsedMs,
    startBreast, switchTo, stopBreast, discardActive,
  } = feedStore;

  const running = active?.type === 'breast';
  const activeSide = running ? active.activeSide : null;
  const hasTime = leftElapsedMs + rightElapsedMs > 0;

  const tapSide = (side) => {
    if (!running) startBreast(side);
    else if (activeSide !== side) switchTo(side);
  };

  const handleStop = () => {
    const feed = stopBreast();
    onClose();
    if (feed) onSaved(feed);
  };

  const handleCancel = () => {
    discardActive();
    onClose();
  };

  const sideBtn = (side, label) => (
    <button
      className={[
        'side-btn',
        activeSide === side && 'side-btn--running',
        !running && suggestion === side && 'side-btn--suggested',
      ].filter(Boolean).join(' ')}
      onClick={() => tapSide(side)}
      aria-pressed={activeSide === side}
    >
      <span className="side-btn__label">{label}</span>
      <span className="side-btn__time">
        {formatMs(side === 'left' ? leftElapsedMs : rightElapsedMs)}
      </span>
      {activeSide === side && <span className="side-btn__dot" aria-label="running" />}
    </button>
  );

  return (
    <div className="sheet" role="dialog" aria-label="Breast feed">
      <div className="sheet__head">
        <button className="sheet__close" onClick={handleCancel}>Cancel</button>
        <span className="sheet__title">Breast feed</span>
        <span />
      </div>

      <p className="sheet__timer">{running ? formatMs(elapsedMs) : '0s'}</p>
      {running && elapsedMs > LONG_FEED_MS && (
        <p className="sheet__warn">Still feeding? This has been running over 2 hours.</p>
      )}
      {!running && (
        <p className="sheet__hint">Tap a side to start. {suggestion === 'left' ? 'Left' : 'Right'} is suggested.</p>
      )}

      <div className="side-row">
        {sideBtn('left', 'Left')}
        {sideBtn('right', 'Right')}
      </div>

      <button className="sheet__primary" onClick={handleStop} disabled={!hasTime}>
        Stop &amp; save
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `BabyApp.jsx`**

Add `const [sheet, setSheet] = useState(null);`, change `onOpenBreast` to `() => setSheet('breast')`, and render before the toast:

```jsx
{sheet === 'breast' && (
  <BreastFeedSheet
    feedStore={feedStore}
    onClose={() => setSheet(null)}
    onSaved={(feed) => setToast({
      message: `Feed saved · ${Math.round((feed.leftMs + feed.rightMs) / 60000)}m`,
      onUndo: feedStore.undoLast,
    })}
  />
)}
```

- [ ] **Step 3: Reopen a running session automatically**

In `BabyApp.jsx`, change the React import to `import { useState, useEffect } from 'react';` and add:

```jsx
useEffect(() => {
  if (feedStore.active && !feedStore.staleActive && sheet === null) {
    setSheet(feedStore.active.type === 'breast' ? 'breast' : 'external');
  }
  // Only on the first render — a user who cancels a sheet shouldn't have it snap back.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 4: Style the sheet**

Add to `baby.css`: `.sheet` (fixed, inset 0, `background: var(--bg)`, column flex, `z-index: 20`, padding, safe-area insets), `.sheet__head` (three-column grid), `.sheet__timer` (3rem, tabular-nums via `font-variant-numeric: tabular-nums`), `.side-row` (2-column grid, gap), `.side-btn` (min-height 30vh, large label, `--suggested` outlined in `--accent`, `--running` filled), `.side-btn__dot` (pulsing dot reusing the existing pulse keyframes if present in `contractions.css`, otherwise define a local `@keyframes babyPulse`), `.sheet__primary` (full width, 56px, `--accent`, dimmed when disabled), `.sheet__warn` (`--warn` colour).

- [ ] **Step 5: Verify in the browser**

Run `npm run dev`. Check: tapping Left starts the timer and Right shows `0s`; tapping Right pauses Left with its time frozen and starts Right; total elapsed keeps climbing across the switch; Stop saves and shows an undo toast; Cancel before any side is tapped saves nothing. Then start a feed, reload the page, and confirm the sheet reopens with the correct elapsed time.

- [ ] **Step 6: Run checks and commit**

```bash
npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add breast feed sheet with per-side timers"
```

---

### Task 9: External feed sheet and quantity picker

**Files:**
- Create: `src/features/baby/components/QuantityPicker.jsx`
- Create: `src/features/baby/components/ExternalFeedSheet.jsx`
- Modify: `src/features/baby/BabyApp.jsx`, `src/features/baby/baby.css`

**Interfaces:**
- Consumes: `feedStore.updateDraft`, `saveExternal`, `discardActive`, `quantityPresets`, `setQuantityPresets`
- Produces:
  - `<QuantityPicker label value presets onChange onEditPreset step={10} />`
  - `<ExternalFeedSheet feedStore onClose onSaved />`

- [ ] **Step 1: Create `QuantityPicker.jsx`**

```jsx
export function QuantityPicker({ label, value, presets, onChange, onEditPreset, step = 10 }) {
  const handleLongPress = (preset, index) => {
    if (!onEditPreset) return;
    const next = window.prompt(`Preset value in ml`, String(preset));
    const n = Number(next);
    if (Number.isFinite(n) && n > 0) onEditPreset(index, Math.round(n));
  };

  return (
    <div className="qty">
      <p className="qty__label">{label}</p>
      {presets && (
        <div className="qty__presets">
          {presets.map((p, i) => (
            <button
              key={p}
              className={`chip ${value === p ? 'chip--active' : ''}`}
              onClick={() => onChange(p)}
              onContextMenu={(e) => { e.preventDefault(); handleLongPress(p, i); }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="qty__stepper">
        <button
          className="qty__step"
          onClick={() => onChange(Math.max(0, value - step))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="qty__value">{value} ml</span>
        <button
          className="qty__step"
          onClick={() => onChange(value + step)}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
```

Long-press is implemented as `onContextMenu`, which mobile browsers fire on a long press and desktop fires on right-click. No custom timer needed.

- [ ] **Step 2: Create `ExternalFeedSheet.jsx`**

```jsx
import { QuantityPicker } from './QuantityPicker';
import { formatMs } from '../../../utils/format';

const MILKS = [
  { id: 'expressed', label: 'Expressed' },
  { id: 'formula', label: 'Formula' },
];

const METHODS = [
  { id: 'bottle', label: 'Bottle' },
  { id: 'spoon', label: 'Spoon' },
  { id: 'syringe', label: 'Syringe' },
];

export function ExternalFeedSheet({ feedStore, onClose, onSaved }) {
  const {
    active, elapsedMs, updateDraft, saveExternal, discardActive,
    quantityPresets, setQuantityPresets,
  } = feedStore;

  if (!active || active.type !== 'external') return null;
  const draft = active.draft;

  // Changing what was offered carries "taken" with it, unless it was reduced deliberately.
  const setOffered = (offeredMl) =>
    updateDraft({
      offeredMl,
      takenMl: draft.takenMl === draft.offeredMl ? offeredMl : Math.min(draft.takenMl, offeredMl),
    });

  const editPreset = (index, val) => {
    const next = [...quantityPresets];
    next[index] = val;
    setQuantityPresets(next.sort((a, b) => a - b));
  };

  const handleSave = () => {
    const feed = saveExternal();
    onClose();
    if (feed) onSaved(feed);
  };

  const handleCancel = () => {
    discardActive();
    onClose();
  };

  const chipRow = (options, selected, onPick) => (
    <div className="chip-row">
      {options.map((o) => (
        <button
          key={o.id}
          className={`chip ${selected === o.id ? 'chip--active' : ''}`}
          onClick={() => onPick(o.id)}
          aria-pressed={selected === o.id}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="sheet" role="dialog" aria-label="Bottle feed">
      <div className="sheet__head">
        <button className="sheet__close" onClick={handleCancel}>Cancel</button>
        <span className="sheet__title">Bottle feed</span>
        <span className="sheet__elapsed">{formatMs(elapsedMs)}</span>
      </div>

      {chipRow(MILKS, draft.milk, (milk) => updateDraft({ milk }))}
      {chipRow(METHODS, draft.method, (method) => updateDraft({ method }))}

      <QuantityPicker
        label="Offered"
        value={draft.offeredMl}
        presets={quantityPresets}
        onChange={setOffered}
        onEditPreset={editPreset}
      />

      <QuantityPicker
        label="Taken"
        value={draft.takenMl}
        onChange={(takenMl) => updateDraft({ takenMl })}
      />

      <button className="sheet__primary" onClick={handleSave}>Save</button>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `BabyApp.jsx`**

Change `onOpenExternal` to `() => { feedStore.startExternal(); setSheet('external'); }` and render:

```jsx
{sheet === 'external' && (
  <ExternalFeedSheet
    feedStore={feedStore}
    onClose={() => setSheet(null)}
    onSaved={(feed) => setToast({
      message: `Bottle saved · ${feed.takenMl} ml`,
      onUndo: feedStore.undoLast,
    })}
  />
)}
```

- [ ] **Step 4: Style**

Add `.chip-row`, `.chip` (min-height 44px, pill, `--active` filled with `--accent`), `.qty`, `.qty__presets` (wrap grid), `.qty__stepper` (row, big 56px round `−`/`+` buttons either side of a tabular-nums value), `.sheet__elapsed` (muted, small).

- [ ] **Step 5: Verify in the browser**

Check the three-tap path: tap Bottle → tap `60` → tap Save. Confirm the saved feed shows 60 ml, milk and method were pre-selected from the last bottle feed, and the recorded duration is roughly the time the sheet was open. Then long-press a preset chip and confirm the new value persists after a reload.

- [ ] **Step 6: Run checks and commit**

```bash
npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add external feed sheet with quantity picker"
```

---

### Task 10: Log tab and edit sheets

**Files:**
- Create: `src/features/baby/components/EditSheet.jsx`
- Create: `src/features/baby/components/LogTab.jsx`
- Modify: `src/features/baby/BabyApp.jsx`, `src/features/baby/baby.css`

**Interfaces:**
- Consumes: `groupByDay`, `formatDayLabel`, `toDateInputValue`, `toTimeInputValue`, `fromDateTimeInputs`, both stores, `DIAPER_COLORS`/`DIAPER_CONSISTENCIES`/`DIAPER_AMOUNTS`
- Produces:
  - `<EditSheet kind record onSave onDelete onClose />` where `kind` is `'feed' | 'diaper'`
  - `<LogTab feedStore diaperStore onEdit />`

Every field in the design's edit table is present. Date and time are `<input type="date">` and `<input type="time">`, which give native mobile pickers.

- [ ] **Step 1: Create `EditSheet.jsx`**

```jsx
import { useState } from 'react';
import {
  toDateInputValue, toTimeInputValue, fromDateTimeInputs,
} from '../../../utils/dates';
import {
  DIAPER_COLORS, DIAPER_CONSISTENCIES, DIAPER_AMOUNTS,
} from '../diaperLogic';

const MILKS = ['expressed', 'formula'];
const METHODS = ['bottle', 'spoon', 'syringe'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function OptionRow({ label, options, value, onChange, allowClear = false }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="chip-row">
        {options.map((o) => (
          <button
            key={o}
            className={`chip ${value === o ? 'chip--active' : ''}`}
            onClick={() => onChange(allowClear && value === o ? undefined : o)}
          >
            {cap(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EditSheet({ kind, record, onSave, onDelete, onClose, notice }) {
  const isFeed = kind === 'feed';
  const baseTime = isFeed ? record.startTime : record.time;

  const [date, setDate] = useState(toDateInputValue(baseTime));
  const [startClock, setStartClock] = useState(toTimeInputValue(baseTime));
  const [endClock, setEndClock] = useState(
    isFeed ? toTimeInputValue(record.endTime) : ''
  );
  const [draft, setDraft] = useState({ ...record });
  const [error, setError] = useState(null);

  const set = (fields) => setDraft((d) => ({ ...d, ...fields }));

  const minutesField = (label, key) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="number"
        min="0"
        inputMode="numeric"
        value={Math.round((draft[key] ?? 0) / 60000)}
        onChange={(e) => set({ [key]: Math.max(0, Number(e.target.value) || 0) * 60000 })}
      />
    </label>
  );

  const numberField = (label, key) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="number"
        min="0"
        inputMode="numeric"
        value={draft[key] ?? 0}
        onChange={(e) => set({ [key]: Math.max(0, Number(e.target.value) || 0) })}
      />
    </label>
  );

  const handleSave = () => {
    const startTime = fromDateTimeInputs(date, startClock);
    if (!isFeed) {
      onSave({ ...draft, time: startTime });
      onClose();
      return;
    }
    let endTime = fromDateTimeInputs(date, endClock);
    // A feed that ended "before" it started crossed midnight.
    if (endTime < startTime) endTime = endTime + 86400000;
    if (endTime - startTime > 12 * 3600000) {
      setError('That feed would be over 12 hours long. Check the times.');
      return;
    }
    onSave({ ...draft, startTime, endTime });
    onClose();
  };

  return (
    <div className="sheet" role="dialog" aria-label={isFeed ? 'Edit feed' : 'Edit diaper'}>
      <div className="sheet__head">
        <button className="sheet__close" onClick={onClose}>Cancel</button>
        <span className="sheet__title">{isFeed ? 'Edit feed' : 'Edit diaper'}</span>
        <span />
      </div>

      <div className="sheet__body">
        {notice && <p className="sheet__warn">{notice}</p>}

        <label className="field">
          <span className="field__label">Date</span>
          <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="field">
          <span className="field__label">{isFeed ? 'Start time' : 'Time'}</span>
          <input className="field__input" type="time" value={startClock} onChange={(e) => setStartClock(e.target.value)} />
        </label>

        {isFeed && (
          <label className="field">
            <span className="field__label">End time</span>
            <input className="field__input" type="time" value={endClock} onChange={(e) => setEndClock(e.target.value)} />
          </label>
        )}

        {isFeed && draft.type === 'breast' && (
          <>
            {minutesField('Left (minutes)', 'leftMs')}
            {minutesField('Right (minutes)', 'rightMs')}
            <OptionRow
              label="Last side"
              options={['left', 'right']}
              value={draft.lastSide}
              onChange={(lastSide) => set({ lastSide })}
            />
          </>
        )}

        {isFeed && draft.type === 'external' && (
          <>
            <OptionRow label="Milk" options={MILKS} value={draft.milk} onChange={(milk) => set({ milk })} />
            <OptionRow label="Method" options={METHODS} value={draft.method} onChange={(method) => set({ method })} />
            {numberField('Offered (ml)', 'offeredMl')}
            {numberField('Taken (ml)', 'takenMl')}
          </>
        )}

        {!isFeed && (
          <>
            <div className="field">
              <span className="field__label">Contents</span>
              <div className="chip-row">
                <button
                  className={`chip ${draft.pee ? 'chip--active' : ''}`}
                  onClick={() => set({ pee: !draft.pee })}
                >
                  💧 Pee
                </button>
                <button
                  className={`chip ${draft.poop ? 'chip--active' : ''}`}
                  onClick={() => set({ poop: !draft.poop })}
                >
                  💩 Poop
                </button>
              </div>
            </div>
            {draft.poop && (
              <>
                <OptionRow label="Colour" options={DIAPER_COLORS} value={draft.color} onChange={(color) => set({ color })} allowClear />
                <OptionRow label="Consistency" options={DIAPER_CONSISTENCIES} value={draft.consistency} onChange={(consistency) => set({ consistency })} allowClear />
                <OptionRow label="Amount" options={DIAPER_AMOUNTS} value={draft.amount} onChange={(amount) => set({ amount })} allowClear />
              </>
            )}
          </>
        )}

        <label className="field">
          <span className="field__label">Note</span>
          <input
            className="field__input"
            type="text"
            value={draft.note ?? ''}
            onChange={(e) => set({ note: e.target.value })}
          />
        </label>

        {error && <p className="sheet__warn">{error}</p>}
      </div>

      <div className="sheet__foot">
        <button className="sheet__danger" onClick={() => { onDelete(record.id); onClose(); }}>
          Delete
        </button>
        <button className="sheet__primary" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `LogTab.jsx`**

```jsx
import { groupByDay, formatDayLabel } from '../../../utils/dates';
import { formatTime, formatMs } from '../../../utils/format';
import { feedDurationMs } from '../feedLogic';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'feeds', label: 'Feeds' },
  { id: 'diapers', label: 'Diapers' },
];

function describe(entry) {
  const { kind, item } = entry;
  if (kind === 'diaper') {
    const what = item.pee && item.poop ? 'Pee + Poop' : item.poop ? 'Poop' : 'Pee';
    const extra = [item.color, item.consistency, item.amount].filter(Boolean).join(' · ');
    return extra ? `${what} · ${extra}` : what;
  }
  if (item.type === 'breast') {
    return `Breast · L ${Math.round(item.leftMs / 60000)}m · R ${Math.round(item.rightMs / 60000)}m · ${formatMs(feedDurationMs(item))} total`;
  }
  return `${item.takenMl} ml taken of ${item.offeredMl} · ${item.milk} · ${item.method}`;
}

export function LogTab({ feedStore, diaperStore, filter, onFilterChange, onEdit }) {
  const entries = [
    ...(filter !== 'diapers'
      ? feedStore.feeds.map((f) => ({ kind: 'feed', time: f.startTime, item: f }))
      : []),
    ...(filter !== 'feeds'
      ? diaperStore.diapers.map((d) => ({ kind: 'diaper', time: d.time, item: d }))
      : []),
  ].sort((a, b) => b.time - a.time);

  const groups = groupByDay(entries, (e) => e.time);

  return (
    <div className="log">
      <div className="chip-row chip-row--filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? 'chip--active' : ''}`}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && <p className="placeholder">Nothing logged yet.</p>}

      {groups.map((group) => (
        <section key={group.key} className="log__day">
          <h2 className="log__day-title">{formatDayLabel(group.dayStart)}</h2>
          <ul className="log__list">
            {group.items.map((entry) => (
              <li key={entry.item.id}>
                <button className="log__row" onClick={() => onEdit(entry.kind, entry.item)}>
                  <span className="log__time">{formatTime(entry.time)}</span>
                  <span className="log__icon" aria-hidden="true">
                    {entry.kind === 'feed'
                      ? entry.item.type === 'breast' ? '🤱' : '🍼'
                      : entry.item.poop ? '💩' : '💧'}
                  </span>
                  <span className="log__text">
                    {describe(entry)}
                    {entry.item.note && <em className="log__note"> — {entry.item.note}</em>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire both into `BabyApp.jsx`**

Add state `const [editing, setEditing] = useState(null);` and `const [logFilter, setLogFilter] = useState('all');`. Set `onEdit={(kind, item) => setEditing({ kind, item })}` on both `HomeScreen` and `LogTab`. Replace the Log placeholder with `<LogTab … />`. Render the edit sheet:

```jsx
{editing && (
  <EditSheet
    kind={editing.kind}
    record={editing.item}
    onSave={(next) =>
      editing.kind === 'feed'
        ? feedStore.updateFeed(next.id, next)
        : diaperStore.updateDiaper(next.id, next)
    }
    onDelete={(id) =>
      editing.kind === 'feed' ? feedStore.deleteFeed(id) : diaperStore.deleteDiaper(id)
    }
    onClose={() => setEditing(null)}
  />
)}
```

- [ ] **Step 4: Handle the stale session**

In `BabyApp.jsx`, add an effect that opens the edit sheet for a stale restored session instead of resuming its timer:

```jsx
useEffect(() => {
  if (!feedStore.staleActive || !feedStore.active) return;
  const a = feedStore.active;
  const record = a.type === 'breast'
    ? { id: 'stale', type: 'breast', startTime: a.startTime, endTime: a.startTime + a.leftMs + a.rightMs, leftMs: a.leftMs, rightMs: a.rightMs, lastSide: a.activeSide ?? 'left', note: '' }
    : { id: 'stale', type: 'external', startTime: a.startTime, endTime: a.startTime, ...a.draft };
  setStaleRecord(record);
}, [feedStore.staleActive, feedStore.active]);
```

Hold it in `const [staleRecord, setStaleRecord] = useState(null);` and render an `EditSheet` for it whose `onSave` calls `feedStore.addFeed({ ...next, id: crypto.randomUUID() })` then `feedStore.discardActive()`, and whose `onDelete`/`onClose` calls `feedStore.discardActive()` and clears `staleRecord`. Pass `notice="This feed was left running. Check the end time and save, or delete it."` to that `EditSheet` — the prop already exists on the component from Step 1.

- [ ] **Step 5: Style**

Add `.log`, `.log__day-title` (sticky, small caps, muted), `.log__row` (grid `auto auto 1fr`, 48px min height, left-aligned), `.log__note` (muted italic), `.field` (column flex, label above), `.field__input` (full width, 48px, `--surface2` background, `--border`, 16px font so iOS doesn't zoom), `.sheet__body` (scrollable, `overflow-y: auto`, `flex: 1`), `.sheet__foot` (row, gap), `.sheet__danger` (`--accent-stop` text on transparent).

- [ ] **Step 6: Verify in the browser**

Check: tapping any entry from Home or Log opens the edit sheet with correct values; changing the date and time moves the entry to the right day group; editing breast minutes updates the summary; deleting removes it; the filter chips work; a feed whose end time is earlier than its start (crossing midnight) saves with the correct duration rather than a negative one.

- [ ] **Step 7: Run checks and commit**

```bash
npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add log tab and universal edit sheet"
```

---

### Task 11: Timeline and gap charts

**Files:**
- Create: `src/features/baby/components/charts/TimelineStrip.jsx`
- Create: `src/features/baby/components/charts/FeedGapChart.jsx`
- Create: `src/features/baby/components/ChartsTab.jsx`
- Modify: `src/features/baby/BabyApp.jsx`, `src/features/baby/baby.css`

**Interfaces:**
- Consumes: `startOfDay`, `addDays`, `formatDayLabel`, `DAY_MS`, `gapsBetweenFeeds`, `feedDurationMs`
- Produces: `<TimelineStrip feeds diapers dayStart />`, `<FeedGapChart feeds />`, `<ChartsTab feedStore diaperStore />`

Follow the SVG approach in `src/features/contractions/components/ContractionGraph.jsx`: a `viewBox` with fixed internal coordinates and `width="100%"`, so it scales to any screen without measuring the DOM.

- [ ] **Step 1: Create `TimelineStrip.jsx`**

```jsx
import { useState } from 'react';
import { startOfDay, addDays, formatDayLabel, DAY_MS } from '../../../../utils/dates';
import { feedDurationMs } from '../../feedLogic';

const W = 1000;
const H = 120;
const TRACK_Y = 46;
const TRACK_H = 34;

// Fraction of the day, clamped so an entry that started yesterday still renders at 0.
const frac = (ts, dayStart) => Math.min(1, Math.max(0, (ts - dayStart) / DAY_MS));

export function TimelineStrip({ feeds, diapers, initialDayStart }) {
  const [dayStart, setDayStart] = useState(initialDayStart ?? startOfDay(Date.now()));
  const dayEnd = dayStart + DAY_MS;

  const dayFeeds = feeds.filter((f) => f.startTime >= dayStart && f.startTime < dayEnd);
  const dayDiapers = diapers.filter((d) => d.time >= dayStart && d.time < dayEnd);
  const isToday = startOfDay(Date.now()) === dayStart;

  return (
    <div className="chart">
      <div className="chart__head">
        <button className="chart__nav" onClick={() => setDayStart((d) => addDays(d, -1))} aria-label="Previous day">‹</button>
        <h3 className="chart__title">{formatDayLabel(dayStart)}</h3>
        <button className="chart__nav" onClick={() => setDayStart((d) => addDays(d, 1))} disabled={isToday} aria-label="Next day">›</button>
      </div>

      {dayFeeds.length === 0 && dayDiapers.length === 0 ? (
        <p className="chart__empty">Nothing logged on this day.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="24 hour timeline">
          <rect x="0" y={TRACK_Y} width={W} height={TRACK_H} rx="6" fill="var(--surface2)" />

          {[0, 6, 12, 18, 24].map((h) => (
            <g key={h}>
              <line x1={(h / 24) * W} y1={TRACK_Y} x2={(h / 24) * W} y2={TRACK_Y + TRACK_H} stroke="var(--border)" strokeWidth="2" />
              <text x={Math.min(W - 20, Math.max(14, (h / 24) * W))} y={TRACK_Y + TRACK_H + 20} fill="var(--text-muted)" fontSize="18" textAnchor="middle">
                {h}
              </text>
            </g>
          ))}

          {dayFeeds.map((f) => {
            const x = frac(f.startTime, dayStart) * W;
            const w = Math.max(4, (feedDurationMs(f) / DAY_MS) * W);
            return (
              <rect
                key={f.id}
                x={x}
                y={TRACK_Y}
                width={Math.min(w, W - x)}
                height={TRACK_H}
                fill={f.type === 'breast' ? 'var(--accent)' : 'var(--green)'}
              >
                <title>{f.type === 'breast' ? 'Breast feed' : 'Bottle feed'}</title>
              </rect>
            );
          })}

          {dayDiapers.map((d) => (
            <circle
              key={d.id}
              cx={frac(d.time, dayStart) * W}
              cy={d.poop ? 22 : TRACK_Y + TRACK_H + 34}
              r="8"
              fill={d.poop ? 'var(--warn)' : '#5ab8ff'}
            >
              <title>{d.poop ? 'Poop' : 'Pee'}</title>
            </circle>
          ))}
        </svg>
      )}

      <p className="chart__legend">
        <span className="key key--accent" /> Breast
        <span className="key key--green" /> Bottle
        <span className="key key--warn" /> Poop
        <span className="key key--blue" /> Pee
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `FeedGapChart.jsx`**

```jsx
import { gapsBetweenFeeds } from '../../feedLogic';

const W = 1000;
const H = 260;
const PAD = 30;

export function FeedGapChart({ feeds }) {
  const gaps = gapsBetweenFeeds(feeds).slice(0, 20).reverse(); // oldest left
  if (gaps.length < 2) {
    return (
      <div className="chart">
        <h3 className="chart__title">Gap between feeds</h3>
        <p className="chart__empty">Not enough feeds yet — log a few more.</p>
      </div>
    );
  }

  const hours = gaps.map((g) => g / 3600000);
  const max = Math.max(...hours, 1);
  const bw = (W - PAD * 2) / hours.length;
  const y = (h) => H - PAD - (h / max) * (H - PAD * 2);
  const avg = hours.reduce((s, v) => s + v, 0) / hours.length;

  return (
    <div className="chart">
      <h3 className="chart__title">Gap between feeds (hours)</h3>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Hours between feeds">
        {hours.map((h, i) => (
          <rect
            key={i}
            x={PAD + i * bw + bw * 0.15}
            y={y(h)}
            width={bw * 0.7}
            height={H - PAD - y(h)}
            rx="3"
            fill="var(--accent)"
          >
            <title>{h.toFixed(1)}h</title>
          </rect>
        ))}
        <line x1={PAD} y1={y(avg)} x2={W - PAD} y2={y(avg)} stroke="var(--green)" strokeWidth="2" strokeDasharray="8 6" />
        <text x={W - PAD} y={y(avg) - 8} fill="var(--green)" fontSize="18" textAnchor="end">
          avg {avg.toFixed(1)}h
        </text>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="2" />
      </svg>
      <p className="chart__caption">Oldest on the left · last {hours.length} gaps</p>
    </div>
  );
}
```

- [ ] **Step 3: Create `ChartsTab.jsx`**

```jsx
import { startOfDay } from '../../../utils/dates';
import { TimelineStrip } from './charts/TimelineStrip';
import { FeedGapChart } from './charts/FeedGapChart';

export function ChartsTab({ feedStore, diaperStore }) {
  return (
    <div className="charts">
      <TimelineStrip
        feeds={feedStore.feeds}
        diapers={diaperStore.diapers}
        initialDayStart={startOfDay(Date.now())}
      />
      <FeedGapChart feeds={feedStore.feeds} />
    </div>
  );
}
```

Replace the Charts placeholder in `BabyApp.jsx` with `<ChartsTab feedStore={feedStore} diaperStore={diaperStore} />`.

- [ ] **Step 4: Style**

Add `.charts` (column, gap 1.5rem), `.chart` (card: `--surface` background, `--border`, radius, padding), `.chart__head` (space-between row), `.chart__nav` (44px tap target, dimmed when disabled), `.chart__title`, `.chart__empty` and `.chart__caption` (muted, small), `.chart__legend` (row, wrap, small), `.key` (10px inline square with per-modifier background).

- [ ] **Step 5: Verify in the browser**

Log a few feeds and diapers at different times, then check: the timeline marks land at the right hours, longer feeds render wider, the day arrows move back and the forward arrow is disabled on today, and the gap chart's bars and average line look right. Confirm both charts show their empty state on a fresh browser profile.

- [ ] **Step 6: Run checks and commit**

```bash
npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add timeline strip and feed gap chart"
```

---

### Task 12: Daily totals and side balance charts

**Files:**
- Create: `src/features/baby/components/charts/DailyTotalsChart.jsx`
- Create: `src/features/baby/components/charts/SideBalanceChart.jsx`
- Modify: `src/features/baby/components/ChartsTab.jsx`, `src/features/baby/baby.css`

**Interfaces:**
- Consumes: `dailyFeedTotals`, `dailyDiaperTotals`, `sideBalance`, `startOfDay`, `addDays`
- Produces: `<DailyTotalsChart feeds diapers />`, `<SideBalanceChart feeds />`

- [ ] **Step 1: Create `DailyTotalsChart.jsx`**

```jsx
import { useState } from 'react';
import { dailyFeedTotals } from '../../feedLogic';
import { dailyDiaperTotals } from '../../diaperLogic';

const W = 1000;
const H = 280;
const PAD = 34;

const SERIES = [
  { id: 'feedCount', label: 'Feeds', color: 'var(--accent)' },
  { id: 'totalMl', label: 'ml', color: 'var(--green)' },
  { id: 'breastMin', label: 'Breast min', color: '#b06aff' },
  { id: 'peeCount', label: 'Pee', color: '#5ab8ff' },
  { id: 'poopCount', label: 'Poop', color: 'var(--warn)' },
];

export function DailyTotalsChart({ feeds, diapers }) {
  const [days, setDays] = useState(7);
  const [active, setActive] = useState(['feedCount', 'totalMl']);

  const now = Date.now();
  const feedRows = dailyFeedTotals(feeds, now, days);
  const diaperRows = dailyDiaperTotals(diapers, now, days);

  const rows = feedRows.map((r, i) => ({
    key: r.key,
    dayStart: r.dayStart,
    feedCount: r.feedCount,
    totalMl: r.totalMl,
    breastMin: Math.round(r.breastMs / 60000),
    peeCount: diaperRows[i].peeCount,
    poopCount: diaperRows[i].poopCount,
  }));

  const shown = SERIES.filter((s) => active.includes(s.id));
  const max = Math.max(1, ...rows.flatMap((r) => shown.map((s) => r[s.id])));
  const groupW = (W - PAD * 2) / rows.length;
  const barW = shown.length > 0 ? (groupW * 0.7) / shown.length : 0;
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);

  const toggle = (id) =>
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const hasData = rows.some((r) => r.feedCount > 0 || r.peeCount > 0 || r.poopCount > 0);

  return (
    <div className="chart">
      <div className="chart__head">
        <h3 className="chart__title">Daily totals</h3>
        <div className="chip-row">
          {[7, 14].map((d) => (
            <button key={d} className={`chip chip--sm ${days === d ? 'chip--active' : ''}`} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="chip-row chip-row--series">
        {SERIES.map((s) => (
          <button
            key={s.id}
            className={`chip chip--sm ${active.includes(s.id) ? 'chip--active' : ''}`}
            onClick={() => toggle(s.id)}
          >
            <span className="key" style={{ background: s.color }} /> {s.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <p className="chart__empty">Nothing logged in this range yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Daily totals">
          {rows.map((r, ri) =>
            shown.map((s, si) => {
              const v = r[s.id];
              const x = PAD + ri * groupW + groupW * 0.15 + si * barW;
              return (
                <rect key={`${r.key}-${s.id}`} x={x} y={y(v)} width={Math.max(2, barW - 2)} height={H - PAD - y(v)} rx="2" fill={s.color}>
                  <title>{`${r.key} · ${s.label}: ${v}`}</title>
                </rect>
              );
            })
          )}
          {rows.map((r, ri) => (
            <text
              key={`lbl-${r.key}`}
              x={PAD + ri * groupW + groupW / 2}
              y={H - PAD + 22}
              fill="var(--text-muted)"
              fontSize="16"
              textAnchor="middle"
            >
              {new Date(r.dayStart).getDate()}
            </text>
          ))}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `SideBalanceChart.jsx`**

```jsx
import { startOfDay, addDays } from '../../../../utils/dates';
import { sideBalance } from '../../feedLogic';

function Bar({ label, left, right }) {
  const total = left + right;
  const leftPct = total > 0 ? (left / total) * 100 : 50;
  const min = (ms) => Math.round(ms / 60000);

  return (
    <div className="balance">
      <div className="balance__head">
        <span>{label}</span>
        <span className="balance__nums">
          {total > 0 ? `L ${min(left)}m · R ${min(right)}m` : 'no breast feeds'}
        </span>
      </div>
      <div className="balance__track" aria-hidden={total === 0}>
        <div className="balance__left" style={{ width: `${leftPct}%` }} />
        <div className="balance__right" style={{ width: `${100 - leftPct}%` }} />
      </div>
    </div>
  );
}

export function SideBalanceChart({ feeds }) {
  const now = Date.now();
  const today = sideBalance(feeds, startOfDay(now));
  const week = sideBalance(feeds, addDays(startOfDay(now), -6));

  return (
    <div className="chart">
      <h3 className="chart__title">Left / right balance</h3>
      <Bar label="Today" left={today.leftMs} right={today.rightMs} />
      <Bar label="Last 7 days" left={week.leftMs} right={week.rightMs} />
      <p className="chart__caption">Purple is left, green is right.</p>
    </div>
  );
}
```

- [ ] **Step 3: Add both to `ChartsTab.jsx`**

Import and render `<DailyTotalsChart feeds={feedStore.feeds} diapers={diaperStore.diapers} />` and `<SideBalanceChart feeds={feedStore.feeds} />` after the gap chart.

- [ ] **Step 4: Style**

Add `.chip--sm` (smaller padding, still 40px min height), `.chip-row--series` (wrap), `.balance`, `.balance__head` (space-between, small), `.balance__nums` (muted), `.balance__track` (flex row, height 18px, radius, overflow hidden), `.balance__left` (`--accent`), `.balance__right` (`--green`).

- [ ] **Step 5: Verify in the browser**

Check: series toggles add and remove bars and rescale the axis; the 7d/14d switch works; day-number labels line up under their groups; the balance bar splits proportionally and reads "no breast feeds" with an empty dataset.

- [ ] **Step 6: Run checks and commit**

```bash
npm run lint && npm run build && npm test
git add -A
git commit -m "feat: add daily totals and side balance charts"
```

---

### Task 13: Export and import

**Files:**
- Create: `src/features/baby/backup.js`
- Test: `src/features/baby/backup.test.js`
- Modify: `src/features/baby/components/LogTab.jsx`, `src/features/baby/BabyApp.jsx`, `src/features/baby/baby.css`

**Interfaces:**
- Consumes: `feedDurationMs`, `formatDate`, `formatTime`, both stores
- Produces:
  - `buildBackup(feeds, diapers, presets): object`
  - `parseBackup(text: string): { feeds, diapers, presets }` — throws `Error` with a readable message on bad input
  - `feedsToCsv(feeds): string`
  - `diapersToCsv(diapers): string`
  - `download(filename: string, text: string, mime: string): void`

- [ ] **Step 1: Write the failing tests**

`src/features/baby/backup.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, feedsToCsv, diapersToCsv } from './backup';

const T0 = new Date(2026, 7, 3, 10, 0, 0, 0).getTime();

const feed = {
  id: 'f1', type: 'external', startTime: T0, endTime: T0 + 600000,
  milk: 'formula', method: 'bottle', offeredMl: 90, takenMl: 60, note: 'sleepy, "fussy"',
};

const diaper = { id: 'd1', time: T0, pee: true, poop: false, note: '' };

describe('backup', () => {
  it('round-trips a backup', () => {
    const text = JSON.stringify(buildBackup([feed], [diaper], [30, 60]));
    expect(parseBackup(text)).toEqual({
      feeds: [feed], diapers: [diaper], presets: [30, 60],
    });
  });

  it('includes a version', () => {
    expect(buildBackup([], [], []).version).toBe(1);
  });

  it('rejects unparseable text', () => {
    expect(() => parseBackup('{nope')).toThrow(/not valid/i);
  });

  it('rejects a file that is not a baby tracker backup', () => {
    expect(() => parseBackup(JSON.stringify({ hello: true }))).toThrow(/backup/i);
  });

  it('defaults missing presets to an empty array', () => {
    const text = JSON.stringify({ version: 1, feeds: [], diapers: [] });
    expect(parseBackup(text).presets).toEqual([]);
  });

  it('escapes quotes in CSV notes', () => {
    const csv = feedsToCsv([feed]);
    expect(csv.split('\n')[1]).toContain('"sleepy, ""fussy"""');
  });

  it('writes a CSV header row for feeds and diapers', () => {
    expect(feedsToCsv([]).split('\n')[0]).toContain('Type');
    expect(diapersToCsv([]).split('\n')[0]).toContain('Pee');
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- src/features/baby/backup.test.js`
Expected: FAIL — cannot resolve `./backup`

- [ ] **Step 3: Implement `src/features/baby/backup.js`**

```js
import { formatDate, formatTime } from '../../utils/format';
import { feedDurationMs } from './feedLogic';

export function buildBackup(feeds, diapers, presets) {
  return { version: 1, exportedAt: Date.now(), feeds, diapers, presets };
}

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || !Array.isArray(parsed.feeds) || !Array.isArray(parsed.diapers)) {
    throw new Error('That file is not a baby tracker backup.');
  }
  return {
    feeds: parsed.feeds,
    diapers: parsed.diapers,
    presets: Array.isArray(parsed.presets) ? parsed.presets : [],
  };
}

const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (header, rows) =>
  [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');

export function feedsToCsv(feeds) {
  const header = [
    'Date', 'Start', 'End', 'Duration (min)', 'Type',
    'Left (min)', 'Right (min)', 'Milk', 'Method', 'Offered (ml)', 'Taken (ml)', 'Note',
  ];
  const rows = feeds.map((f) => [
    formatDate(f.startTime),
    formatTime(f.startTime),
    formatTime(f.endTime),
    Math.round(feedDurationMs(f) / 60000),
    f.type,
    f.type === 'breast' ? Math.round(f.leftMs / 60000) : '',
    f.type === 'breast' ? Math.round(f.rightMs / 60000) : '',
    f.type === 'external' ? f.milk : '',
    f.type === 'external' ? f.method : '',
    f.type === 'external' ? f.offeredMl : '',
    f.type === 'external' ? f.takenMl : '',
    f.note ?? '',
  ]);
  return toCsv(header, rows);
}

export function diapersToCsv(diapers) {
  const header = ['Date', 'Time', 'Pee', 'Poop', 'Colour', 'Consistency', 'Amount', 'Note'];
  const rows = diapers.map((d) => [
    formatDate(d.time), formatTime(d.time),
    d.pee ? 'yes' : 'no', d.poop ? 'yes' : 'no',
    d.color ?? '', d.consistency ?? '', d.amount ?? '', d.note ?? '',
  ]);
  return toCsv(header, rows);
}

export function download(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test`
Expected: PASS — all suites green

- [ ] **Step 5: Add the backup UI to `LogTab.jsx`**

Add a row of buttons above the filter chips, driven by props `onExportJson`, `onExportFeedsCsv`, `onExportDiapersCsv`, `onImport`:

```jsx
<div className="log__backup">
  <button className="action--link" onClick={onExportJson}>Backup (JSON)</button>
  <button className="action--link" onClick={onExportFeedsCsv}>Feeds CSV</button>
  <button className="action--link" onClick={onExportDiapersCsv}>Diapers CSV</button>
  <label className="action--link">
    Import
    <input
      type="file"
      accept="application/json,.json"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onImport(file);
        e.target.value = '';
      }}
    />
  </label>
</div>
```

- [ ] **Step 6: Wire the handlers in `BabyApp.jsx`**

```jsx
const today = new Date().toISOString().slice(0, 10);

const handleExportJson = () =>
  download(
    `baby-tracker-${today}.json`,
    JSON.stringify(buildBackup(feedStore.feeds, diaperStore.diapers, feedStore.quantityPresets), null, 2),
    'application/json'
  );

const handleImport = async (file) => {
  let data;
  try {
    data = parseBackup(await file.text());
  } catch (err) {
    setToast({ message: err.message });
    return;
  }
  const total = data.feeds.length + data.diapers.length;
  if (!window.confirm(
    `Replace all local data with ${data.feeds.length} feeds and ${data.diapers.length} diapers from this backup? This cannot be undone.`
  )) return;
  feedStore.replaceAll(data.feeds);
  diaperStore.replaceAll(data.diapers);
  if (data.presets.length) feedStore.setQuantityPresets(data.presets);
  setToast({ message: `Imported ${total} records` });
};
```

Plus `handleExportFeedsCsv` and `handleExportDiapersCsv` calling `download` with `feedsToCsv(feedStore.feeds)` / `diapersToCsv(diaperStore.diapers)` and mime `text/csv`. Pass all four to `LogTab`.

- [ ] **Step 7: Style**

Add `.log__backup` (wrap row, gap) and `.action--link` (transparent, `--accent` text, underline-free, 44px min height, `cursor: pointer`; the `<label>` variant needs `display: inline-flex; align-items: center`).

- [ ] **Step 8: Verify the full flow in the browser**

Export a JSON backup, note the record counts, delete some entries, then import the file and confirm the data comes back exactly. Open a feeds CSV in a spreadsheet and confirm the columns line up and a note containing a comma stays in one cell. Try importing a random non-backup JSON file and confirm you get the error toast rather than data loss.

- [ ] **Step 9: Final full check**

```bash
npm run lint && npm run build && npm test
```

Then load the built app and walk the primary paths one more time: three-tap bottle feed, one-tap diaper, breast feed with a side switch, edit an entry's date, and confirm the contraction tracker still works from the mode switch.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add JSON and CSV export with backup import"
```

---

## Self-Review Notes

Spec coverage checked section by section:

| Spec requirement | Task |
|---|---|
| Mode switch, contraction app preserved | 3 |
| Bottom tabs Home/Charts/Log | 7 |
| Versioned storage, corrupt-data backup | 1 |
| Day-of-start attribution in one place | 2 |
| Feed/diaper/active data shapes | 4, 5, 6 |
| Per-side timers, switch preserves time | 4, 8 |
| Active session survives app close | 4, 5, 8 |
| 6-hour stale guard opens the edit sheet | 4, 5, 10 |
| 2-hour long-feed prompt, never auto-stop | 8 |
| Zero-duration breast feed not saved | 4, 8 |
| Suggested opposite side | 4, 8 |
| Bottle: milk, method, offered, taken, duration | 9 |
| Remembered bottle preferences | 4, 5, 9 |
| Quantity chips + ±10 stepper, editable presets | 9 |
| One-tap diaper with undo | 6, 7 |
| Optional poop details on edit only | 10 |
| Everything editable including date and time | 10 |
| Four charts with empty states | 11, 12 |
| JSON + CSV export, JSON import | 13 |
| Vitest covering the listed logic | 1, 2, 4, 5, 6, 13 |
