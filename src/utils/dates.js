const DAY_MS = 86400000;

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts) {
  return addDays(startOfDay(ts), 1) - 1;
}

const pad = (n) => String(n).padStart(2, '0');

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Calendar-aware so DST transitions don't drift the result.
export function addDays(ts, n) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

export function isSameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

export function groupByDay(items, getTime) {
  const map = new Map();
  for (const item of items) {
    const ts = getTime(item);
    const key = dayKey(ts);
    if (!map.has(key)) map.set(key, { key, dayStart: startOfDay(ts), items: [] });
    map.get(key).items.push(item);
  }
  return Array.from(map.values()).sort((a, b) => b.dayStart - a.dayStart);
}

export function formatDayLabel(ts, now = Date.now()) {
  const today = startOfDay(now);
  const day = startOfDay(ts);
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return new Date(ts).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function toDateInputValue(ts) {
  return dayKey(ts);
}

export function toTimeInputValue(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeInputs(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0).getTime();
}

export { DAY_MS };
