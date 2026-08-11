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
