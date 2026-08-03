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
