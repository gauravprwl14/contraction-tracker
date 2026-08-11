# Baby Tracker — Design

**Date:** 2026-08-03
**Status:** Approved
**Repo:** existing contraction tracker (React 19 + Vite, GitHub Pages)

## Purpose

Track a newborn's feeding and diapers on a phone, one-handed, at 3am. Two record
types: feeds (breast or external milk) and diapers (pee / poop). Charts show the
feeding rhythm over time.

The existing contraction tracker stays in the app and remains fully functional.

## Success criteria

- Logging a repeat bottle feed takes three taps; logging a diaper takes one.
- A breast feed records start time, end time, and per-side duration without the
  user entering any time value.
- Closing the app mid-feed does not lose the running timer.
- Every recorded value — quantity, times, date, side, type, notes — is editable
  after the fact.
- Works offline. No accounts, no backend, no network calls.

## Non-goals

- Multi-device sync. Data is local to one browser; backup is manual export/import.
- Sleep tracking, growth charts, medication, pumping sessions.
- Multiple babies. One baby, one dataset.

---

## Architecture

### Top-level shell

`App.jsx` becomes a thin shell holding a mode switch between **Baby** and
**Contractions**, rendered as a small segmented control in the header. Baby is
the default. The selected mode persists to localStorage under
`app_mode_v1` so reopening the app returns to where the user was.

```
src/
  App.jsx                     mode switch + header/footer shell
  styles/
    base.css                  shared tokens, resets, buttons, sheets
  features/
    contractions/             existing app, moved verbatim
      ContractionsApp.jsx     (extracted from today's App.jsx body)
      components/…            TimerButton, StatsBar, ContractionGraph, ContractionList
      hooks/useContractionStore.js
      contractions.css
    baby/
      BabyApp.jsx             bottom tabs: Home | Charts | Log
      components/…
      hooks/useFeedStore.js
      hooks/useDiaperStore.js
      baby.css
  utils/
    format.js                 shared (existing)
    dates.js                  day bucketing, gap math
    storage.js                versioned localStorage load/save helpers
```

The contraction feature moves without behavioural change: same components, same
`contraction_tracker_data` storage key, same logic. Only its imports and CSS
location change.

`App.css` (669 lines) is split — shared primitives to `styles/base.css`,
contraction-specific rules to `features/contractions/contractions.css`. This is a
move, not a rewrite; no visual change to the contraction tracker is intended.

### Baby navigation

Three bottom tabs, plain `useState`, no router:

- **Home** — action buttons, "last fed" banner, today's summary, recent entries
- **Charts** — the four charts
- **Log** — full history, filterable by type, with edit and delete

Bottom placement because a phone's thumb rests at the bottom of the screen.

---

## Data model

Three localStorage keys. Each stores `{ version: 1, items: [...] }` so a future
shape change can migrate rather than discard.

### Feeds — `baby_tracker_feeds_v1`

```js
{
  id: string,                  // crypto.randomUUID()
  type: 'breast' | 'external',
  startTime: number,           // ms epoch
  endTime: number,             // ms epoch
  note: string,

  // type === 'breast'
  leftMs: number,              // accumulated time on left
  rightMs: number,             // accumulated time on right
  lastSide: 'left' | 'right',  // side active when the feed was stopped

  // type === 'external'
  milk: 'expressed' | 'formula',
  method: 'bottle' | 'spoon' | 'syringe',
  offeredMl: number,
  takenMl: number,
}
```

Fields not relevant to the record's `type` are absent, not null.

Duration is always derived as `endTime - startTime`, never stored. For breast
feeds this is wall-clock time including the switch gap; `leftMs + rightMs` is the
active suckling time and may be less. Both are shown.

### Diapers — `baby_tracker_diapers_v1`

```js
{
  id: string,
  time: number,                // ms epoch
  pee: boolean,
  poop: boolean,               // "Both" sets pee and poop true
  color?: 'yellow' | 'green' | 'brown' | 'black' | 'red' | 'white',
  consistency?: 'runny' | 'soft' | 'seedy' | 'formed' | 'hard',
  amount?: 'small' | 'medium' | 'large',
  note: string,
}
```

The three optional fields are only set through the edit sheet. A one-tap log
leaves them undefined.

### Active feed — `baby_tracker_active_v1`

The in-progress feed, written on every timer tick (1s) and cleared on save or
discard:

```js
{
  type: 'breast' | 'external',
  startTime: number,
  activeSide: 'left' | 'right' | null,   // breast: side currently running
  sideStartedAt: number | null,          // breast: when the current side began
  leftMs: number,                        // breast: committed left time
  rightMs: number,                       // breast: committed right time
  draft: { … }                           // external: milk/method/offeredMl/takenMl so far
}
```

On mount, `useFeedStore` reads this key. If present, it restores the sheet and
recomputes elapsed time from `startTime` and `sideStartedAt` against `Date.now()`
— so the timer is correct even if the app was closed for twenty minutes. Elapsed
time is never accumulated by counting ticks.

### Stale-session guard

If a restored active feed's `startTime` is more than 6 hours old, the app does not
resume the timer. It opens the edit sheet pre-filled with the recorded values and a
notice that the feed looks unfinished, so the user can correct the end time and
save, or discard it. It never silently deletes a session and never auto-stops a
running one.

---

## Hooks

Two hooks in the shape of the existing `useContractionStore`: state, persistence
effect, derived values, and mutation functions returned as one object.

### `useFeedStore()`

Returns:

| Name | Meaning |
|---|---|
| `feeds` | all feeds, newest first |
| `active` | active feed state, or null |
| `elapsed`, `leftElapsed`, `rightElapsed` | live seconds for the running feed |
| `timeSinceLastFeed` | seconds since the last feed's `endTime`, ticking |
| `lastFeed` | most recent feed record |
| `suggestedSide` | opposite of `lastFeed.lastSide`, or `'left'` |
| `lastExternalPrefs` | `{ milk, method }` from the most recent external feed |
| `todayStats` | `{ feedCount, totalMl, breastMinutes }` |
| `startBreastFeed(side)`, `switchSide(side)`, `stopFeed()` | breast flow |
| `startExternalFeed()`, `updateDraft(fields)`, `saveExternalFeed()` | bottle flow |
| `discardActive()` | cancel without saving |
| `updateFeed(id, fields)`, `deleteFeed(id)`, `undoLast()` | edits |

### `useDiaperStore()`

Returns `diapers`, `todayStats` (`{ peeCount, poopCount }`), `timeSinceLastPoop`,
and `logDiaper({ pee, poop })`, `updateDiaper(id, fields)`, `deleteDiaper(id)`,
`undoLast()`.

Derived values are computed in the hooks. Components render; they do not calculate.

---

## Logging flows

### Home screen

```
┌───────────────────────┐
│ Last feed 2h 10m ago  │
│ L · 12 min · 60 ml    │
├───────────────────────┤
│  [ 🤱  Breast ]       │
│  [ 🍼  Bottle ]       │
│  [💧 Pee][💩 Poop][Both]│
├───────────────────────┤
│ Today 8 feeds · 5💧 2💩│
│ 03:14  💧              │
│ 02:40  🤱 L8 R5        │
└───────────────────────┘
  [Home] [Charts] [Log]
```

The banner shows time since the last feed, ticking live, with a one-line summary
of what that feed was.

### Breast feed

1. Tap **🤱 Breast** — a full-screen sheet opens. Two large side buttons, the
   suggested side visually highlighted. No timer runs yet.
2. Tap a side — that side's timer starts. The sheet shows total elapsed at the top
   and per-side time on each button, with a dot marking the running side.
3. Tap the other side — the first pauses, its accumulated time is preserved, the
   second starts.
4. Tap **Stop** — the feed saves immediately with no confirmation dialog, matching
   the existing `stopContraction` behaviour. A toast offers **Undo** for 5 seconds.

Start and end times are captured automatically. The user enters no time value.

### External / bottle feed

1. Tap **🍼 Bottle** — sheet opens and the feed's `startTime` is recorded at that
   moment, so duration is captured without the user thinking about it.
2. Milk toggle (Expressed / Formula) and method chips (Bottle / Spoon / Syringe)
   are pre-selected from `lastExternalPrefs`.
3. Quantity: chips `30 · 60 · 90 · 120` ml plus a `−  75 ml  +` stepper at ±10.
   The chosen value is **offered**.
4. Below it, `Taken: 75 ml` defaults to the offered amount with the same stepper.
   One tap if the baby finished it; adjust if not.
5. **Save** — `endTime` is the moment of save.

A repeat bottle feed is three taps: Bottle → 60 → Save.

Quantity presets are user-editable: long-press a chip to change its value; presets
persist under `baby_tracker_prefs_v1`.

### Diaper

Tapping **Pee**, **Poop**, or **Both** on Home logs immediately at the current
time and shows a confirm toast with Undo. No sheet, no fields.

Details are added later by tapping the entry in the list, which opens the edit
sheet with colour swatches, consistency, and amount.

### Editing

Every record is editable, including date and time. The edit sheet is generated
from the same field definitions used by the create flow, so the two cannot drift
apart. Fields per type:

- Breast: date, start time, end time, left minutes, right minutes, note
- External: date, start time, end time, milk, method, offered ml, taken ml, note
- Diaper: date, time, pee, poop, colour, consistency, amount, note

Deletion is available from the edit sheet and by swipe in the Log tab, both with
an Undo toast.

---

## Charts

Hand-rolled SVG, matching the approach in the existing `ContractionGraph.jsx`. No
chart library: four simple charts do not justify ~100kb on a GitHub Pages app, and
the existing code proves the pattern works.

Each chart is its own component taking raw arrays as props and computing its own
scales, so it can be reasoned about and tested in isolation.

1. **24h timeline strip** — the headline view. One horizontal bar representing a
   day, with coloured marks at each event: feeds sized by duration, pee and poop as
   distinct marks. Swipe or arrow back through previous days. Makes the feeding
   rhythm and the night gaps visible at a glance.
2. **Gap between feeds** — one bar per gap, in hours, newest on the right, with a
   rolling-average line. Shows whether the baby is stretching to longer intervals.
3. **Daily totals** — grouped bars over the last 7 or 14 days: feed count, total ml,
   breast minutes, pee count, poop count. Toggle for which series to show.
4. **Left/right balance** — cumulative minutes per side, today and last 7 days.

Empty states: each chart renders a short "not enough data yet" message rather than
an empty axis frame.

---

## Errors and edge cases

- **Corrupt or missing storage** — `loadFromStorage` returns an empty list rather
  than throwing, as it does today. A parse failure does not overwrite the bad data;
  it is left in place so it can be recovered manually.
- **Unreasonably long feed** — a feed running past 2 hours is flagged in the UI with
  a "still feeding?" prompt but is never auto-stopped. The user may simply have
  forgotten to stop it, and the edit sheet corrects the end time.
- **Midnight crossing** — an entry is attributed to the day it *started*, applied
  consistently in every chart, every daily total, and the Log grouping. Implemented
  once in `utils/dates.js`.
- **Clock changes / timezones** — timestamps are stored as ms epoch; all display
  uses the device's current locale and zone. No attempt is made to correct for a
  device clock that was wrong at entry time; the record is editable.
- **Zero-duration feed** — a breast feed stopped without a side ever selected is
  not saved; the sheet closes with no record.

---

## Testing

The project has no test setup. Add Vitest and cover the pure logic, where the bugs
actually live:

- Per-side timer accumulation, including switching sides multiple times
- Restoring an active feed after a simulated close, with correct elapsed time
- The 6-hour stale-session guard
- Gap-between-feeds calculation, including a single feed and no feeds
- Day bucketing across midnight, in both directions
- Daily totals aggregation
- Storage load/save round-trips, and graceful handling of corrupt JSON
- CSV and JSON export shape; JSON import round-trips to identical data

Component rendering is not tested. The value is in the date and duration math.

---

## Export and import

Extending the existing `exportCSV` pattern:

- **JSON backup** — all three stores plus prefs in one file, with a version field.
  Import replaces local data after an explicit confirm.
- **CSV** — feeds and diapers as separate files, one row per record, all fields
  as columns.

---

## Build order

1. Restructure: move contraction feature, split CSS, add mode switch. Verify the
   contraction tracker is unchanged.
2. `utils/storage.js`, `utils/dates.js`, plus their tests.
3. `useFeedStore` with the breast flow and active-session persistence, plus tests.
4. Home screen and breast feed sheet.
5. External feed flow.
6. `useDiaperStore` and diaper logging.
7. Log tab with edit sheets for all three record types.
8. Charts, in order: timeline, gaps, daily totals, side balance.
9. Export and import.
