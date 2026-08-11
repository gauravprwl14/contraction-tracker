import { describe, it, expect } from 'vitest';
import {
  createMeasurement, latestWeightKg, weightOnDay, growthSeries,
  growthChange, dailyIntakePerKg, latestMeasurement,
} from './growthLogic';

const at = (y, m, d, h = 0) => new Date(y, m - 1, d, h, 0, 0, 0).getTime();

const M = (time, fields) => ({ id: `m${time}`, time, note: '', ...fields });

describe('growthLogic', () => {
  it('creates a measurement with only the fields that were taken', () => {
    const m = createMeasurement({ weightKg: 4.2 }, at(2026, 8, 3));
    expect(m).toMatchObject({ weightKg: 4.2, time: at(2026, 8, 3), note: '' });
    expect(m.heightCm).toBeUndefined();
    expect(m.headCm).toBeUndefined();
  });

  it('rejects a measurement where nothing was actually measured', () => {
    expect(createMeasurement({}, at(2026, 8, 3))).toBe(null);
    expect(createMeasurement({ weightKg: 0, heightCm: null }, at(2026, 8, 3))).toBe(null);
  });

  it('rejects non-positive and non-finite values rather than storing them', () => {
    expect(createMeasurement({ weightKg: -1 }, at(2026, 8, 3))).toBe(null);
    expect(createMeasurement({ weightKg: NaN }, at(2026, 8, 3))).toBe(null);
  });

  it('finds the latest weight regardless of list order', () => {
    const list = [M(at(2026, 8, 1), { weightKg: 4 }), M(at(2026, 8, 5), { weightKg: 4.4 })];
    expect(latestWeightKg(list)).toBe(4.4);
    expect(latestWeightKg([...list].reverse())).toBe(4.4);
  });

  it('ignores entries that lack the metric being asked for', () => {
    const list = [M(at(2026, 8, 5), { heightCm: 55 }), M(at(2026, 8, 1), { weightKg: 4 })];
    expect(latestWeightKg(list)).toBe(4);
    expect(latestMeasurement(list, 'heightCm').heightCm).toBe(55);
  });

  it('returns null weight when none has ever been recorded', () => {
    expect(latestWeightKg([])).toBe(null);
    expect(latestWeightKg([M(at(2026, 8, 1), { heightCm: 50 })])).toBe(null);
  });

  it('uses the weight in effect on a day, not a later weigh-in', () => {
    const list = [M(at(2026, 8, 1), { weightKg: 4 }), M(at(2026, 8, 10), { weightKg: 4.6 })];
    expect(weightOnDay(list, at(2026, 8, 5))).toBe(4);
    expect(weightOnDay(list, at(2026, 8, 10))).toBe(4.6);
  });

  it('counts a weigh-in later the same day as in effect for that day', () => {
    const list = [M(at(2026, 8, 5, 18), { weightKg: 4.5 })];
    expect(weightOnDay(list, at(2026, 8, 5))).toBe(4.5);
  });

  it('has no weight for days before the first measurement', () => {
    const list = [M(at(2026, 8, 10), { weightKg: 4.6 })];
    expect(weightOnDay(list, at(2026, 8, 5))).toBe(null);
  });

  it('returns a chronological series for a metric', () => {
    const list = [M(at(2026, 8, 5), { weightKg: 4.4 }), M(at(2026, 8, 1), { weightKg: 4 })];
    expect(growthSeries(list, 'weightKg').map((p) => p.value)).toEqual([4, 4.4]);
  });

  it('reports change with the endpoints it was measured between', () => {
    const list = [M(at(2026, 8, 1), { weightKg: 4 }), M(at(2026, 8, 8), { weightKg: 4.35 })];
    const change = growthChange(list, 'weightKg');
    expect(change.delta).toBeCloseTo(0.35, 5);
    expect(change.days).toBe(7);
    expect(change.from.value).toBe(4);
    expect(change.to.value).toBe(4.35);
  });

  it('reports no change from a single reading', () => {
    expect(growthChange([M(at(2026, 8, 1), { weightKg: 4 })], 'weightKg')).toBe(null);
  });

  it('computes intake per kg from the weight in effect that day', () => {
    const feedRows = [
      { key: '2026-08-05', dayStart: at(2026, 8, 5), totalMl: 600 },
      { key: '2026-08-06', dayStart: at(2026, 8, 6), totalMl: 660 },
    ];
    const list = [M(at(2026, 8, 1), { weightKg: 4 })];
    const rows = dailyIntakePerKg(feedRows, list);
    expect(rows[0].mlPerKg).toBe(150);
    expect(rows[1].mlPerKg).toBe(165);
    expect(rows[0].weightKg).toBe(4);
  });

  it('leaves intake per kg null on days with no weight on record', () => {
    const feedRows = [{ key: '2026-08-05', dayStart: at(2026, 8, 5), totalMl: 600 }];
    expect(dailyIntakePerKg(feedRows, [])[0].mlPerKg).toBe(null);
  });
});
