import { startOfDay, dayKey, addDays } from '../../utils/dates';

export const STALE_MS = 6 * 60 * 60 * 1000;
export const LONG_FEED_MS = 2 * 60 * 60 * 1000;

const DEFAULT_EXTERNAL_PREFS = { milk: 'formula', method: 'bottle' };

export function createBreastSession(side, now) {
  return {
    type: 'breast',
    startTime: now,
    activeSide: side,
    sideStartedAt: now,
    leftMs: 0,
    rightMs: 0,
  };
}

export function createExternalSession(now, prefs = DEFAULT_EXTERNAL_PREFS) {
  return {
    type: 'external',
    startTime: now,
    draft: {
      milk: prefs.milk ?? DEFAULT_EXTERNAL_PREFS.milk,
      method: prefs.method ?? DEFAULT_EXTERNAL_PREFS.method,
      offeredMl: 60,
      takenMl: 60,
      note: '',
    },
  };
}

export function commitSide(active, now) {
  if (!active || active.type !== 'breast' || !active.activeSide) return active;
  const ran = Math.max(0, now - active.sideStartedAt);
  const key = active.activeSide === 'left' ? 'leftMs' : 'rightMs';
  return { ...active, [key]: active[key] + ran, sideStartedAt: now };
}

export function switchSide(active, side, now) {
  const committed = commitSide(active, now);
  return { ...committed, activeSide: side, sideStartedAt: now };
}

export function sideElapsedMs(active, side, now) {
  if (!active || active.type !== 'breast') return 0;
  const base = side === 'left' ? active.leftMs : active.rightMs;
  if (active.activeSide !== side) return base;
  return base + Math.max(0, now - active.sideStartedAt);
}

export function finalizeBreastFeed(active, now) {
  const leftMs = sideElapsedMs(active, 'left', now);
  const rightMs = sideElapsedMs(active, 'right', now);
  if (leftMs + rightMs === 0) return null;
  return {
    id: crypto.randomUUID(),
    type: 'breast',
    startTime: active.startTime,
    endTime: now,
    leftMs,
    rightMs,
    lastSide: active.activeSide ?? (leftMs >= rightMs ? 'left' : 'right'),
    note: '',
  };
}

export function finalizeExternalFeed(active, now) {
  const d = active.draft;
  return {
    id: crypto.randomUUID(),
    type: 'external',
    startTime: active.startTime,
    endTime: now,
    milk: d.milk,
    method: d.method,
    offeredMl: d.offeredMl,
    takenMl: d.takenMl,
    note: d.note ?? '',
  };
}

export function isStale(active, now) {
  if (!active) return false;
  return now - active.startTime > STALE_MS;
}

export function feedDurationMs(feed) {
  return Math.max(0, feed.endTime - feed.startTime);
}

export function suggestedSide(feeds) {
  const lastBreast = feeds.find((f) => f.type === 'breast');
  if (!lastBreast) return 'left';
  return lastBreast.lastSide === 'left' ? 'right' : 'left';
}

export function lastExternalPrefs(feeds) {
  const last = feeds.find((f) => f.type === 'external');
  if (!last) return { ...DEFAULT_EXTERNAL_PREFS };
  return { milk: last.milk, method: last.method };
}

// feeds are newest-first; gaps[i] sits between feeds[i] and feeds[i + 1]
export function gapsBetweenFeeds(feeds) {
  const gaps = [];
  for (let i = 0; i < feeds.length - 1; i += 1) {
    gaps.push(Math.max(0, feeds[i].startTime - feeds[i + 1].endTime));
  }
  return gaps;
}

function emptyRow(dayStart) {
  return { key: dayKey(dayStart), dayStart, feedCount: 0, totalMl: 0, breastMs: 0 };
}

function addFeedToRow(row, feed) {
  row.feedCount += 1;
  if (feed.type === 'external') row.totalMl += feed.takenMl ?? 0;
  else row.breastMs += (feed.leftMs ?? 0) + (feed.rightMs ?? 0);
  return row;
}

export function todayFeedStats(feeds, now) {
  const today = startOfDay(now);
  const row = emptyRow(today);
  for (const feed of feeds) {
    if (startOfDay(feed.startTime) === today) addFeedToRow(row, feed);
  }
  return { feedCount: row.feedCount, totalMl: row.totalMl, breastMs: row.breastMs };
}

export function dailyFeedTotals(feeds, now, days) {
  const rows = [];
  const index = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const row = emptyRow(addDays(startOfDay(now), -i));
    rows.push(row);
    index.set(row.key, row);
  }
  for (const feed of feeds) {
    const row = index.get(dayKey(feed.startTime));
    if (row) addFeedToRow(row, feed);
  }
  return rows;
}

export function sideBalance(feeds, fromTs) {
  let leftMs = 0;
  let rightMs = 0;
  for (const feed of feeds) {
    if (feed.type !== 'breast' || feed.startTime < fromTs) continue;
    leftMs += feed.leftMs ?? 0;
    rightMs += feed.rightMs ?? 0;
  }
  return { leftMs, rightMs };
}
