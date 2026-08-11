import { startOfDay } from '../../utils/dates';

export const CHART_RANGES = [
  { id: '7d', label: '7 days' },
  { id: '14d', label: '14 days' },
  { id: '30d', label: '30 days' },
  { id: 'custom', label: 'Custom' },
];

export const DEFAULT_CHART_RANGE = { preset: '7d', from: null, to: null };

// A doctor's visit covers a specific stretch of dates, so charts are anchored
// to the end of a range rather than always to today.
export const MAX_CHART_DAYS = 120;

const PRESET_DAYS = { '7d': 7, '14d': 14, '30d': 30 };

// Returns the day the chart ends on and how many days it spans, which is the
// shape the existing dailyFeedTotals / dailyDiaperTotals helpers already take.
export function resolveChartRange(range, now) {
  const preset = range?.preset ?? '7d';
  if (preset === 'custom' && range?.from != null && range?.to != null) {
    const lo = startOfDay(Math.min(range.from, range.to));
    const hi = startOfDay(Math.max(range.from, range.to));
    const span = Math.round((hi - lo) / 86400000) + 1;
    const days = Math.min(MAX_CHART_DAYS, span);
    return { anchor: hi, days, clamped: span > MAX_CHART_DAYS };
  }
  return { anchor: startOfDay(now), days: PRESET_DAYS[preset] ?? 7, clamped: false };
}
