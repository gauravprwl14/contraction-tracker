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
