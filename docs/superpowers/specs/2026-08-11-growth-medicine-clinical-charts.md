# Spec: Growth tracker, medicine log, and clinician-legible charts

**Date:** 2026-08-11
**Branch:** baby-tracker
**Status:** scoped, not implemented

Scoped at the end of a long session and written down so implementation can start
in a fresh context. Decisions below were confirmed by the user; do not re-litigate
them.

## Confirmed decisions

1. **Doctor-facing output = cleaner on-screen charts.** No separate printable
   report, no PDF. Improve the existing Charts tab so it can be handed across the
   desk on a phone. Axis labels, units, and clinically-meaningful metrics.
2. **Growth = weight + height + head circumference.** No WHO percentile curves —
   explicitly out of scope for this pass.
3. **Medicine = log doses as given.** No recurring schedules, no reminders. Same
   after-the-fact shape as the existing diaper logging.

## Why the ordering matters

The charts work depends on the growth tracker. The single most useful clinical
metric this app can show is **intake per kg per day**, which is impossible without
a current weight. Build growth first, then charts.

## Build order

### 1. Growth store and logic

- `src/features/baby/growthLogic.js` — `createMeasurement({ weightKg, heightCm,
  headCm }, now)`. All three fields optional so a weigh-in without a tape measure
  is still valid; reject an entry where all three are absent.
- `latestWeightKg(measurements, now)` — needed by the intake chart.
- `src/features/baby/hooks/useGrowthStore.js` — mirror `useDiaperStore` exactly:
  `loadItems`/`saveItems`, key `baby_tracker_growth_v1`, newest-first sort, plus
  `replaceAll` for backup import.
- Unit tests alongside, matching the existing pure-logic test convention.

### 2. Medicine store and logic

- `src/features/baby/medicineLogic.js` — `createDose({ name, amount, unit, note },
  now)`. Units: ml, mg, drops.
- Recent-names helper so repeat medicines are one tap, mirroring
  `lastExternalPrefs` in `feedLogic.js`.
- `src/features/baby/hooks/useMedicineStore.js` — key `baby_tracker_medicine_v1`,
  same shape as above, including `replaceAll`.

### 3. Wire into existing surfaces

- **Home** — a log entry point for both. The diaper action row is the pattern to
  follow. Growth is logged rarely, so it does not need equal prominence to feeds.
- **Log screen** — both new kinds must appear in the unified list. Touch
  `entrySummary.js` (summary text), `logFilter.js` (filter chips), and
  `LogEntryRow.jsx`. `logFilter.test.js` has 25 tests and will need extending.
- **Edit sheet** — `EditSheet.jsx` currently branches on `kind` of `feed` /
  `diaper`; add the two new kinds so entries stay editable and deletable.
- **Icons** — `icons/Icon.jsx` needs `growth` and `medicine` glyphs. The project
  deliberately uses no emoji; follow the existing SVG pattern.

### 4. Backup format — IMPORTANT

`src/features/baby/backup.js` is already wired and tested. Extend it, do not
replace it:

- Add `growth` and `medicine` arrays to `buildBackup`.
- **Bump `version` to 2.**
- `parseBackup` must still accept v1 files, defaulting the two new arrays to `[]`
  — same defensive treatment `presets` already gets. There are existing v1
  backups in the wild.
- Add CSV exporters for both, using the shared `toCsv` in `src/utils/csv.js`.
- Extend `backup.test.js`, including a v1-file round-trip case.

### 5. Charts — the clinical pass

Current state and verdict:

| Chart | Verdict |
|---|---|
| `TimelineStrip` | Keep. Good pattern-at-a-glance, but add an hour axis. |
| `FeedGapChart` | Keep, but label the y-axis and give it a scale. Currently unitless. |
| `DailyTotalsChart` | Best foundation. Build on this. |
| `SideBalanceChart` | Parent-facing, near-noise to a paediatrician. Demote below the clinical charts; do not delete. |

Add:

- **Intake per kg per day** — `totalMl / latestWeightKg`. The headline clinical
  number. Show the weight used and its date, so the doctor can see what it was
  derived from.
- **Nappy counts per day** — wet and dirty as separate series. Already computed in
  `dailyDiaperTotals`; it needs surfacing with labelled axes.
- **Growth trend** — weight/height/head over time, one toggleable series at a
  time. Reuse the `DailyTotalsChart` metric-toggle pattern.
- **Medicine markers** — overlay doses on `TimelineStrip` so "did the fever meds
  line up with the poor feeding" is answerable.

Cross-cutting chart fixes, all of which currently block clinical legibility:

- Every axis needs a unit label. Several charts have none.
- Date ranges must be stated on the chart, not just implied by the data.
- Do not colour-code anything as normal/abnormal. Present numbers; a range
  judgement is the clinician's to make, and the app must not appear to diagnose.

## Constraints carried from the existing codebase

- Offline, localStorage only. No network, no service worker.
- Tests are `vitest`, `environment: 'node'`, pure logic only. `vitest.config.js`
  now sets `esbuild: { jsx: 'automatic' }`, so static component render tests are
  possible via `react-dom/server` — see `ContractionsApp.test.js`.
- `npm run lint` is currently at **zero errors**. Keep it there. The React
  compiler rules reject `setState` inside effects, refs read during render, and
  `Date.now()` at render time — derive time-dependent values from the shared
  `useNow` hook at `src/hooks/useNow.js` instead.
- No emoji in UI; use the SVG `Icon` component.
- Design tokens live in `src/styles/tokens.css`. Use them rather than literals.

## Not verified in a browser

The Playwright MCP bridge was unavailable throughout the session that produced
the preceding work (export/import, days-since-poop card, editable quantity
stepper). Logic is unit-tested and the build is clean, but none of that UI has
been visually confirmed. Worth a look before building on top of it.
