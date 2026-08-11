import { describe, it, expect } from 'vitest';
import { resolveChartRange, MAX_CHART_DAYS, DEFAULT_CHART_RANGE } from './chartRange';
import { startOfDay } from '../../utils/dates';

const at = (y, m, d, h = 0) => new Date(y, m - 1, d, h, 0, 0, 0).getTime();
const NOW = at(2026, 8, 6, 15);

describe('resolveChartRange', () => {
  it('anchors a preset range on today', () => {
    expect(resolveChartRange({ preset: '7d' }, NOW))
      .toMatchObject({ anchor: startOfDay(NOW), days: 7 });
    expect(resolveChartRange({ preset: '30d' }, NOW).days).toBe(30);
  });

  it('defaults to 7 days for a missing or unknown preset', () => {
    expect(resolveChartRange(undefined, NOW).days).toBe(7);
    expect(resolveChartRange({ preset: 'nonsense' }, NOW).days).toBe(7);
    expect(resolveChartRange(DEFAULT_CHART_RANGE, NOW).days).toBe(7);
  });

  it('spans a custom range inclusively and ends on the later date', () => {
    const r = resolveChartRange(
      { preset: 'custom', from: at(2026, 8, 1), to: at(2026, 8, 5) }, NOW
    );
    expect(r.days).toBe(5);
    expect(r.anchor).toBe(startOfDay(at(2026, 8, 5)));
  });

  it('treats a single-day custom range as one day', () => {
    const day = at(2026, 8, 3);
    expect(resolveChartRange({ preset: 'custom', from: day, to: day }, NOW).days).toBe(1);
  });

  it('tolerates a reversed custom range', () => {
    const r = resolveChartRange(
      { preset: 'custom', from: at(2026, 8, 5), to: at(2026, 8, 1) }, NOW
    );
    expect(r.days).toBe(5);
    expect(r.anchor).toBe(startOfDay(at(2026, 8, 5)));
  });

  it('ignores an incomplete custom range rather than showing nothing', () => {
    const r = resolveChartRange({ preset: 'custom', from: at(2026, 8, 1), to: null }, NOW);
    expect(r).toMatchObject({ anchor: startOfDay(NOW), days: 7 });
  });

  it('clamps an unreasonably long range and says so', () => {
    const r = resolveChartRange(
      { preset: 'custom', from: at(2025, 1, 1), to: at(2026, 8, 5) }, NOW
    );
    expect(r.days).toBe(MAX_CHART_DAYS);
    expect(r.clamped).toBe(true);
  });

  it('uses the clock passed in rather than the wall clock', () => {
    const other = at(2026, 1, 9, 8);
    expect(resolveChartRange({ preset: '7d' }, other).anchor).toBe(startOfDay(other));
  });
});
