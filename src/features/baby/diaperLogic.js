import { startOfDay, dayKey, addDays } from '../../utils/dates';

export const DIAPER_COLORS = ['yellow', 'green', 'brown', 'black', 'red', 'white'];
export const DIAPER_CONSISTENCIES = ['runny', 'soft', 'seedy', 'formed', 'hard'];
export const DIAPER_AMOUNTS = ['small', 'medium', 'large'];

export function createDiaper({ pee, poop }, now) {
  return {
    id: crypto.randomUUID(),
    time: now,
    pee: Boolean(pee),
    poop: Boolean(poop),
    note: '',
  };
}

export function todayDiaperStats(diapers, now) {
  const today = startOfDay(now);
  let peeCount = 0;
  let poopCount = 0;
  for (const d of diapers) {
    if (startOfDay(d.time) !== today) continue;
    if (d.pee) peeCount += 1;
    if (d.poop) poopCount += 1;
  }
  return { peeCount, poopCount };
}

export function dailyDiaperTotals(diapers, now, days) {
  const rows = [];
  const index = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = addDays(startOfDay(now), -i);
    const row = { key: dayKey(dayStart), dayStart, peeCount: 0, poopCount: 0 };
    rows.push(row);
    index.set(row.key, row);
  }
  for (const d of diapers) {
    const row = index.get(dayKey(d.time));
    if (!row) continue;
    if (d.pee) row.peeCount += 1;
    if (d.poop) row.poopCount += 1;
  }
  return rows;
}

export function msSinceLastPoop(diapers, now) {
  const last = diapers.find((d) => d.poop);
  if (!last) return null;
  return Math.max(0, now - last.time);
}
