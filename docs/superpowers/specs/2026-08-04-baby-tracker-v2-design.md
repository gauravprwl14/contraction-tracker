# Baby Tracker v2 — Session UX, Theme, and Log Filters

Date: 2026-08-04
Status: approved for planning
Supersedes the UI portions of `2026-08-03-baby-tracker-design.md`. The data model, storage
keys, and pure-logic modules from that spec remain in force.

## Problem

Three defects in the shipped baby tracker:

1. **A running feed is unreachable once dismissed.** The breast timer lives in a modal
   (`BreastFeedSheet.jsx`). It is re-opened only on app mount, and its sole exit — "Cancel" —
   calls `discardActive()`. Switching tabs or closing the sheet makes the running session
   invisible, with no way to return to it and stop it.
2. **Starting a second session destroys the first.** `startExternal()` and `startBreast()`
   overwrite `active` unconditionally. Tapping "Bottle" during a live breast feed silently
   discards that feed. This is data loss, not merely bad UX.
3. **The log cannot find an individual record.** `LogTab` offers three exclusive chips
   (All / Feeds / Diapers) over an unbounded scroll of every record ever written. There is no
   date range, no drill-down, no search.

Plus a visual problem: the theme is purple with a gradient-clipped title and emoji used as
iconography.

## Scope

Rebuild the baby app's presentation layer. Retheme the contractions app so the two modes do
not clash; its structure and behaviour are unchanged.

**Kept unchanged:** `feedLogic.js`, `diaperLogic.js`, `backup.js`, `utils/*`. These are pure,
tested, and correct. Additions only (see §2, §4).

**Storage keys are unchanged** — `baby_tracker_feeds_v1`, `baby_tracker_diapers_v1`,
`baby_tracker_active_v1`, `baby_tracker_prefs_v1`. Existing user data must load without
migration. The one new session field (`pausedAt`) is additive and absent-means-running.

**Out of scope:** contraction timer UX, contraction list filters, any change to the record
shapes, any server or sync feature.

---

## 1. Session model

### States

`active` is `null` or one of two session objects, persisted to `baby_tracker_active_v1` on
every change (as today).

| State | Shape | Meaning |
|---|---|---|
| idle | `active === null` | no session |
| breast running | `{type:'breast', startTime, activeSide, sideStartedAt, leftMs, rightMs}` | timer accruing on `activeSide` |
| breast paused | same, plus `pausedAt: <ts>` | no accrual |
| bottle in progress | `{type:'external', startTime, draft:{…}}` | quantity/type being entered |

Only one session exists at a time. This is already true structurally; §3 makes it true
behaviourally.

### Pause / resume

New pure functions in `feedLogic.js`:

- `pauseSession(active, now)` — returns `commitSide(active, now)` with `pausedAt: now`.
  Non-breast or already-paused sessions are returned unchanged.
- `resumeSession(active, now)` — returns the session with `pausedAt` removed and
  `sideStartedAt: now`. A session without `pausedAt` is returned unchanged.

`sideElapsedMs` must return the committed base (no live accrual) when `pausedAt` is set.
This is the only edit to an existing pure function; its current callers are unaffected because
`pausedAt` is never set on sessions they produce.

### Presentation

**On Home, when a session exists:** `ActiveSessionCard` renders *in place of* the two start
buttons. Breast variant: total elapsed, Left and Right buttons each showing per-side time with
a live dot on the accruing side, `Stop & save` as primary, `Pause`/`Resume` and `Discard` as
secondary. Bottle variant: the quantity picker and milk/method controls inline, `Save` primary,
`Discard` secondary. Discard requires confirmation.

**On Charts and Log, when a session exists:** `ActiveSessionBar` is fixed above the tab bar —
live dot, session type, elapsed time. Tapping it switches to the Home tab. It is not
dismissible.

**Navigation never mutates the session.** There is no code path from a tab change or a card
collapse to `discardActive()`.

`BreastFeedSheet.jsx` is deleted. `ExternalFeedSheet.jsx` is deleted; its controls move into
the bottle variant of `ActiveSessionCard`.

### Stale sessions

`isStale` (>6h) keeps its current threshold. The handling changes: instead of the current
mount-time `EditSheet` ambush, `ActiveSessionCard` renders a notice inline — "Running for 7h.
Check the end time and save, or discard it." — with buttons that open the existing `EditSheet`
prefilled, or discard. The `staleRecord` lazy-initialiser in `BabyApp` is removed.

`LONG_FEED_MS` (2h) keeps its current use as a softer inline warning on the card.

---

## 2. Single-session guard

`BabyApp` exposes one entry point for starting work:

```
onStart(type)   // type: 'breast' | 'bottle'
```

Decision logic lives in `session/sessionGuard.js` as a pure function so it is testable without
rendering a dialog:

```js
// -> {action: 'start'} | {action: 'confirm', running: <session>, requested: <type>}
export function decideStart(active, requestedType, now)
```

- `active === null` → `{action: 'start'}`
- otherwise → `{action: 'confirm', …}`

On `confirm`, `StartSessionGuard` opens with the running session's type and elapsed time and
three choices:

| Choice | Effect |
|---|---|
| Save it & start `<new>` | finalize the running session via `stopBreast()`/`saveExternal()`, add the feed, then start the requested one |
| Discard it & start `<new>` | `discardActive()`, then start the requested one |
| Cancel | no state change; switch to the Home tab so the running session is visible |

The guard applies in both directions (breast→bottle and bottle→breast) and to a same-type
restart. Tapping the *other side* of a running breast feed is a side switch, not a new
session, and is not guarded.

---

## 3. Log filters

### Filter state

```js
{
  range: { preset: 'today'|'7d'|'30d'|'all'|'custom', from: ts|null, to: ts|null },
  types: Set<'breast'|'bottle'|'pee'|'poop'>,   // empty set = no type restriction
  side:  'any'|'left'|'right',
  milk:  'any'|'formula'|'expressed',
  band:  'any'|'night'|'day',
  q:     string,
}
```

Default: `{preset:'7d'}`, empty `types`, everything else `'any'` / `''`. The current log's
unbounded "everything ever" scroll becomes an explicit `'all'` choice.

### Semantics

`log/logFilter.js` exports pure, unit-tested functions:

- `rangeBounds(range, now)` → `{from, to}` in ms. `'today'` uses `startOfDay`/`endOfDay`;
  `'7d'`/`'30d'` use `addDays(startOfDay(now), -6 / -29)` through `endOfDay(now)`;
  `'all'` → `{from: -Infinity, to: Infinity}`; `'custom'` uses the supplied dates, clamped to
  whole days, and falls back to `'all'` bounds if either end is null.
- `matchesType(entry, types, side, milk)` — empty `types` matches everything. `'breast'`
  additionally requires the feed to have nonzero time on `side` when `side !== 'any'`.
  `'bottle'` additionally requires `milk` to match when `milk !== 'any'` (`'expressed'` maps to
  the stored value `'expressed'`, `'formula'` to `'formula'`). `'pee'` matches
  `diaper.pee === true`; `'poop'` matches `diaper.poop === true`; a pee+poop diaper matches
  either. Type predicates OR together.
- `matchesBand(entry, band)` — `NIGHT_START_HOUR = 22`, `NIGHT_END_HOUR = 6`, exported
  constants. Night is `hour >= 22 || hour < 6` on the entry's local time. Day is the
  complement.
- `matchesQuery(entry, q)` — case-insensitive substring match on the `note` field. Empty `q`
  matches everything.
- `applyFilters(entries, filter, now)` — composes the above with AND, preserving the
  newest-first order it was given.

`side` and `milk` are ignored unless their parent type is in `types`; the UI only renders them
in that case.

### Presentation

`LogFilterBar`:
- Type chips always visible and multi-selectable: Breast, Bottle, Pee, Poop. `side` and `milk`
  segmented controls appear beneath when their parent chip is on.
- A collapsible **More filters** section holding the date-range presets + custom
  `<input type="date">` pair, the day/night band control, and the note search field.
- A summary line: `N records` and a **Clear filters** button, shown only when the filter
  differs from the default.

`LogScreen` groups the filtered entries with the existing `groupByDay` and renders
`LogEntryRow` per record: time, icon, primary line, secondary detail line, note. Tapping a row
opens the existing `EditSheet` — unchanged behaviour.

Two distinct empty states: "Nothing logged yet" when the store is empty, and "No records match
these filters" with a Clear filters action when it is not.

Filter state lives in `useLogFilter()` and is held in `BabyApp`, so it survives tab switches
within a session. It is not persisted to localStorage.

---

## 4. Shared clock

`useFeedStore` and `useDiaperStore` each run their own `setInterval` (500ms and 1000ms), never
cleared, re-rendering the whole app forever whether or not anything is running.

Replace both with one `hooks/useNow(active)` in `src/features/baby/hooks/`:
- ticks at 500ms while `active` is truthy
- ticks at 60s while idle (so "last feed 2h ago" stays fresh without burning frames)
- returns `Date.now()` and clears its interval on unmount

`BabyApp` owns the clock and passes `now` to both stores, which drop their internal timers and
accept `now` as an argument. This keeps the stores pure with respect to time, which also makes
their existing tests simpler rather than harder.

---

## 5. Theme

`src/styles/tokens.css` defines the palette, spacing scale, radii, and type scale.

```
              light      dark
--bg          #FAF9F7    #14161A
--surface     #FFFFFF    #1C1F24
--surface-2   #F2F0EC    #23272E
--border      #E4E1DB    #2A2E35
--text        #1A1D21    #ECEDEF
--text-muted  #6B7078    #9098A2
--accent      #0E7C6B    #2AA391   (teal — primary actions, live state)
--stop        #B4472E    #E0674A   (clay — stop/destructive)
```

Category colours derive from the same set: breast = accent, bottle = amber, diaper = slate,
poop = clay.

Dark mode via `@media (prefers-color-scheme: dark)`, overridable by `[data-theme="light"|"dark"]`
on the root, with a toggle in the app header persisted to localStorage under `app_theme_v1`.

Removed: the `--accent: #7c6aff` purple, the gradient-clipped `.app-title`, and every emoji
glyph used as an icon. Icons become inline SVG in `icons/Icon.jsx` (a `<symbol>` sprite plus a
thin `<Icon name/>` wrapper). Emoji remain acceptable only in user-authored note text.

`contractions.css` keeps its structure; its colour literals are replaced by references to the
shared tokens.

---

## 6. File layout

```
src/styles/
  tokens.css                    NEW  palette, spacing, radii, type scale
  base.css                      REWRITTEN  reset + app shell, no colour literals

src/features/baby/
  BabyApp.jsx                   REWRITTEN  shell: tabs, clock, toast, dialogs, onStart
  baby.css                      REWRITTEN  no colour literals

  session/
    ActiveSessionCard.jsx       NEW  live card on Home (breast + bottle variants)
    ActiveSessionBar.jsx        NEW  mini bar on non-Home tabs
    StartSessionGuard.jsx       NEW  confirm dialog
    sessionGuard.js             NEW  decideStart()                         [tested]

  screens/
    HomeScreen.jsx              REWRITTEN
    ChartsScreen.jsx            MOVED from components/ChartsTab.jsx
    LogScreen.jsx               REWRITTEN from components/LogTab.jsx

  log/
    LogFilterBar.jsx            NEW
    LogEntryRow.jsx             NEW
    logFilter.js                NEW  pure filter predicates                [tested]
    useLogFilter.js             NEW  filter state

  hooks/
    useNow.js                   NEW
    useFeedStore.js             MODIFIED  accepts now; pause/resume
    useDiaperStore.js           MODIFIED  accepts now

  icons/Icon.jsx                NEW

  components/                   KEPT, restyled
    EditSheet.jsx  QuantityPicker.jsx  Toast.jsx
    charts/*                    KEPT, retinted

  DELETED
    components/BreastFeedSheet.jsx
    components/ExternalFeedSheet.jsx
    components/HomeScreen.jsx   (replaced by screens/HomeScreen.jsx)
    components/LogTab.jsx
    components/ChartsTab.jsx
```

No new dependencies.

---

## 7. Error handling

- **Corrupt persisted session.** `restoreActive` already validates `startTime` is a number.
  Extend it to reject a session whose `type` is neither `'breast'` nor `'external'`, returning
  `{active: null, stale: false}` rather than rendering a card it cannot interpret.
- **Discard is confirmed, stop is not.** Stop-and-save is recoverable via the existing undo
  toast; discard is not, so it prompts.
- **Custom date range with `from > to`.** `rangeBounds` swaps them rather than returning an
  empty result.
- **Import** keeps its existing `window.confirm` guard and error toast.

## 8. Testing

New unit tests (Vitest, no DOM required):

- `sessionGuard.test.js` — idle starts directly; running of either type requires confirm;
  same-type restart requires confirm.
- `logFilter.test.js` — each `rangeBounds` preset; custom range with null ends and with
  reversed ends; type predicates including pee+poop matching either; side and milk drill-down;
  night band wrapping midnight; case-insensitive query; AND composition.
- `feedLogic.test.js` additions — `pauseSession` commits the running side and stops accrual;
  `resumeSession` restarts it; `sideElapsedMs` returns the frozen value while paused;
  pause/resume round-trips through a JSON serialise (persistence safety).

Existing tests must pass unmodified except where a store signature changes (`now` as an
argument), which is a mechanical edit to the test setup.

Manual verification before completion: start a breast feed, switch to Log, confirm the bar
shows and the timer is still advancing, return to Home via the bar, stop and save. Then start a
feed and tap Bottle to confirm the guard appears and each of its three choices behaves.

## 9. Non-goals

Explicitly not addressed, to keep this to one implementation plan: notifications or background
timers (the app only advances while open — unchanged from today), sleep tracking, multiple
babies, growth/weight records, and any change to the charts beyond retinting.
