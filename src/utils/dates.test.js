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
