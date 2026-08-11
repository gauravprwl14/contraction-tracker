# Baby Tracker v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the baby tracker's presentation layer so a running feed is always reachable, starting a second feed can never silently destroy the first, the log is filterable down to an individual record, and the theme is a calm teal/clay system with no purple, no gradients, and no emoji icons.

**Architecture:** The pure-logic modules (`feedLogic.js`, `diaperLogic.js`, `backup.js`, `utils/*`) and all four localStorage keys stay as they are — every defect being fixed lives in the UI layer. The modal `BreastFeedSheet`/`ExternalFeedSheet` pair is replaced by an `ActiveSessionCard` rendered inline on Home plus an `ActiveSessionBar` pinned above the tab bar elsewhere, so navigation never touches session state. New pure modules (`sessionGuard.js`, `logFilter.js`, `pauseSession`/`resumeSession`) carry the new behaviour and are unit-tested; the components around them are thin.

**Tech Stack:** React 19, Vite 8, Vitest 3, plain CSS with custom properties. No new dependencies. No React Testing Library in this repo — component behaviour is verified manually via `npm run dev`; all automated tests are pure-function tests.

**Spec:** `docs/superpowers/specs/2026-08-04-baby-tracker-v2-design.md`

## Global Constraints

- **No new dependencies.** Do not add packages to `package.json`.
- **Storage keys are frozen:** `baby_tracker_feeds_v1`, `baby_tracker_diapers_v1`, `baby_tracker_active_v1`, `baby_tracker_prefs_v1`, `app_mode_v1`. Existing user data must load with no migration step. New session field `pausedAt` is additive; absent means running.
- **No colour literals outside `src/styles/tokens.css`.** Every other stylesheet references `var(--…)`.
- **No purple, no gradients, no emoji used as an icon.** Emoji are allowed only inside user-authored note text.
- **Palette (exact values):** light — bg `#FAF9F7`, surface `#FFFFFF`, surface-2 `#F2F0EC`, border `#E4E1DB`, text `#1A1D21`, text-muted `#6B7078`, accent `#0E7C6B`, stop `#B4472E`. Dark — bg `#14161A`, surface `#1C1F24`, surface-2 `#23272E`, border `#2A2E35`, text `#ECEDEF`, text-muted `#9098A2`, accent `#2AA391`, stop `#E0674A`.
- **Night window:** `NIGHT_START_HOUR = 22`, `NIGHT_END_HOUR = 6`, exported from `src/features/baby/log/logFilter.js`.
- **Run `npm test` and `npm run lint` before every commit.** Both must be clean.
- **`react-hooks/purity` is enforced.** Never call `Date.now()` during render — thread `now` down from the clock hook.
- Every commit uses Conventional Commits (`feat:`, `refactor:`, `style:`, `test:`, `chore:`).

## File Structure

| File | Responsibility |
|---|---|
| `src/styles/tokens.css` | NEW — the only file containing colour literals; also spacing, radii, type scale |
| `src/styles/base.css` | REWRITTEN — reset, app shell, header, footer, tab bar |
| `src/App.jsx` | MODIFIED — theme state + toggle, no gradient title |
| `src/features/baby/icons/Icon.jsx` | NEW — inline SVG icon set, replaces every emoji |
| `src/features/baby/session/sessionGuard.js` | NEW — `decideStart()` pure decision, tested |
| `src/features/baby/session/ActiveSessionCard.jsx` | NEW — live session card on Home (breast + bottle variants) |
| `src/features/baby/session/ActiveSessionBar.jsx` | NEW — mini bar above the tab bar on other tabs |
| `src/features/baby/session/StartSessionGuard.jsx` | NEW — three-choice confirm dialog |
| `src/features/baby/log/logFilter.js` | NEW — pure filter predicates, tested |
| `src/features/baby/log/useLogFilter.js` | NEW — filter state hook |
| `src/features/baby/log/LogFilterBar.jsx` | NEW — chips, date range, band, search |
| `src/features/baby/log/LogEntryRow.jsx` | NEW — one record row |
| `src/features/baby/screens/HomeScreen.jsx` | NEW — replaces `components/HomeScreen.jsx` |
| `src/features/baby/screens/LogScreen.jsx` | NEW — replaces `components/LogTab.jsx` |
| `src/features/baby/screens/ChartsScreen.jsx` | MOVED from `components/ChartsTab.jsx` |
| `src/features/baby/hooks/useNow.js` | NEW — single clock for the whole app |
| `src/features/baby/hooks/useFeedStore.js` | MODIFIED — accepts `now`; pause/resume; hardened restore |
| `src/features/baby/hooks/useDiaperStore.js` | MODIFIED — accepts `now` |
| `src/features/baby/feedLogic.js` | MODIFIED — `pauseSession`, `resumeSession`, paused-aware `sideElapsedMs` |
| `src/features/baby/BabyApp.jsx` | REWRITTEN — shell, clock, `onStart` guard, dialogs |
| `src/features/baby/baby.css` | REWRITTEN — token-based |
| `src/features/contractions/contractions.css` | MODIFIED — colour literals → tokens |
| DELETED | `components/BreastFeedSheet.jsx`, `components/ExternalFeedSheet.jsx`, `components/HomeScreen.jsx`, `components/LogTab.jsx`, `components/ChartsTab.jsx` |

---

### Task 1: Design tokens and app shell

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/styles/base.css` (full rewrite), `src/main.jsx`, `src/App.jsx`

**Interfaces:**
- Consumes: nothing
- Produces: the CSS custom properties every later task uses — `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-soft`, `--accent-ink`, `--stop`, `--stop-soft`, `--amber`, `--slate`, `--space-1`…`--space-6`, `--radius-sm/md/lg/pill`, `--fs-xs/sm/md/lg/xl/timer`, `--shadow-1`. Also a `theme` value of `'system' | 'light' | 'dark'` persisted under `app_theme_v1` and reflected as `document.documentElement.dataset.theme`.

- [ ] **Step 1: Create the token file**

Create `src/styles/tokens.css`. The dark block is written twice on purpose — once behind the media query with a `:not([data-theme='light'])` escape hatch, once for an explicit override. Plain CSS has no way to share it without a preprocessor.

```css
:root {
  /* colour — light */
  --bg: #FAF9F7;
  --surface: #FFFFFF;
  --surface-2: #F2F0EC;
  --border: #E4E1DB;
  --text: #1A1D21;
  --text-muted: #6B7078;
  --accent: #0E7C6B;
  --accent-soft: #E3F1EE;
  --accent-ink: #FFFFFF;
  --stop: #B4472E;
  --stop-soft: #F7E7E2;
  --amber: #A66A00;
  --slate: #4A5560;

  /* spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;

  /* radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-pill: 999px;

  /* type */
  --font: 'SF Pro Text', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --font-num: 'SF Mono', ui-monospace, 'Roboto Mono', monospace;
  --fs-xs: 0.72rem;
  --fs-sm: 0.82rem;
  --fs-md: 0.94rem;
  --fs-lg: 1.15rem;
  --fs-xl: 1.5rem;
  --fs-timer: 2.75rem;

  --shadow-1: 0 1px 2px rgba(20, 22, 26, 0.06), 0 2px 8px rgba(20, 22, 26, 0.04);

  color-scheme: light dark;
  font-size: 16px;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #14161A;
    --surface: #1C1F24;
    --surface-2: #23272E;
    --border: #2A2E35;
    --text: #ECEDEF;
    --text-muted: #9098A2;
    --accent: #2AA391;
    --accent-soft: #12332F;
    --accent-ink: #0B1412;
    --stop: #E0674A;
    --stop-soft: #3A211B;
    --amber: #D9A441;
    --slate: #8894A2;
    --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
  }
}

:root[data-theme='dark'] {
  --bg: #14161A;
  --surface: #1C1F24;
  --surface-2: #23272E;
  --border: #2A2E35;
  --text: #ECEDEF;
  --text-muted: #9098A2;
  --accent: #2AA391;
  --accent-soft: #12332F;
  --accent-ink: #0B1412;
  --stop: #E0674A;
  --stop-soft: #3A211B;
  --amber: #D9A441;
  --slate: #8894A2;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 2: Import tokens before everything else**

`src/main.jsx` currently imports `./styles/base.css`. Add the token import on the line above it so tokens are defined first:

```jsx
import './styles/tokens.css';
import './styles/base.css';
```

- [ ] **Step 3: Rewrite base.css**

Replace the entire contents of `src/styles/base.css`. Note what goes: the `--accent: #7c6aff` block (tokens own colour now) and `.app-title`'s gradient text clip.

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { margin: 0; padding: 0; }
#root { min-height: 100dvh; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
}

button { font: inherit; color: inherit; cursor: pointer; }

.app {
  max-width: 640px;
  margin: 0 auto;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 0 var(--space-4);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) 0 var(--space-3);
}

.app-title {
  font-size: var(--fs-lg);
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--text);
}

.app-subtitle {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  margin-top: 2px;
}

.app-main { flex: 1; padding-bottom: var(--space-6); }

.app-footer {
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--text-muted);
  padding: var(--space-4) 0;
  border-top: 1px solid var(--border);
}

/* ---- Segmented control (mode switch, theme switch) ---- */
.seg {
  display: inline-flex;
  gap: 2px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 2px;
}

.seg__btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--fs-xs);
  font-weight: 500;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  line-height: 1.6;
}

.seg__btn--active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-1);
}

.seg__btn:focus-visible,
.app :where(button):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Add the theme toggle to App.jsx**

Rewrite `src/App.jsx`. The mode switch keeps its behaviour but adopts the shared `.seg` classes; the theme switch is new; the gradient title is gone.

```jsx
import { useState, useEffect } from 'react';
import ContractionsApp from './features/contractions/ContractionsApp';
import BabyApp from './features/baby/BabyApp';
import { loadValue, saveValue } from './utils/storage';

const MODE_KEY = 'app_mode_v1';
const THEME_KEY = 'app_theme_v1';

const MODES = [
  { id: 'baby', label: 'Baby' },
  { id: 'contractions', label: 'Contractions' },
];

const THEMES = [
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function Seg({ label, options, value, onChange }) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          className={`seg__btn ${value === o.id ? 'seg__btn--active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(() => loadValue(MODE_KEY, 'baby'));
  const [theme, setTheme] = useState(() => loadValue(THEME_KEY, 'system'));

  useEffect(() => { saveValue(MODE_KEY, mode); }, [mode]);

  useEffect(() => {
    saveValue(THEME_KEY, theme);
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">
            {mode === 'baby' ? 'Baby Tracker' : 'Contraction Tracker'}
          </h1>
          <p className="app-subtitle">Offline · all data stays on this device</p>
        </div>
        <Seg label="Theme" options={THEMES} value={theme} onChange={setTheme} />
      </header>

      <Seg label="App mode" options={MODES} value={mode} onChange={setMode} />

      {mode === 'baby' ? <BabyApp /> : <ContractionsApp />}

      <footer className="app-footer">
        All data stored locally in your browser. Nothing leaves this device.
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run `npm run lint` — expect clean. Run `npm run dev` and open the app. Expected: header title is plain text (no purple gradient), an Auto/Light/Dark control sits on the right, switching to Dark immediately darkens the background, and the choice survives a page reload. The baby and contraction screens below will still look wrong — they are retreated in Tasks 10 and 11.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/styles/base.css src/main.jsx src/App.jsx
git commit -m "feat: add design tokens, theme toggle, and retheme the app shell"
```

---

### Task 2: Icon set

**Files:**
- Create: `src/features/baby/icons/Icon.jsx`

**Interfaces:**
- Consumes: nothing
- Produces: `<Icon name size className />` where `name` is one of `'breast' | 'bottle' | 'pee' | 'poop' | 'play' | 'pause' | 'stop' | 'trash' | 'edit' | 'filter' | 'search' | 'close' | 'chevron-down' | 'chevron-up' | 'undo' | 'download' | 'upload'`. Default `size` is 20. Unknown names render `null`.

- [ ] **Step 1: Create the icon component**

```jsx
const PATHS = {
  breast: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>,
  bottle: <><path d="M9.5 3h5" /><path d="M10 3v2.4A4 4 0 0 0 8.8 8.2V19a2 2 0 0 0 2 2h2.4a2 2 0 0 0 2-2V8.2A4 4 0 0 0 14 5.4V3" /><path d="M8.8 10.5h6.4" /></>,
  pee: <path d="M12 3.2 7.6 9.4a5.5 5.5 0 1 0 8.8 0z" />,
  poop: <><path d="M10.5 5.5a2 2 0 0 1 3.2 1.6" /><path d="M8.5 12a2.75 2.75 0 0 1 2.75-2.75h3A2.75 2.75 0 0 1 17 12" /><path d="M6 18.25A2.75 2.75 0 0 1 8.75 15.5h6.5A2.75 2.75 0 0 1 18 18.25 2.75 2.75 0 0 1 15.25 21h-6.5A2.75 2.75 0 0 1 6 18.25z" /></>,
  play: <path d="M8 5.5v13l10-6.5z" />,
  pause: <><path d="M9.5 5.5v13" /><path d="M14.5 5.5v13" /></>,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  trash: <><path d="M4.5 7h15" /><path d="M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7l.8 11a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-11" /></>,
  edit: <><path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" /><path d="M14.5 6.5l3 3" /></>,
  filter: <><path d="M4.5 6.5h15" /><path d="M7.5 12h9" /><path d="M10.5 17.5h3" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M15.5 15.5 20 20" /></>,
  close: <><path d="M6.5 6.5l11 11" /><path d="M17.5 6.5l-11 11" /></>,
  'chevron-down': <path d="M6.5 9.5 12 15l5.5-5.5" />,
  'chevron-up': <path d="M6.5 14.5 12 9l5.5 5.5" />,
  undo: <><path d="M4.5 9.5h9a5.5 5.5 0 0 1 0 11H9" /><path d="M8 5.5 4 9.5l4 4" /></>,
  download: <><path d="M12 4v11" /><path d="M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></>,
  upload: <><path d="M12 19V8" /><path d="M7.5 12.5 12 8l4.5 4.5" /><path d="M4.5 4.5h15" /></>,
};

export function Icon({ name, size = 20, className = '' }) {
  const children = PATHS[name];
  if (!children) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
```

- [ ] **Step 2: Verify**

Run `npm run lint`. Expected: clean. There is no automated test — the icons are consumed and visually checked in Tasks 7, 9, and 10.

- [ ] **Step 3: Commit**

```bash
git add src/features/baby/icons/Icon.jsx
git commit -m "feat: add inline SVG icon set to replace emoji"
```

---

### Task 3: Pause and resume in feedLogic (TDD)

**Files:**
- Modify: `src/features/baby/feedLogic.js`
- Test: `src/features/baby/feedLogic.test.js` (append a new `describe` block)

**Interfaces:**
- Consumes: existing `createBreastSession`, `commitSide`, `sideElapsedMs`, `finalizeBreastFeed` from `feedLogic.js`
- Produces: `pauseSession(active, now) -> session`, `resumeSession(active, now) -> session`. A paused breast session carries `pausedAt: <ms timestamp>`; a running one has no `pausedAt` key. `sideElapsedMs` returns the frozen committed value while paused.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/baby/feedLogic.test.js`. Add `pauseSession, resumeSession` to the existing import list from `./feedLogic` at the top of the file. The helpers `MIN`, `at`, and `T0` already exist at the top of that file — reuse them.

```js
describe('pause and resume', () => {
  it('commits the running side and freezes accrual when paused', () => {
    const a = createBreastSession('left', T0);
    const paused = pauseSession(a, T0 + 5 * MIN);
    expect(paused.leftMs).toBe(5 * MIN);
    expect(paused.pausedAt).toBe(T0 + 5 * MIN);
    expect(sideElapsedMs(paused, 'left', T0 + 30 * MIN)).toBe(5 * MIN);
  });

  it('resumes accrual from the moment of resume, not from the pause', () => {
    const paused = pauseSession(createBreastSession('left', T0), T0 + 5 * MIN);
    const resumed = resumeSession(paused, T0 + 25 * MIN);
    expect(resumed.pausedAt).toBeUndefined();
    expect(sideElapsedMs(resumed, 'left', T0 + 27 * MIN)).toBe(7 * MIN);
  });

  it('leaves the idle side alone while paused', () => {
    const a = switchSide(createBreastSession('left', T0), 'right', T0 + 4 * MIN);
    const paused = pauseSession(a, T0 + 6 * MIN);
    expect(sideElapsedMs(paused, 'left', T0 + 60 * MIN)).toBe(4 * MIN);
    expect(sideElapsedMs(paused, 'right', T0 + 60 * MIN)).toBe(2 * MIN);
  });

  it('is a no-op on an already paused session', () => {
    const paused = pauseSession(createBreastSession('left', T0), T0 + 5 * MIN);
    expect(pauseSession(paused, T0 + 9 * MIN)).toBe(paused);
  });

  it('is a no-op on a running session passed to resume', () => {
    const a = createBreastSession('left', T0);
    expect(resumeSession(a, T0 + 5 * MIN)).toBe(a);
  });

  it('is a no-op on external sessions and on null', () => {
    const ext = createExternalSession(T0);
    expect(pauseSession(ext, T0 + MIN)).toBe(ext);
    expect(resumeSession(ext, T0 + MIN)).toBe(ext);
    expect(pauseSession(null, T0)).toBe(null);
    expect(resumeSession(null, T0)).toBe(null);
  });

  it('survives a JSON round trip through localStorage', () => {
    const paused = pauseSession(createBreastSession('left', T0), T0 + 5 * MIN);
    const revived = JSON.parse(JSON.stringify(paused));
    expect(sideElapsedMs(revived, 'left', T0 + 60 * MIN)).toBe(5 * MIN);
  });

  it('finalizes a paused feed without counting the paused stretch', () => {
    const paused = pauseSession(createBreastSession('left', T0), T0 + 5 * MIN);
    const feed = finalizeBreastFeed(paused, T0 + 45 * MIN);
    expect(feed.leftMs).toBe(5 * MIN);
    expect(feed.rightMs).toBe(0);
    expect(feed.endTime).toBe(T0 + 45 * MIN);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/baby/feedLogic.test.js`
Expected: FAIL — `pauseSession is not a function`.

- [ ] **Step 3: Implement**

In `src/features/baby/feedLogic.js`, replace the existing `sideElapsedMs` (currently at lines 45–50) with the paused-aware version, and add the two new functions directly after `switchSide`:

```js
export function pauseSession(active, now) {
  if (!active || active.type !== 'breast' || active.pausedAt) return active;
  return { ...commitSide(active, now), pausedAt: now };
}

export function resumeSession(active, now) {
  if (!active || active.type !== 'breast' || !active.pausedAt) return active;
  const { pausedAt, ...rest } = active;
  void pausedAt;
  return { ...rest, sideStartedAt: now };
}

export function sideElapsedMs(active, side, now) {
  if (!active || active.type !== 'breast') return 0;
  const base = side === 'left' ? active.leftMs : active.rightMs;
  if (active.activeSide !== side || active.pausedAt) return base;
  return base + Math.max(0, now - active.sideStartedAt);
}
```

`void pausedAt;` exists only to satisfy `no-unused-vars` on the destructured discard. If the repo's eslint config already permits unused rest siblings, drop that line.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS, including every pre-existing test. `finalizeBreastFeed` already routes through `sideElapsedMs`, so it inherits pause-awareness with no edit.

- [ ] **Step 5: Commit**

```bash
git add src/features/baby/feedLogic.js src/features/baby/feedLogic.test.js
git commit -m "feat: add pause and resume to breast feed sessions"
```

---

### Task 4: Start-session guard decision (TDD)

**Files:**
- Create: `src/features/baby/session/sessionGuard.js`
- Test: `src/features/baby/session/sessionGuard.test.js`

**Interfaces:**
- Consumes: session objects produced by `feedLogic.js`
- Produces: `decideStart(active, requestedType) -> {action:'start', type} | {action:'confirm', running, requested}` and `sessionLabel(session) -> 'breast feed' | 'bottle feed' | null`. `requestedType` is `'breast' | 'bottle'`; note that a bottle session's stored `type` is `'external'`, and `decideStart` handles that mapping.

- [ ] **Step 1: Write the failing tests**

Create `src/features/baby/session/sessionGuard.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { decideStart, sessionLabel } from './sessionGuard';
import { createBreastSession, createExternalSession } from '../feedLogic';

const T0 = new Date(2026, 7, 4, 10, 0, 0, 0).getTime();

describe('decideStart', () => {
  it('starts immediately when nothing is running', () => {
    expect(decideStart(null, 'breast')).toEqual({ action: 'start', type: 'breast' });
    expect(decideStart(null, 'bottle')).toEqual({ action: 'start', type: 'bottle' });
  });

  it('asks for confirmation when a breast feed is running and a bottle is requested', () => {
    const running = createBreastSession('left', T0);
    expect(decideStart(running, 'bottle')).toEqual({
      action: 'confirm', running, requested: 'bottle',
    });
  });

  it('asks for confirmation when a bottle is running and a breast feed is requested', () => {
    const running = createExternalSession(T0);
    expect(decideStart(running, 'breast')).toEqual({
      action: 'confirm', running, requested: 'breast',
    });
  });

  it('asks for confirmation on a same-type restart', () => {
    const running = createBreastSession('left', T0);
    expect(decideStart(running, 'breast').action).toBe('confirm');
  });
});

describe('sessionLabel', () => {
  it('names each session type in human terms', () => {
    expect(sessionLabel(createBreastSession('left', T0))).toBe('breast feed');
    expect(sessionLabel(createExternalSession(T0))).toBe('bottle feed');
    expect(sessionLabel(null)).toBe(null);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/baby/session/sessionGuard.test.js`
Expected: FAIL — cannot resolve `./sessionGuard`.

- [ ] **Step 3: Implement**

Create `src/features/baby/session/sessionGuard.js`:

```js
// Only one feed session may exist at a time. Starting a second one must never
// silently overwrite the first — the caller renders a confirm dialog instead.
export function decideStart(active, requestedType) {
  if (!active) return { action: 'start', type: requestedType };
  return { action: 'confirm', running: active, requested: requestedType };
}

export function sessionLabel(session) {
  if (!session) return null;
  return session.type === 'breast' ? 'breast feed' : 'bottle feed';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/baby/session/sessionGuard.js src/features/baby/session/sessionGuard.test.js
git commit -m "feat: add single-session start guard decision logic"
```

---

### Task 5: Log filter predicates (TDD)

**Files:**
- Create: `src/features/baby/log/logFilter.js`
- Test: `src/features/baby/log/logFilter.test.js`

**Interfaces:**
- Consumes: `startOfDay`, `endOfDay`, `addDays` from `src/utils/dates.js`
- Produces:
  - `NIGHT_START_HOUR = 22`, `NIGHT_END_HOUR = 6`
  - `DEFAULT_FILTER` — the filter object shape used by `useLogFilter` and `LogFilterBar`
  - `rangeBounds(range, now) -> {from, to}`
  - `entryTypes(entry) -> string[]`
  - `matchesType(entry, types, side, milk) -> boolean`
  - `matchesBand(entry, band) -> boolean`
  - `matchesQuery(entry, q) -> boolean`
  - `applyFilters(entries, filter, now) -> entries`
  - `isDefaultFilter(filter) -> boolean`
  - An **entry** is `{kind: 'feed'|'diaper', time: <ms>, item: <feed|diaper record>}` — the same shape the current `LogTab` builds.
  - `filter.types` is an **array**, not a `Set` (the spec said `Set`; an array keeps React state comparisons and any future serialisation trivial, and the predicates never need set semantics).

- [ ] **Step 1: Write the failing tests**

Create `src/features/baby/log/logFilter.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  NIGHT_START_HOUR, NIGHT_END_HOUR, DEFAULT_FILTER, rangeBounds, entryTypes,
  matchesType, matchesBand, matchesQuery, applyFilters, isDefaultFilter,
} from './logFilter';

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();
const NOW = at(2026, 8, 4, 12, 0);
const MIN = 60000;

const feedEntry = (over = {}, itemOver = {}) => ({
  kind: 'feed',
  time: NOW,
  item: {
    id: 'f1', type: 'breast', startTime: NOW, endTime: NOW + 10 * MIN,
    leftMs: 6 * MIN, rightMs: 0, lastSide: 'left', note: '', ...itemOver,
  },
  ...over,
});

const bottleEntry = (itemOver = {}) => ({
  kind: 'feed',
  time: NOW,
  item: {
    id: 'b1', type: 'external', startTime: NOW, endTime: NOW + 5 * MIN,
    milk: 'formula', method: 'bottle', offeredMl: 90, takenMl: 60, note: '', ...itemOver,
  },
});

const diaperEntry = (itemOver = {}) => ({
  kind: 'diaper',
  time: NOW,
  item: { id: 'd1', time: NOW, pee: true, poop: false, note: '', ...itemOver },
});

describe('rangeBounds', () => {
  it('bounds today to the calendar day', () => {
    expect(rangeBounds({ preset: 'today' }, NOW)).toEqual({
      from: at(2026, 8, 4), to: at(2026, 8, 5) - 1,
    });
  });

  it('bounds 7d to six days back through the end of today', () => {
    expect(rangeBounds({ preset: '7d' }, NOW)).toEqual({
      from: at(2026, 7, 29), to: at(2026, 8, 5) - 1,
    });
  });

  it('bounds 30d to twenty-nine days back through the end of today', () => {
    expect(rangeBounds({ preset: '30d' }, NOW).from).toBe(at(2026, 7, 6));
  });

  it('is unbounded for all', () => {
    expect(rangeBounds({ preset: 'all' }, NOW)).toEqual({ from: -Infinity, to: Infinity });
  });

  it('expands a custom range to whole days', () => {
    expect(rangeBounds(
      { preset: 'custom', from: at(2026, 8, 1, 14, 30), to: at(2026, 8, 2, 3, 0) },
      NOW,
    )).toEqual({ from: at(2026, 8, 1), to: at(2026, 8, 3) - 1 });
  });

  it('swaps a reversed custom range instead of returning nothing', () => {
    expect(rangeBounds(
      { preset: 'custom', from: at(2026, 8, 2), to: at(2026, 8, 1) },
      NOW,
    )).toEqual({ from: at(2026, 8, 1), to: at(2026, 8, 3) - 1 });
  });

  it('falls back to unbounded when a custom end is missing', () => {
    expect(rangeBounds({ preset: 'custom', from: at(2026, 8, 1), to: null }, NOW))
      .toEqual({ from: -Infinity, to: Infinity });
  });
});

describe('entryTypes', () => {
  it('maps feeds to breast or bottle', () => {
    expect(entryTypes(feedEntry())).toEqual(['breast']);
    expect(entryTypes(bottleEntry())).toEqual(['bottle']);
  });

  it('maps a pee+poop diaper to both types', () => {
    expect(entryTypes(diaperEntry({ pee: true, poop: true }))).toEqual(['pee', 'poop']);
    expect(entryTypes(diaperEntry({ pee: false, poop: true }))).toEqual(['poop']);
  });
});

describe('matchesType', () => {
  it('matches everything when no type is selected', () => {
    expect(matchesType(feedEntry(), [], 'any', 'any')).toBe(true);
    expect(matchesType(diaperEntry(), [], 'any', 'any')).toBe(true);
  });

  it('ORs the selected types together', () => {
    expect(matchesType(bottleEntry(), ['breast', 'bottle'], 'any', 'any')).toBe(true);
    expect(matchesType(diaperEntry(), ['breast', 'bottle'], 'any', 'any')).toBe(false);
  });

  it('matches a pee+poop diaper under either type', () => {
    const both = diaperEntry({ pee: true, poop: true });
    expect(matchesType(both, ['pee'], 'any', 'any')).toBe(true);
    expect(matchesType(both, ['poop'], 'any', 'any')).toBe(true);
  });

  it('drills into breast side, requiring nonzero time on that side', () => {
    const leftOnly = feedEntry({}, { leftMs: 6 * MIN, rightMs: 0 });
    expect(matchesType(leftOnly, ['breast'], 'left', 'any')).toBe(true);
    expect(matchesType(leftOnly, ['breast'], 'right', 'any')).toBe(false);
  });

  it('drills into bottle milk type', () => {
    expect(matchesType(bottleEntry({ milk: 'formula' }), ['bottle'], 'any', 'formula')).toBe(true);
    expect(matchesType(bottleEntry({ milk: 'formula' }), ['bottle'], 'any', 'expressed')).toBe(false);
  });

  it('ignores side and milk for types that are not selected', () => {
    expect(matchesType(diaperEntry(), ['pee'], 'right', 'expressed')).toBe(true);
  });
});

describe('matchesBand', () => {
  it('treats the window as wrapping midnight', () => {
    expect(NIGHT_START_HOUR).toBe(22);
    expect(NIGHT_END_HOUR).toBe(6);
    const night = (h) => matchesBand({ ...feedEntry(), time: at(2026, 8, 4, h, 0) }, 'night');
    expect(night(23)).toBe(true);
    expect(night(2)).toBe(true);
    expect(night(5)).toBe(true);
    expect(night(6)).toBe(false);
    expect(night(21)).toBe(false);
    expect(night(22)).toBe(true);
  });

  it('day is the exact complement of night', () => {
    const e = { ...feedEntry(), time: at(2026, 8, 4, 14, 0) };
    expect(matchesBand(e, 'day')).toBe(true);
    expect(matchesBand(e, 'night')).toBe(false);
  });

  it('matches everything on any', () => {
    expect(matchesBand({ ...feedEntry(), time: at(2026, 8, 4, 3, 0) }, 'any')).toBe(true);
  });
});

describe('matchesQuery', () => {
  it('matches notes case-insensitively on a substring', () => {
    const e = feedEntry({}, { note: 'Fussy, spat up A LOT' });
    expect(matchesQuery(e, 'spat')).toBe(true);
    expect(matchesQuery(e, 'a lot')).toBe(true);
    expect(matchesQuery(e, 'sleepy')).toBe(false);
  });

  it('matches everything on an empty or whitespace query', () => {
    expect(matchesQuery(feedEntry({}, { note: '' }), '')).toBe(true);
    expect(matchesQuery(feedEntry({}, { note: '' }), '   ')).toBe(true);
  });

  it('does not throw when note is missing', () => {
    expect(matchesQuery({ kind: 'feed', time: NOW, item: { id: 'x' } }, 'z')).toBe(false);
  });
});

describe('applyFilters', () => {
  const entries = [
    { ...bottleEntry({ note: 'sleepy' }), time: at(2026, 8, 4, 23, 0) },
    { ...feedEntry(), time: at(2026, 8, 4, 14, 0) },
    { ...diaperEntry({ poop: true }), time: at(2026, 8, 4, 3, 0) },
    { ...feedEntry({}, { id: 'old' }), time: at(2026, 5, 1, 12, 0) },
  ];

  it('ANDs every dimension together', () => {
    const out = applyFilters(entries, {
      range: { preset: '7d' }, types: ['bottle'], side: 'any',
      milk: 'formula', band: 'night', q: 'sleep',
    }, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].item.id).toBe('b1');
  });

  it('drops entries outside the range', () => {
    const out = applyFilters(entries, { ...DEFAULT_FILTER }, NOW);
    expect(out.map((e) => e.item.id)).not.toContain('old');
  });

  it('keeps the order it was given', () => {
    const out = applyFilters(entries, { ...DEFAULT_FILTER, range: { preset: 'all' } }, NOW);
    expect(out.map((e) => e.time)).toEqual([...out.map((e) => e.time)].sort((a, b) => b - a));
  });
});

describe('isDefaultFilter', () => {
  it('recognises the default and any deviation from it', () => {
    expect(isDefaultFilter(DEFAULT_FILTER)).toBe(true);
    expect(isDefaultFilter({ ...DEFAULT_FILTER, types: ['poop'] })).toBe(false);
    expect(isDefaultFilter({ ...DEFAULT_FILTER, band: 'night' })).toBe(false);
    expect(isDefaultFilter({ ...DEFAULT_FILTER, q: 'x' })).toBe(false);
    expect(isDefaultFilter({ ...DEFAULT_FILTER, range: { preset: 'all' } })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/baby/log/logFilter.test.js`
Expected: FAIL — cannot resolve `./logFilter`.

- [ ] **Step 3: Implement**

Create `src/features/baby/log/logFilter.js`:

```js
import { startOfDay, endOfDay, addDays } from '../../../utils/dates';

export const NIGHT_START_HOUR = 22;
export const NIGHT_END_HOUR = 6;

export const RANGE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' },
];

export const DEFAULT_FILTER = {
  range: { preset: '7d', from: null, to: null },
  types: [],
  side: 'any',
  milk: 'any',
  band: 'any',
  q: '',
};

export function rangeBounds(range, now) {
  const preset = range?.preset ?? 'all';
  if (preset === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  if (preset === '7d') return { from: addDays(startOfDay(now), -6), to: endOfDay(now) };
  if (preset === '30d') return { from: addDays(startOfDay(now), -29), to: endOfDay(now) };
  if (preset === 'custom') {
    if (range.from == null || range.to == null) return { from: -Infinity, to: Infinity };
    const lo = Math.min(range.from, range.to);
    const hi = Math.max(range.from, range.to);
    return { from: startOfDay(lo), to: endOfDay(hi) };
  }
  return { from: -Infinity, to: Infinity };
}

export function entryTypes(entry) {
  if (entry.kind === 'diaper') {
    const types = [];
    if (entry.item.pee) types.push('pee');
    if (entry.item.poop) types.push('poop');
    return types;
  }
  return [entry.item.type === 'breast' ? 'breast' : 'bottle'];
}

export function matchesType(entry, types, side, milk) {
  if (!types || types.length === 0) return true;
  const mine = entryTypes(entry);
  return types.some((t) => {
    if (!mine.includes(t)) return false;
    if (t === 'breast' && side !== 'any') {
      return (side === 'left' ? entry.item.leftMs : entry.item.rightMs) > 0;
    }
    if (t === 'bottle' && milk !== 'any') return entry.item.milk === milk;
    return true;
  });
}

export function matchesBand(entry, band) {
  if (band === 'any') return true;
  const hour = new Date(entry.time).getHours();
  const isNight = hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  return band === 'night' ? isNight : !isNight;
}

export function matchesQuery(entry, q) {
  const needle = (q ?? '').trim().toLowerCase();
  if (!needle) return true;
  return (entry.item.note ?? '').toLowerCase().includes(needle);
}

export function applyFilters(entries, filter, now) {
  const { from, to } = rangeBounds(filter.range, now);
  return entries.filter(
    (e) =>
      e.time >= from &&
      e.time <= to &&
      matchesType(e, filter.types, filter.side, filter.milk) &&
      matchesBand(e, filter.band) &&
      matchesQuery(e, filter.q)
  );
}

export function isDefaultFilter(filter) {
  return (
    filter.range.preset === DEFAULT_FILTER.range.preset &&
    filter.types.length === 0 &&
    filter.side === 'any' &&
    filter.milk === 'any' &&
    filter.band === 'any' &&
    filter.q.trim() === ''
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 5: Commit**

```bash
git add src/features/baby/log/logFilter.js src/features/baby/log/logFilter.test.js
git commit -m "feat: add log filter predicates for range, type, band, and note search"
```

---

### Task 6: Single shared clock

**Files:**
- Create: `src/features/baby/hooks/useNow.js`
- Modify: `src/features/baby/hooks/useFeedStore.js`, `src/features/baby/hooks/useDiaperStore.js`, `src/features/baby/hooks/useFeedStore.session.test.js`, `src/features/baby/BabyApp.jsx`

**Interfaces:**
- Consumes: `pauseSession`, `resumeSession` from Task 3
- Produces:
  - `useNow(isLive) -> number` — ticks every 500ms when `isLive`, every 60s otherwise
  - `useFeedStore(now)` — same return shape as before **plus** `pauseActive()`, `resumeActive()`, and `isPaused`. `elapsedMs` for a breast session is now `leftElapsedMs + rightElapsedMs` (excludes paused stretches) rather than wall-clock since `startTime`.
  - `useDiaperStore(now)` — same return shape as before
  - Neither store owns a timer any more.

- [ ] **Step 1: Create the clock hook**

Create `src/features/baby/hooks/useNow.js`:

```js
import { useState, useEffect } from 'react';

export const LIVE_TICK_MS = 500;
export const IDLE_TICK_MS = 60000;

// One clock for the whole app. Two stores each running their own uncleared
// interval re-rendered everything forever, even with nothing running.
export function useNow(isLive) {
  const [now, setNow] = useState(() => Date.now());
  const period = isLive ? LIVE_TICK_MS : IDLE_TICK_MS;

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), period);
    return () => clearInterval(id);
  }, [period]);

  return now;
}
```

- [ ] **Step 2: Make useFeedStore take `now` as a parameter**

In `src/features/baby/hooks/useFeedStore.js`:

1. Change the signature to `export function useFeedStore(now) {`.
2. Delete the `const [now, setNow] = useState(() => Date.now());` line and the entire `useEffect` that calls `setInterval(() => setNow(Date.now()), 500)`.
3. Add `pauseSession, resumeSession` to the import list from `../feedLogic`.
4. Harden `restoreActive` so an unrecognised persisted session is dropped rather than rendered:

```js
export function restoreActive(now) {
  const stored = loadValue(ACTIVE_KEY, null);
  const validType = stored?.type === 'breast' || stored?.type === 'external';
  if (!stored || typeof stored.startTime !== 'number' || !validType) {
    return { active: null, stale: false };
  }
  return { active: stored, stale: isStale(stored, now) };
}
```

5. Add the two session actions next to `discardActive`:

```js
  const pauseActive = useCallback(() => {
    setSession(({ active: a }) => ({ active: pauseSession(a, Date.now()), stale: false }));
  }, []);

  const resumeActive = useCallback(() => {
    setSession(({ active: a }) => ({ active: resumeSession(a, Date.now()), stale: false }));
  }, []);
```

6. In the returned object, replace the `elapsedMs` line and add the new members. `leftElapsed`/`rightElapsed` must be computed before the return so `elapsedMs` can reuse them:

```js
  const leftElapsed = sideElapsedMs(active, 'left', now);
  const rightElapsed = sideElapsedMs(active, 'right', now);
  const lastFeed = feeds[0] ?? null;

  return {
    feeds,
    active,
    staleActive,
    isPaused: Boolean(active?.pausedAt),
    // Breast elapsed is the sum of side timers so a paused stretch is excluded.
    // A bottle session has no side timers, so it uses wall clock.
    elapsedMs: active
      ? (active.type === 'breast' ? leftElapsed + rightElapsed : Math.max(0, now - active.startTime))
      : 0,
    leftElapsedMs: leftElapsed,
    rightElapsedMs: rightElapsed,
    // …the rest of the existing keys, unchanged…
    pauseActive, resumeActive,
  };
```

Keep every other returned key exactly as it is.

- [ ] **Step 3: Make useDiaperStore take `now` as a parameter**

In `src/features/baby/hooks/useDiaperStore.js`: change the signature to `export function useDiaperStore(now) {`, delete the `const [now, setNow] = useState(...)` line, delete the `setInterval` `useEffect`, and drop `useState` from the React import if it is then unused. Everything else is unchanged.

- [ ] **Step 4: Update the existing store test**

`src/features/baby/hooks/useFeedStore.session.test.js` exercises `restoreActive`, which is exported standalone and unaffected by the signature change. Add one case for the new validation:

```js
it('drops a persisted session whose type is unrecognised', () => {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify({ type: 'nap', startTime: Date.now() }));
  expect(restoreActive(Date.now())).toEqual({ active: null, stale: false });
});
```

Place it inside the existing `describe` block for `restoreActive`; the file already imports `ACTIVE_KEY` and `restoreActive`.

- [ ] **Step 5: Wire the clock in BabyApp**

This is a temporary edit — `BabyApp.jsx` is rewritten in Task 7, which supplies the real liveness flag. For this commit, pass a literal `false` so the clock idles. Add the import and replace the first two lines of the component body in `src/features/baby/BabyApp.jsx`:

```jsx
import { useNow } from './hooks/useNow';
// …
export default function BabyApp() {
  const now = useNow(false);
  const feedStore = useFeedStore(now);
  const diaperStore = useDiaperStore(now);
```

At this commit a running feed's timer updates once a minute rather than twice a second. That is expected and is fixed in Task 7.

- [ ] **Step 6: Verify**

Run: `npm test` — expect PASS. Run `npm run lint` — expect clean. Run `npm run dev`: the app still loads, existing records still appear, and the "last feed Xh Ym ago" banner still updates (within a minute, since idle tick is now 60s).

- [ ] **Step 7: Commit**

```bash
git add src/features/baby/hooks/ src/features/baby/BabyApp.jsx
git commit -m "refactor: replace per-store intervals with one shared clock"
```

---

### Task 7: Active session card and bar

**Files:**
- Create: `src/features/baby/session/ActiveSessionCard.jsx`, `src/features/baby/session/ActiveSessionBar.jsx`
- Create: `src/features/baby/screens/HomeScreen.jsx`
- Modify: `src/features/baby/BabyApp.jsx`
- Delete: `src/features/baby/components/BreastFeedSheet.jsx`, `src/features/baby/components/ExternalFeedSheet.jsx`, `src/features/baby/components/HomeScreen.jsx`

**Interfaces:**
- Consumes: `useFeedStore(now)` from Task 6 (including `pauseActive`, `resumeActive`, `isPaused`), `Icon` from Task 2
- Produces:
  - `<ActiveSessionCard feedStore onSaved onEditStale />` — renders the live session; returns `null` when `feedStore.active` is falsy
  - `<ActiveSessionBar feedStore onOpen />` — renders the mini bar; returns `null` when `feedStore.active` is falsy
  - `<HomeScreen feedStore diaperStore onStart onLogDiaper onEdit onEditStale onSaved />` where `onStart(type)` takes `'breast' | 'bottle'`

- [ ] **Step 1: Create ActiveSessionCard**

Create `src/features/baby/session/ActiveSessionCard.jsx`. This is where `BreastFeedSheet` and `ExternalFeedSheet` end up. Two things change from the old sheets: there is no `onClose` (nothing to close), and Discard confirms.

```jsx
import { formatMs } from '../../../utils/format';
import { LONG_FEED_MS } from '../feedLogic';
import { QuantityPicker } from '../components/QuantityPicker';
import { Icon } from '../icons/Icon';

const MILKS = [
  { id: 'expressed', label: 'Expressed' },
  { id: 'formula', label: 'Formula' },
];

const METHODS = [
  { id: 'bottle', label: 'Bottle' },
  { id: 'spoon', label: 'Spoon' },
  { id: 'syringe', label: 'Syringe' },
];

function ChipRow({ options, selected, onPick }) {
  return (
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
}

function StaleNotice({ elapsedMs, onEdit, onDiscard }) {
  return (
    <div className="session__notice session__notice--stale" role="alert">
      <p>This has been running for {formatMs(elapsedMs)}. Check the end time and save it, or discard it.</p>
      <div className="session__notice-actions">
        <button className="btn btn--sm" onClick={onEdit}>Fix &amp; save</button>
        <button className="btn btn--sm btn--danger" onClick={onDiscard}>Discard</button>
      </div>
    </div>
  );
}

function BreastSession({ feedStore, onSaved }) {
  const {
    active, isPaused, elapsedMs, leftElapsedMs, rightElapsedMs,
    switchTo, stopBreast, discardActive, pauseActive, resumeActive,
  } = feedStore;

  const activeSide = active.activeSide;
  const hasTime = leftElapsedMs + rightElapsedMs > 0;

  // Tapping the other side switches to it. Tapping the current side does
  // nothing while running, and resumes while paused.
  const tapSide = (side) => {
    if (isPaused) resumeActive();
    if (activeSide !== side) switchTo(side);
  };

  const handleStop = () => {
    const feed = stopBreast();
    if (feed) onSaved(feed);
  };

  const handleDiscard = () => {
    if (window.confirm('Discard this feed? The time recorded so far will be lost.')) {
      discardActive();
    }
  };

  const sideBtn = (side, label) => (
    <button
      className={[
        'side-btn',
        activeSide === side && 'side-btn--active',
        activeSide === side && !isPaused && 'side-btn--running',
      ].filter(Boolean).join(' ')}
      onClick={() => tapSide(side)}
      aria-pressed={activeSide === side}
    >
      <span className="side-btn__label">{label}</span>
      <span className="side-btn__time">
        {formatMs(side === 'left' ? leftElapsedMs : rightElapsedMs)}
      </span>
    </button>
  );

  return (
    <>
      <p className="session__timer">{formatMs(elapsedMs)}</p>
      {isPaused && <p className="session__hint">Paused</p>}
      {!isPaused && elapsedMs > LONG_FEED_MS && (
        <p className="session__hint session__hint--warn">Still feeding? This has been running over 2 hours.</p>
      )}

      <div className="side-row">
        {sideBtn('left', 'Left')}
        {sideBtn('right', 'Right')}
      </div>

      <button className="btn btn--primary" onClick={handleStop} disabled={!hasTime}>
        <Icon name="stop" size={18} /> Stop &amp; save
      </button>

      <div className="session__secondary">
        <button className="btn btn--ghost" onClick={isPaused ? resumeActive : pauseActive}>
          <Icon name={isPaused ? 'play' : 'pause'} size={18} />
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button className="btn btn--ghost btn--danger" onClick={handleDiscard}>
          <Icon name="trash" size={18} /> Discard
        </button>
      </div>
    </>
  );
}

function BottleSession({ feedStore, onSaved }) {
  const {
    active, elapsedMs, updateDraft, saveExternal, discardActive,
    quantityPresets, setQuantityPresets,
  } = feedStore;

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
    if (feed) onSaved(feed);
  };

  const handleDiscard = () => {
    if (window.confirm('Discard this bottle feed?')) discardActive();
  };

  return (
    <>
      <p className="session__timer session__timer--sm">{formatMs(elapsedMs)}</p>

      <ChipRow options={MILKS} selected={draft.milk} onPick={(milk) => updateDraft({ milk })} />
      <ChipRow options={METHODS} selected={draft.method} onPick={(method) => updateDraft({ method })} />

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

      <button className="btn btn--primary" onClick={handleSave}>Save</button>

      <div className="session__secondary">
        <button className="btn btn--ghost btn--danger" onClick={handleDiscard}>
          <Icon name="trash" size={18} /> Discard
        </button>
      </div>
    </>
  );
}

export function ActiveSessionCard({ feedStore, onSaved, onEditStale }) {
  const { active, staleActive, elapsedMs, discardActive } = feedStore;
  if (!active) return null;

  const isBreast = active.type === 'breast';

  return (
    <section className={`session session--${isBreast ? 'breast' : 'bottle'}`} aria-label="Active feed">
      <header className="session__head">
        <span className="session__dot" aria-hidden="true" />
        <Icon name={isBreast ? 'breast' : 'bottle'} size={18} />
        <span className="session__title">{isBreast ? 'Breast feed' : 'Bottle feed'}</span>
      </header>

      {staleActive && (
        <StaleNotice
          elapsedMs={elapsedMs}
          onEdit={() => onEditStale(active)}
          onDiscard={discardActive}
        />
      )}

      {isBreast
        ? <BreastSession feedStore={feedStore} onSaved={onSaved} />
        : <BottleSession feedStore={feedStore} onSaved={onSaved} />}
    </section>
  );
}
```

`ActiveSessionCard` never starts a session — `startBreast`/`startExternal` are called only from `BabyApp`'s guarded `handleStart` (Task 8), so the card deliberately does not destructure them.

- [ ] **Step 2: Create ActiveSessionBar**

Create `src/features/baby/session/ActiveSessionBar.jsx`:

```jsx
import { formatMs } from '../../../utils/format';
import { Icon } from '../icons/Icon';

export function ActiveSessionBar({ feedStore, onOpen }) {
  const { active, isPaused, elapsedMs } = feedStore;
  if (!active) return null;

  const isBreast = active.type === 'breast';

  return (
    <button className="session-bar" onClick={onOpen}>
      <span className={`session__dot ${isPaused ? 'session__dot--paused' : ''}`} aria-hidden="true" />
      <Icon name={isBreast ? 'breast' : 'bottle'} size={18} />
      <span className="session-bar__label">
        {isBreast ? 'Breast feed' : 'Bottle feed'}{isPaused ? ' · paused' : ''}
      </span>
      <span className="session-bar__time">{formatMs(elapsedMs)}</span>
      <Icon name="chevron-up" size={18} />
    </button>
  );
}
```

- [ ] **Step 3: Create the new HomeScreen**

Create `src/features/baby/screens/HomeScreen.jsx`. The start buttons and the session card are mutually exclusive — that is the whole fix.

```jsx
import { formatGap, formatMs, formatTime } from '../../../utils/format';
import { feedDurationMs } from '../feedLogic';
import { ActiveSessionCard } from '../session/ActiveSessionCard';
import { Icon } from '../icons/Icon';

export function feedSummary(feed) {
  if (!feed) return null;
  if (feed.type === 'breast') {
    const parts = [];
    if (feed.leftMs > 0) parts.push(`L ${Math.round(feed.leftMs / 60000)}m`);
    if (feed.rightMs > 0) parts.push(`R ${Math.round(feed.rightMs / 60000)}m`);
    return parts.join(' · ') || formatMs(feedDurationMs(feed));
  }
  return `${feed.takenMl} ml · ${feed.milk === 'formula' ? 'Formula' : 'Expressed'}`;
}

export function diaperSummary(d) {
  if (d.pee && d.poop) return 'Pee + poop';
  return d.poop ? 'Poop' : 'Pee';
}

export function entryIcon(kind, item) {
  if (kind === 'feed') return item.type === 'breast' ? 'breast' : 'bottle';
  return item.poop ? 'poop' : 'pee';
}

export function HomeScreen({
  feedStore, diaperStore, onStart, onLogDiaper, onEdit, onEditStale, onSaved,
}) {
  const { active, lastFeed, msSinceLastFeed, todayStats } = feedStore;
  const diaperToday = diaperStore.todayStats;

  const recent = [
    ...feedStore.feeds.slice(0, 8).map((f) => ({ kind: 'feed', time: f.startTime, item: f })),
    ...diaperStore.diapers.slice(0, 8).map((d) => ({ kind: 'diaper', time: d.time, item: d })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 8);

  return (
    <div className="home">
      {active ? (
        <ActiveSessionCard feedStore={feedStore} onSaved={onSaved} onEditStale={onEditStale} />
      ) : (
        <>
          <div className="banner">
            {lastFeed ? (
              <>
                <p className="banner__main">Last feed {formatGap(msSinceLastFeed)} ago</p>
                <p className="banner__sub">{feedSummary(lastFeed)} · {formatTime(lastFeed.startTime)}</p>
              </>
            ) : (
              <p className="banner__main">No feeds recorded yet</p>
            )}
          </div>

          <div className="actions">
            <button className="action action--breast" onClick={() => onStart('breast')}>
              <Icon name="breast" size={26} />
              <span>Breast</span>
            </button>
            <button className="action action--bottle" onClick={() => onStart('bottle')}>
              <Icon name="bottle" size={26} />
              <span>Bottle</span>
            </button>
          </div>
        </>
      )}

      <div className="actions actions--diaper">
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: true, poop: false })}>
          <Icon name="pee" size={18} /> Pee
        </button>
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: false, poop: true })}>
          <Icon name="poop" size={18} /> Poop
        </button>
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: true, poop: true })}>
          Both
        </button>
      </div>

      <p className="today-summary">
        Today · {todayStats.feedCount} feeds
        {todayStats.totalMl > 0 && ` · ${todayStats.totalMl} ml`}
        {todayStats.breastMs > 0 && ` · ${Math.round(todayStats.breastMs / 60000)}m breast`}
        {` · ${diaperToday.peeCount} pee · ${diaperToday.poopCount} poop`}
      </p>

      <ul className="recent">
        {recent.length === 0 && <li className="recent__empty">Nothing logged yet.</li>}
        {recent.map(({ kind, time, item }) => (
          <li key={item.id}>
            <button className="recent__row" onClick={() => onEdit(kind, item)}>
              <span className="recent__time">{formatTime(time)}</span>
              <span className="recent__icon"><Icon name={entryIcon(kind, item)} size={18} /></span>
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

- [ ] **Step 4: Rewrite BabyApp to wire it together**

Rewrite `src/features/baby/BabyApp.jsx`. The two lazy initialisers for `sheet` and `staleRecord` are gone — the card renders directly off `feedStore.active`, and stale handling is inline.

```jsx
import { useState } from 'react';
import { useNow } from './hooks/useNow';
import { useFeedStore } from './hooks/useFeedStore';
import { useDiaperStore } from './hooks/useDiaperStore';
import { HomeScreen } from './screens/HomeScreen';
import { ChartsScreen } from './screens/ChartsScreen';
import { LogScreen } from './screens/LogScreen';
import { ActiveSessionBar } from './session/ActiveSessionBar';
import { Toast } from './components/Toast';
import { EditSheet } from './components/EditSheet';
import { buildBackup, parseBackup, feedsToCsv, diapersToCsv, download } from './backup';
import { Icon } from './icons/Icon';
import './baby.css';

const TABS = [
  { id: 'home', label: 'Home', icon: 'breast' },
  { id: 'charts', label: 'Charts', icon: 'filter' },
  { id: 'log', label: 'Log', icon: 'search' },
];

export default function BabyApp() {
  const [liveHint, setLiveHint] = useState(false);
  const now = useNow(liveHint);
  const feedStore = useFeedStore(now);
  const diaperStore = useDiaperStore(now);
  const [tab, setTab] = useState('home');
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);

  // Keep the clock's tick rate in step with whether a session is running.
  // Derived during render is not possible (useNow is called before the store
  // exists), so this reconciles on the next commit.
  const isLive = Boolean(feedStore.active);
  if (isLive !== liveHint) setLiveHint(isLive);

  const handleLogDiaper = ({ pee, poop }) => {
    diaperStore.logDiaper({ pee, poop });
    setToast({
      message: pee && poop ? 'Pee + poop logged' : poop ? 'Poop logged' : 'Pee logged',
      onUndo: diaperStore.undoLast,
    });
  };

  const handleSaved = (feed) => setToast({
    message: feed.type === 'breast'
      ? `Feed saved · ${Math.round((feed.leftMs + feed.rightMs) / 60000)}m`
      : `Bottle saved · ${feed.takenMl} ml`,
    onUndo: feedStore.undoLast,
  });

  const handleEditStale = (active) => {
    setEditing({
      kind: 'feed',
      stale: true,
      item: active.type === 'breast'
        ? {
            id: 'stale', type: 'breast', startTime: active.startTime,
            endTime: active.startTime + active.leftMs + active.rightMs,
            leftMs: active.leftMs, rightMs: active.rightMs,
            lastSide: active.activeSide ?? 'left', note: '',
          }
        : { id: 'stale', type: 'external', startTime: active.startTime, endTime: active.startTime, ...active.draft },
    });
  };

  const today = () => new Date(now).toISOString().slice(0, 10);

  const handleExportJson = () => download(
    `baby-tracker-${today()}.json`,
    JSON.stringify(buildBackup(feedStore.feeds, diaperStore.diapers, feedStore.quantityPresets), null, 2),
    'application/json'
  );

  const handleExportFeedsCsv = () =>
    download(`baby-feeds-${today()}.csv`, feedsToCsv(feedStore.feeds), 'text/csv');

  const handleExportDiapersCsv = () =>
    download(`baby-diapers-${today()}.csv`, diapersToCsv(diaperStore.diapers), 'text/csv');

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

  const handleStart = (type) => {
    if (type === 'breast') feedStore.startBreast(feedStore.suggestion);
    else feedStore.startExternal();
  };

  return (
    <main className="app-main baby">
      {tab === 'home' && (
        <HomeScreen
          feedStore={feedStore}
          diaperStore={diaperStore}
          onStart={handleStart}
          onLogDiaper={handleLogDiaper}
          onEdit={(kind, item) => setEditing({ kind, item })}
          onEditStale={handleEditStale}
          onSaved={handleSaved}
        />
      )}
      {tab === 'charts' && <ChartsScreen feedStore={feedStore} diaperStore={diaperStore} now={now} />}
      {tab === 'log' && (
        <LogScreen
          feedStore={feedStore}
          diaperStore={diaperStore}
          now={now}
          onEdit={(kind, item) => setEditing({ kind, item })}
          onExportJson={handleExportJson}
          onExportFeedsCsv={handleExportFeedsCsv}
          onExportDiapersCsv={handleExportDiapersCsv}
          onImport={handleImport}
        />
      )}

      {editing && (
        <EditSheet
          kind={editing.kind}
          record={editing.item}
          notice={editing.stale ? 'This feed was left running. Check the end time and save, or delete it.' : undefined}
          onSave={(next) => {
            if (editing.stale) {
              feedStore.addFeed({ ...next, id: crypto.randomUUID() });
              feedStore.discardActive();
            } else if (editing.kind === 'feed') {
              feedStore.updateFeed(next.id, next);
            } else {
              diaperStore.updateDiaper(next.id, next);
            }
          }}
          onDelete={(id) => {
            if (editing.stale) feedStore.discardActive();
            else if (editing.kind === 'feed') feedStore.deleteFeed(id);
            else diaperStore.deleteDiaper(id);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {toast && (
        <Toast message={toast.message} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />
      )}

      {tab !== 'home' && (
        <ActiveSessionBar feedStore={feedStore} onOpen={() => setTab('home')} />
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
            <Icon name={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  );
}
```

`handleStart` here has **no guard yet** — Task 8 adds it. `ChartsScreen` and `LogScreen` do not exist until Tasks 9 and 10; to keep this commit runnable, temporarily import the old `ChartsTab` as `ChartsScreen` and the old `LogTab` as `LogScreen` with their current props, and swap the imports in the tasks that create the real ones.

- [ ] **Step 5: Delete the sheets**

```bash
git rm src/features/baby/components/BreastFeedSheet.jsx \
       src/features/baby/components/ExternalFeedSheet.jsx \
       src/features/baby/components/HomeScreen.jsx
```

- [ ] **Step 6: Verify manually**

Run `npm test` and `npm run lint` — expect clean. Then `npm run dev` and check each of these:

1. Tap Breast. The start buttons are replaced by the live card; the timer counts up.
2. Switch to the Log tab. The mini bar appears above the tab bar and its time is still advancing.
3. Tap the mini bar. It returns to Home with the session intact — **this is the bug being fixed.**
4. Tap Pause. The timer freezes and the bar reads "paused". Tap Resume. It continues from where it stopped, not from where it would have been.
5. Tap Stop & save. The feed appears in Recent with the paused stretch excluded from L/R totals.
6. Reload mid-session. The card comes back with the elapsed time intact.

- [ ] **Step 7: Commit**

```bash
git add -A src/features/baby
git commit -m "feat: replace feed modal with persistent session card and mini bar"
```

---

### Task 8: Start-session guard dialog

**Files:**
- Create: `src/features/baby/session/StartSessionGuard.jsx`
- Modify: `src/features/baby/BabyApp.jsx`

**Interfaces:**
- Consumes: `decideStart`, `sessionLabel` from Task 4; `feedStore` from Task 6
- Produces: `<StartSessionGuard running requested elapsedMs onSaveAndStart onDiscardAndStart onCancel />`

- [ ] **Step 1: Create the dialog**

Create `src/features/baby/session/StartSessionGuard.jsx`:

```jsx
import { formatMs } from '../../../utils/format';
import { sessionLabel } from './sessionGuard';

const NAMES = { breast: 'breast feed', bottle: 'bottle feed' };

export function StartSessionGuard({
  running, requested, elapsedMs, onSaveAndStart, onDiscardAndStart, onCancel,
}) {
  const runningName = sessionLabel(running);
  const nextName = NAMES[requested];

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="A feed is already running">
      <div className="modal__panel">
        <h2 className="modal__title">A {runningName} is already running</h2>
        <p className="modal__body">
          It has been going for {formatMs(elapsedMs)}. Only one feed can run at a time —
          what should happen to it before the {nextName} starts?
        </p>
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onSaveAndStart}>
            Save it &amp; start {nextName}
          </button>
          <button className="btn btn--danger" onClick={onDiscardAndStart}>
            Discard it &amp; start {nextName}
          </button>
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the guard into BabyApp**

In `src/features/baby/BabyApp.jsx`, add the imports:

```jsx
import { decideStart } from './session/sessionGuard';
import { StartSessionGuard } from './session/StartSessionGuard';
```

Add state next to `editing`:

```jsx
  const [pendingStart, setPendingStart] = useState(null);
```

Replace `handleStart` with the guarded version and add the three resolution handlers:

```jsx
  const beginSession = (type) => {
    if (type === 'breast') feedStore.startBreast(feedStore.suggestion);
    else feedStore.startExternal();
  };

  const handleStart = (type) => {
    const decision = decideStart(feedStore.active, type);
    if (decision.action === 'start') beginSession(type);
    else setPendingStart(decision);
  };

  const handleSaveAndStart = () => {
    const feed = feedStore.active.type === 'breast'
      ? feedStore.stopBreast()
      : feedStore.saveExternal();
    if (feed) handleSaved(feed);
    beginSession(pendingStart.requested);
    setPendingStart(null);
  };

  const handleDiscardAndStart = () => {
    feedStore.discardActive();
    beginSession(pendingStart.requested);
    setPendingStart(null);
  };

  const handleCancelStart = () => {
    setPendingStart(null);
    setTab('home');
  };
```

Render the dialog next to `{editing && …}`:

```jsx
      {pendingStart && (
        <StartSessionGuard
          running={pendingStart.running}
          requested={pendingStart.requested}
          elapsedMs={feedStore.elapsedMs}
          onSaveAndStart={handleSaveAndStart}
          onDiscardAndStart={handleDiscardAndStart}
          onCancel={handleCancelStart}
        />
      )}
```

- [ ] **Step 3: Verify manually**

Run `npm test` and `npm run lint` — expect clean. Then `npm run dev`:

1. Start a breast feed, let it run ~10 seconds, then tap **Bottle**. The dialog appears naming the running breast feed and its elapsed time.
2. Choose **Cancel** — nothing changes, and the view is on Home with the breast feed still running.
3. Tap **Bottle** again, choose **Save it & start bottle** — the breast feed lands in Recent with its time, and the bottle session card opens.
4. Repeat and choose **Discard it & start bottle** — the breast feed does **not** appear in Recent.
5. Confirm the reverse direction: during a bottle session, tapping **Breast** raises the same dialog.

Before this task, step 1 silently destroyed the breast feed. Verify against the old behaviour if in doubt: `git stash` is not needed — just confirm the dialog now appears.

- [ ] **Step 4: Commit**

```bash
git add src/features/baby/session/StartSessionGuard.jsx src/features/baby/BabyApp.jsx
git commit -m "feat: confirm before a second feed session replaces a running one"
```

---

### Task 9: Filterable log screen

**Files:**
- Create: `src/features/baby/log/useLogFilter.js`, `src/features/baby/log/LogFilterBar.jsx`, `src/features/baby/log/LogEntryRow.jsx`, `src/features/baby/screens/LogScreen.jsx`
- Modify: `src/features/baby/BabyApp.jsx` (swap the temporary `LogTab` import for `LogScreen`)
- Delete: `src/features/baby/components/LogTab.jsx`

**Interfaces:**
- Consumes: `applyFilters`, `DEFAULT_FILTER`, `RANGE_PRESETS`, `isDefaultFilter` from Task 5; `Icon` from Task 2; `entryIcon` from Task 7's `HomeScreen`
- Produces: `useLogFilter() -> {filter, setRange, toggleType, setSide, setMilk, setBand, setQuery, clear, isDefault}` and `<LogScreen feedStore diaperStore now onEdit onExportJson onExportFeedsCsv onExportDiapersCsv onImport />`

- [ ] **Step 1: Create the filter state hook**

Create `src/features/baby/log/useLogFilter.js`:

```js
import { useState, useCallback } from 'react';
import { DEFAULT_FILTER, isDefaultFilter } from './logFilter';

export function useLogFilter() {
  const [filter, setFilter] = useState(DEFAULT_FILTER);

  const patch = useCallback((fields) => setFilter((f) => ({ ...f, ...fields })), []);

  const setRange = useCallback((range) => patch({ range }), [patch]);
  const setSide = useCallback((side) => patch({ side }), [patch]);
  const setMilk = useCallback((milk) => patch({ milk }), [patch]);
  const setBand = useCallback((band) => patch({ band }), [patch]);
  const setQuery = useCallback((q) => patch({ q }), [patch]);
  const clear = useCallback(() => setFilter(DEFAULT_FILTER), []);

  // Deselecting a parent type resets its drill-down so a hidden control can't
  // silently keep filtering.
  const toggleType = useCallback((type) => {
    setFilter((f) => {
      const on = f.types.includes(type);
      const types = on ? f.types.filter((t) => t !== type) : [...f.types, type];
      return {
        ...f,
        types,
        side: type === 'breast' && on ? 'any' : f.side,
        milk: type === 'bottle' && on ? 'any' : f.milk,
      };
    });
  }, []);

  return {
    filter, setRange, toggleType, setSide, setMilk, setBand, setQuery, clear,
    isDefault: isDefaultFilter(filter),
  };
}
```

- [ ] **Step 2: Create the filter bar**

Create `src/features/baby/log/LogFilterBar.jsx`:

```jsx
import { useState } from 'react';
import { RANGE_PRESETS } from './logFilter';
import { toDateInputValue, fromDateTimeInputs } from '../../../utils/dates';
import { Icon } from '../icons/Icon';

const TYPES = [
  { id: 'breast', label: 'Breast' },
  { id: 'bottle', label: 'Bottle' },
  { id: 'pee', label: 'Pee' },
  { id: 'poop', label: 'Poop' },
];

const SIDES = [{ id: 'any', label: 'Both sides' }, { id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }];
const MILKS = [{ id: 'any', label: 'Any milk' }, { id: 'expressed', label: 'Expressed' }, { id: 'formula', label: 'Formula' }];
const BANDS = [{ id: 'any', label: 'All hours' }, { id: 'night', label: 'Night 22–06' }, { id: 'day', label: 'Day 06–22' }];

function Chips({ options, isOn, onPick, label }) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          className={`chip ${isOn(o.id) ? 'chip--active' : ''}`}
          aria-pressed={isOn(o.id)}
          onClick={() => onPick(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LogFilterBar({ state, count, now }) {
  const { filter, setRange, toggleType, setSide, setMilk, setBand, setQuery, clear, isDefault } = state;
  const [open, setOpen] = useState(false);

  const customFrom = filter.range.from ?? now;
  const customTo = filter.range.to ?? now;

  const setCustom = (which, value) => {
    if (!value) return;
    const ts = fromDateTimeInputs(value, '00:00');
    setRange({ preset: 'custom', from: which === 'from' ? ts : customFrom, to: which === 'to' ? ts : customTo });
  };

  return (
    <div className="filters">
      <Chips
        label="Record type"
        options={TYPES}
        isOn={(id) => filter.types.includes(id)}
        onPick={toggleType}
      />

      {filter.types.includes('breast') && (
        <Chips label="Side" options={SIDES} isOn={(id) => filter.side === id} onPick={setSide} />
      )}
      {filter.types.includes('bottle') && (
        <Chips label="Milk" options={MILKS} isOn={(id) => filter.milk === id} onPick={setMilk} />
      )}

      <button className="filters__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="filter" size={18} />
        More filters
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} />
      </button>

      {open && (
        <div className="filters__more">
          <Chips
            label="Date range"
            options={RANGE_PRESETS}
            isOn={(id) => filter.range.preset === id}
            onPick={(preset) => setRange(preset === 'custom'
              ? { preset, from: customFrom, to: customTo }
              : { preset, from: null, to: null })}
          />

          {filter.range.preset === 'custom' && (
            <div className="filters__dates">
              <label>
                From
                <input type="date" value={toDateInputValue(customFrom)} onChange={(e) => setCustom('from', e.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={toDateInputValue(customTo)} onChange={(e) => setCustom('to', e.target.value)} />
              </label>
            </div>
          )}

          <Chips label="Time of day" options={BANDS} isOn={(id) => filter.band === id} onPick={setBand} />

          <label className="filters__search">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search notes"
              value={filter.q}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      )}

      {!isDefault && (
        <div className="filters__summary">
          <span>{count} {count === 1 ? 'record' : 'records'}</span>
          <button className="action--link" onClick={clear}>Clear filters</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the entry row**

Create `src/features/baby/log/LogEntryRow.jsx`:

```jsx
import { formatTime, formatMs } from '../../../utils/format';
import { feedDurationMs } from '../feedLogic';
import { entryIcon } from '../screens/HomeScreen';
import { Icon } from '../icons/Icon';

function primary(entry) {
  const { kind, item } = entry;
  if (kind === 'diaper') return item.pee && item.poop ? 'Pee + poop' : item.poop ? 'Poop' : 'Pee';
  if (item.type === 'breast') return `Breast · ${formatMs(feedDurationMs(item))}`;
  return `Bottle · ${item.takenMl} ml`;
}

function secondary(entry) {
  const { kind, item } = entry;
  if (kind === 'diaper') {
    return [item.color, item.consistency, item.amount].filter(Boolean).join(' · ');
  }
  if (item.type === 'breast') {
    return `L ${Math.round(item.leftMs / 60000)}m · R ${Math.round(item.rightMs / 60000)}m`;
  }
  return `${item.takenMl} of ${item.offeredMl} ml · ${item.milk} · ${item.method}`;
}

export function LogEntryRow({ entry, onEdit }) {
  const detail = secondary(entry);

  return (
    <li>
      <button className="log__row" onClick={() => onEdit(entry.kind, entry.item)}>
        <span className="log__time">{formatTime(entry.time)}</span>
        <span className="log__icon"><Icon name={entryIcon(entry.kind, entry.item)} size={18} /></span>
        <span className="log__text">
          <span className="log__primary">{primary(entry)}</span>
          {detail && <span className="log__secondary">{detail}</span>}
          {entry.item.note && <span className="log__note">{entry.item.note}</span>}
        </span>
      </button>
    </li>
  );
}
```

- [ ] **Step 4: Create the log screen**

Create `src/features/baby/screens/LogScreen.jsx`:

```jsx
import { groupByDay, formatDayLabel } from '../../../utils/dates';
import { applyFilters } from '../log/logFilter';
import { useLogFilter } from '../log/useLogFilter';
import { LogFilterBar } from '../log/LogFilterBar';
import { LogEntryRow } from '../log/LogEntryRow';
import { Icon } from '../icons/Icon';

export function LogScreen({
  feedStore, diaperStore, now, onEdit,
  onExportJson, onExportFeedsCsv, onExportDiapersCsv, onImport,
}) {
  const state = useLogFilter();

  const all = [
    ...feedStore.feeds.map((f) => ({ kind: 'feed', time: f.startTime, item: f })),
    ...diaperStore.diapers.map((d) => ({ kind: 'diaper', time: d.time, item: d })),
  ].sort((a, b) => b.time - a.time);

  const entries = applyFilters(all, state.filter, now);
  const groups = groupByDay(entries, (e) => e.time);

  return (
    <div className="log">
      <div className="log__backup">
        <button className="action--link" onClick={onExportJson}>
          <Icon name="download" size={16} /> Backup (JSON)
        </button>
        <button className="action--link" onClick={onExportFeedsCsv}>Feeds CSV</button>
        <button className="action--link" onClick={onExportDiapersCsv}>Diapers CSV</button>
        <label className="action--link">
          <Icon name="upload" size={16} /> Import
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

      <LogFilterBar state={state} count={entries.length} now={now} />

      {all.length === 0 && <p className="placeholder">Nothing logged yet.</p>}

      {all.length > 0 && entries.length === 0 && (
        <p className="placeholder">
          No records match these filters.
          <button className="action--link" onClick={state.clear}>Clear filters</button>
        </p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="log__day">
          <h2 className="log__day-title">{formatDayLabel(group.dayStart, now)}</h2>
          <ul className="log__list">
            {group.items.map((entry) => (
              <LogEntryRow key={entry.item.id} entry={entry} onEdit={onEdit} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Swap the import and delete the old tab**

In `src/features/baby/BabyApp.jsx`, replace the temporary `LogTab` import with `import { LogScreen } from './screens/LogScreen';` and remove the now-unused `logFilter` state if the temporary shim left any behind.

```bash
git rm src/features/baby/components/LogTab.jsx
```

- [ ] **Step 6: Verify manually**

Run `npm test` and `npm run lint` — expect clean. Then `npm run dev` on the Log tab:

1. Default view shows the last 7 days, not everything ever.
2. Select **Breast** — the Left/Right side chips appear. Pick **Left**; only feeds with nonzero left time remain.
3. Deselect **Breast** — the side chips disappear and the side filter resets (adding a diaper filter afterwards must not still be filtering by side).
4. Open **More filters**, choose **Custom**, set a from/to spanning two days, confirm records outside it vanish and the boundary days are included in full.
5. Set the band to **Night 22–06** and confirm a 23:00 record stays and a 14:00 record goes.
6. Type a word from a note into the search box; confirm only matching records remain.
7. With filters that match nothing, confirm the "No records match these filters" message appears with a working Clear filters button. Then clear all data mentally: with an empty store the message must read "Nothing logged yet" instead.
8. Confirm the record count and Clear filters button appear only when the filter is non-default.

- [ ] **Step 7: Commit**

```bash
git add -A src/features/baby
git commit -m "feat: add date, type, side, milk, time-of-day, and note filters to the log"
```

---

### Task 10: Baby stylesheet rewrite and charts move

**Files:**
- Create: `src/features/baby/screens/ChartsScreen.jsx`
- Modify: `src/features/baby/baby.css` (full rewrite), `src/features/baby/BabyApp.jsx` (import swap), the four files under `src/features/baby/components/charts/`, `src/features/baby/components/EditSheet.jsx`
- Delete: `src/features/baby/components/ChartsTab.jsx`

**Interfaces:**
- Consumes: tokens from Task 1; every class name emitted by Tasks 7–9
- Produces: `<ChartsScreen feedStore diaperStore now />`

- [ ] **Step 1: Move ChartsTab to ChartsScreen**

```bash
git mv src/features/baby/components/ChartsTab.jsx src/features/baby/screens/ChartsScreen.jsx
```

Then edit the moved file: rename the export to `ChartsScreen`, take `now` as a prop instead of reading `feedStore.now`, and fix the relative import paths (they gain one `../` level for `utils` and lose none for `components/charts`, which becomes `../components/charts/…`):

```jsx
import { startOfDay } from '../../../utils/dates';
import { TimelineStrip } from '../components/charts/TimelineStrip';
import { FeedGapChart } from '../components/charts/FeedGapChart';
import { DailyTotalsChart } from '../components/charts/DailyTotalsChart';
import { SideBalanceChart } from '../components/charts/SideBalanceChart';

export function ChartsScreen({ feedStore, diaperStore, now }) {
  return (
    <div className="charts">
      <TimelineStrip
        feeds={feedStore.feeds}
        diapers={diaperStore.diapers}
        initialDayStart={startOfDay(now)}
        now={now}
      />
      <FeedGapChart feeds={feedStore.feeds} />
      <DailyTotalsChart feeds={feedStore.feeds} diapers={diaperStore.diapers} now={now} />
      <SideBalanceChart feeds={feedStore.feeds} now={now} />
    </div>
  );
}
```

Update the import in `BabyApp.jsx` to `import { ChartsScreen } from './screens/ChartsScreen';` (Task 7 already renders `<ChartsScreen … now={now} />`).

- [ ] **Step 2: Replace hard-coded colours in the chart components**

Grep for colour literals and swap each for a token:

```bash
grep -rnE '#[0-9a-fA-F]{3,8}' src/features/baby/components/charts/ src/features/baby/components/EditSheet.jsx
```

Map: breast series → `var(--accent)`, bottle/formula series → `var(--amber)`, pee → `var(--slate)`, poop → `var(--stop)`, axes and gridlines → `var(--border)`, labels → `var(--text-muted)`. Inline SVG `fill`/`stroke` attributes accept `var(--…)` directly. If a chart passes colours as JS constants, define them once at the top of that file as `const SERIES = { breast: 'var(--accent)', … }`.

- [ ] **Step 3: Rewrite baby.css**

Replace `src/features/baby/baby.css` entirely. Every colour is a token; nothing is purple. The class list below is the complete set emitted by Tasks 7–9 plus the existing `chip`, `qty`, `sheet`, `toast`, `bottom-tabs`, `recent`, `banner`, `actions`, `today-summary`, `log`, `charts`, and `placeholder` families — carry over the layout rules from the current file and only replace the colour and radius values, rather than reinventing the layout from scratch.

New rules that have no predecessor:

```css
/* ---- Active session card ---- */
.session {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.session__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font-size: var(--fs-sm);
  font-weight: 550;
}

.session__title { color: var(--text); }

.session__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--accent);
  animation: session-pulse 2s ease-in-out infinite;
}

.session__dot--paused { background: var(--text-muted); animation: none; }

@keyframes session-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce) {
  .session__dot { animation: none; }
}

.session__timer {
  font-family: var(--font-num);
  font-size: var(--fs-timer);
  font-variant-numeric: tabular-nums;
  text-align: center;
  letter-spacing: -0.02em;
}

.session__timer--sm { font-size: var(--fs-xl); }

.session__hint { text-align: center; font-size: var(--fs-sm); color: var(--text-muted); }
.session__hint--warn { color: var(--stop); }

.session__notice {
  background: var(--stop-soft);
  border: 1px solid var(--stop);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-size: var(--fs-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.session__notice-actions { display: flex; gap: var(--space-2); }

.session__secondary { display: flex; gap: var(--space-2); }
.session__secondary .btn { flex: 1; }

.side-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }

.side-btn {
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.side-btn--active { border-color: var(--accent); background: var(--accent-soft); }
.side-btn--running { box-shadow: inset 0 0 0 1px var(--accent); }
.side-btn__label { font-size: var(--fs-sm); color: var(--text-muted); }
.side-btn__time { font-family: var(--font-num); font-size: var(--fs-lg); font-variant-numeric: tabular-nums; }

/* ---- Buttons ---- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--fs-md);
  font-weight: 550;
}

.btn--primary { background: var(--accent); color: var(--accent-ink); }
.btn--primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn--ghost { background: transparent; border-color: var(--border); color: var(--text); }
.btn--danger { color: var(--stop); }
.btn--primary.btn--danger { background: var(--stop); color: var(--accent-ink); }
.btn--sm { padding: var(--space-2) var(--space-3); font-size: var(--fs-sm); }

/* ---- Mini session bar ---- */
.session-bar {
  position: sticky;
  bottom: 56px;
  z-index: 5;
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-size: var(--fs-sm);
  text-align: left;
}

.session-bar__label { flex: 1; }
.session-bar__time { font-family: var(--font-num); font-variant-numeric: tabular-nums; font-size: var(--fs-md); }

/* ---- Modal ---- */
.modal {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgb(0 0 0 / 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal__panel {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  max-width: 24rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.modal__title { font-size: var(--fs-lg); }
.modal__body { font-size: var(--fs-sm); color: var(--text-muted); }
.modal__actions { display: flex; flex-direction: column; gap: var(--space-2); }

/* ---- Filters ---- */
.filters { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }

.filters__toggle {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: 0;
  color: var(--text-muted);
  font-size: var(--fs-sm);
  padding: var(--space-1) 0;
}

.filters__more {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--surface-2);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.filters__dates { display: flex; gap: var(--space-3); font-size: var(--fs-sm); color: var(--text-muted); }
.filters__dates label { display: flex; flex-direction: column; gap: var(--space-1); }
.filters__dates input,
.filters__search input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font: inherit;
  padding: var(--space-2);
}

.filters__search { display: flex; align-items: center; gap: var(--space-2); color: var(--text-muted); }
.filters__search input { flex: 1; }

.filters__summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* ---- Log rows ---- */
.log__text { display: flex; flex-direction: column; gap: 2px; }
.log__primary { font-size: var(--fs-md); }
.log__secondary { font-size: var(--fs-sm); color: var(--text-muted); }
.log__note { font-size: var(--fs-sm); color: var(--text-muted); font-style: italic; }
```

For the carried-over families, the substitutions are mechanical: `#7c6aff` → `var(--accent)`, `#ff5a7c` → `var(--stop)`, `#4cffb0` → `var(--accent)`, `#ffb84c` → `var(--amber)`, `--surface2` → `--surface-2`.

- [ ] **Step 4: Confirm no colour literals escaped**

Run:

```bash
grep -rnE '#[0-9a-fA-F]{3,8}|rgb\(' src/features/baby src/styles/base.css src/App.jsx
```

Expected: no matches except the `rgb(0 0 0 / 0.45)` scrim in `.modal` and `rgba(...)` inside `--shadow-1` — and `--shadow-1` lives in `tokens.css`, which is not in the search path. If anything else matches, replace it with a token.

- [ ] **Step 5: Verify manually**

Run `npm test` and `npm run lint` — expect clean. Then `npm run dev` and walk Home, Charts, and Log in both light and dark mode. Check specifically: no purple anywhere, no emoji anywhere outside note text, the mini bar sits clear of the tab bar and does not cover the last log row, and the charts' series colours are legible on both backgrounds.

- [ ] **Step 6: Commit**

```bash
git add -A src/features/baby
git commit -m "style: rebuild baby tracker styles on design tokens"
```

---

### Task 11: Retheme contractions and final verification

**Files:**
- Modify: `src/features/contractions/contractions.css`, `src/features/contractions/components/ContractionGraph.jsx`

**Interfaces:**
- Consumes: tokens from Task 1
- Produces: nothing new — the contraction app's structure and behaviour are unchanged

- [ ] **Step 1: Find every colour literal in the contractions feature**

```bash
grep -rnE '#[0-9a-fA-F]{3,8}|rgba?\(' src/features/contractions/
```

- [ ] **Step 2: Replace each with a token**

Substitution map — apply it to both the stylesheet and any inline SVG colours in `ContractionGraph.jsx`:

| Old | New |
|---|---|
| `#7c6aff` and any purple | `var(--accent)` |
| `#ff5a7c` (stop button / active contraction) | `var(--stop)` |
| `#4cffb0` (green) | `var(--accent)` |
| `#ffb84c` (warn) | `var(--amber)` |
| `#0f0f13` / `#1a1a22` / `#22222e` | `var(--bg)` / `var(--surface)` / `var(--surface-2)` |
| `#2e2e3e` | `var(--border)` |
| `#e8e8f0` / `#888898` | `var(--text)` / `var(--text-muted)` |

Leave layout, sizing, and any `rgb(… / …)` scrim alone.

- [ ] **Step 3: Re-run the grep to confirm**

```bash
grep -rnE '#[0-9a-fA-F]{3,8}' src/features/contractions/
```

Expected: no matches.

- [ ] **Step 4: Full verification pass**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all tests pass, lint clean, build succeeds.

Then `npm run dev` and run the acceptance walk end to end:

1. Switch to Contractions — it is teal/clay, not purple, and its timer and list still work.
2. Switch back to Baby. Start a breast feed, go to Charts, then Log, then back via the mini bar. Stop and save.
3. Start a bottle feed, then tap Breast — the guard dialog appears; pick Cancel, then Save & start.
4. On Log, apply a type + side + custom range + night band + search filter together and confirm the result count matches what is listed.
5. Toggle Auto/Light/Dark; every screen is legible in both.
6. Reload the page — theme, mode, records, and any running session all survive.

- [ ] **Step 5: Commit**

```bash
git add -A src/features/contractions
git commit -m "style: retheme contraction tracker onto shared design tokens"
```

---

## Verification Summary

Automated (`npm test`): `feedLogic.test.js` (existing + pause/resume), `sessionGuard.test.js`, `logFilter.test.js`, `diaperLogic.test.js`, `backup.test.js`, `storage.test.js`, `dates.test.js`, `useFeedStore.session.test.js`.

Manual, because this repo has no component test harness and the plan adds no dependencies: everything in Task 11 Step 4.

The three defects from the spec each have a specific check: navigating away from a running feed and returning via the mini bar (Task 7 Step 6 item 3), the guard dialog on a second start (Task 8 Step 3), and the combined filter with a matching result count (Task 11 Step 4 item 4).
