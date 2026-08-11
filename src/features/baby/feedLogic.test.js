import { describe, it, expect } from 'vitest';
import {
  STALE_MS, createBreastSession, createExternalSession, commitSide, switchSide,
  sideElapsedMs, finalizeBreastFeed, finalizeExternalFeed, isStale, feedDurationMs,
  suggestedSide, lastExternalPrefs, gapsBetweenFeeds, todayFeedStats, pauseSession, resumeSession,
  dailyFeedTotals, sideBalance,
} from './feedLogic';

const MIN = 60000;
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min, 0, 0).getTime();
const T0 = at(2026, 8, 3, 10, 0);

const breastFeed = (over) => ({
  id: 'f', type: 'breast', startTime: T0, endTime: T0 + 10 * MIN,
  leftMs: 6 * MIN, rightMs: 4 * MIN, lastSide: 'right', note: '', ...over,
});

const externalFeed = (over) => ({
  id: 'e', type: 'external', startTime: T0, endTime: T0 + 8 * MIN,
  milk: 'formula', method: 'bottle', offeredMl: 90, takenMl: 60, note: '', ...over,
});

describe('session lifecycle', () => {
  it('creates a breast session with the chosen side running', () => {
    const a = createBreastSession('left', T0);
    expect(a).toMatchObject({
      type: 'breast', startTime: T0, activeSide: 'left',
      sideStartedAt: T0, leftMs: 0, rightMs: 0,
    });
  });

  it('accumulates elapsed time on the running side only', () => {
    const a = createBreastSession('left', T0);
    expect(sideElapsedMs(a, 'left', T0 + 5 * MIN)).toBe(5 * MIN);
    expect(sideElapsedMs(a, 'right', T0 + 5 * MIN)).toBe(0);
  });

  it('preserves the first side time when switching', () => {
    let a = createBreastSession('left', T0);
    a = switchSide(a, 'right', T0 + 8 * MIN);
    expect(a.leftMs).toBe(8 * MIN);
    expect(a.activeSide).toBe('right');
    expect(a.sideStartedAt).toBe(T0 + 8 * MIN);
    expect(sideElapsedMs(a, 'left', T0 + 12 * MIN)).toBe(8 * MIN);
    expect(sideElapsedMs(a, 'right', T0 + 12 * MIN)).toBe(4 * MIN);
  });

  it('accumulates correctly across several switches', () => {
    let a = createBreastSession('left', T0);
    a = switchSide(a, 'right', T0 + 3 * MIN);
    a = switchSide(a, 'left', T0 + 5 * MIN);
    a = switchSide(a, 'right', T0 + 9 * MIN);
    expect(a.leftMs).toBe(7 * MIN);
    expect(a.rightMs).toBe(2 * MIN);
    expect(sideElapsedMs(a, 'right', T0 + 10 * MIN)).toBe(3 * MIN);
  });

  it('switching to the already-active side is a no-op on totals', () => {
    let a = createBreastSession('left', T0);
    a = switchSide(a, 'left', T0 + 4 * MIN);
    expect(a.leftMs).toBe(4 * MIN);
    expect(a.activeSide).toBe('left');
    expect(sideElapsedMs(a, 'left', T0 + 6 * MIN)).toBe(6 * MIN);
  });

  it('commitSide is idempotent at the same instant', () => {
    let a = createBreastSession('left', T0);
    a = commitSide(a, T0 + 5 * MIN);
    const twice = commitSide(a, T0 + 5 * MIN);
    expect(twice.leftMs).toBe(5 * MIN);
  });

  it('finalizes a breast feed with committed side times', () => {
    let a = createBreastSession('left', T0);
    a = switchSide(a, 'right', T0 + 6 * MIN);
    const feed = finalizeBreastFeed(a, T0 + 10 * MIN);
    expect(feed).toMatchObject({
      type: 'breast', startTime: T0, endTime: T0 + 10 * MIN,
      leftMs: 6 * MIN, rightMs: 4 * MIN, lastSide: 'right',
    });
    expect(feed.id).toBeTruthy();
  });

  it('does not save a breast feed where no side ever ran', () => {
    const a = { type: 'breast', startTime: T0, activeSide: null, sideStartedAt: null, leftMs: 0, rightMs: 0 };
    expect(finalizeBreastFeed(a, T0 + MIN)).toBeNull();
  });

  it('finalizes an external feed from its draft', () => {
    let a = createExternalSession(T0, { milk: 'expressed', method: 'spoon' });
    a = { ...a, draft: { ...a.draft, offeredMl: 90, takenMl: 75 } };
    const feed = finalizeExternalFeed(a, T0 + 8 * MIN);
    expect(feed).toMatchObject({
      type: 'external', startTime: T0, endTime: T0 + 8 * MIN,
      milk: 'expressed', method: 'spoon', offeredMl: 90, takenMl: 75,
    });
  });
});

describe('stale sessions', () => {
  it('is not stale inside the window', () => {
    expect(isStale(createBreastSession('left', T0), T0 + STALE_MS - 1)).toBe(false);
  });

  it('is stale past the window', () => {
    expect(isStale(createBreastSession('left', T0), T0 + STALE_MS + 1)).toBe(true);
  });

  it('a null session is never stale', () => {
    expect(isStale(null, T0)).toBe(false);
  });
});

describe('derived values', () => {
  it('derives duration from the timestamps', () => {
    expect(feedDurationMs(breastFeed())).toBe(10 * MIN);
  });

  it('suggests the opposite of the last side used', () => {
    expect(suggestedSide([breastFeed({ lastSide: 'right' })])).toBe('left');
    expect(suggestedSide([breastFeed({ lastSide: 'left' })])).toBe('right');
  });

  it('suggests left with no history and skips external feeds', () => {
    expect(suggestedSide([])).toBe('left');
    expect(suggestedSide([externalFeed(), breastFeed({ lastSide: 'left' })])).toBe('right');
  });

  it('recalls the last external preferences', () => {
    expect(lastExternalPrefs([externalFeed({ milk: 'expressed', method: 'syringe' })]))
      .toEqual({ milk: 'expressed', method: 'syringe' });
  });

  it('defaults external preferences with no history', () => {
    expect(lastExternalPrefs([])).toEqual({ milk: 'formula', method: 'bottle' });
  });

  it('measures gaps from the previous end to the next start', () => {
    const feeds = [
      breastFeed({ id: 'c', startTime: T0 + 200 * MIN, endTime: T0 + 210 * MIN }),
      breastFeed({ id: 'b', startTime: T0 + 100 * MIN, endTime: T0 + 110 * MIN }),
      breastFeed({ id: 'a', startTime: T0, endTime: T0 + 10 * MIN }),
    ];
    expect(gapsBetweenFeeds(feeds)).toEqual([90 * MIN, 90 * MIN]);
  });

  it('returns no gaps for zero or one feed', () => {
    expect(gapsBetweenFeeds([])).toEqual([]);
    expect(gapsBetweenFeeds([breastFeed()])).toEqual([]);
  });

  it("sums today's feeds by start day", () => {
    const now = at(2026, 8, 3, 20, 0);
    const feeds = [
      externalFeed({ id: '2', startTime: at(2026, 8, 3, 14, 0), endTime: at(2026, 8, 3, 14, 10), takenMl: 60 }),
      breastFeed({ id: '1', startTime: at(2026, 8, 3, 9, 0), endTime: at(2026, 8, 3, 9, 12) }),
      breastFeed({ id: '0', startTime: at(2026, 8, 2, 23, 50), endTime: at(2026, 8, 3, 0, 5) }),
    ];
    expect(todayFeedStats(feeds, now)).toEqual({
      feedCount: 2, totalMl: 60, breastMs: 10 * MIN,
    });
  });

  it('builds daily totals oldest-first including empty days', () => {
    const now = at(2026, 8, 3, 20, 0);
    const feeds = [externalFeed({ startTime: at(2026, 8, 3, 9, 0), endTime: at(2026, 8, 3, 9, 10), takenMl: 60 })];
    const rows = dailyFeedTotals(feeds, now, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0].key).toBe('2026-08-01');
    expect(rows[2].key).toBe('2026-08-03');
    expect(rows[0].feedCount).toBe(0);
    expect(rows[2].totalMl).toBe(60);
  });

  it('sums side balance from a cutoff', () => {
    const feeds = [
      breastFeed({ id: 'new', startTime: at(2026, 8, 3, 9, 0), leftMs: 6 * MIN, rightMs: 4 * MIN }),
      breastFeed({ id: 'old', startTime: at(2026, 7, 1, 9, 0), leftMs: 99 * MIN, rightMs: 99 * MIN }),
    ];
    expect(sideBalance(feeds, at(2026, 8, 1))).toEqual({ leftMs: 6 * MIN, rightMs: 4 * MIN });
  });
});

describe('pause and resume', () => {
  it('commits the running side and freezes accrual when paused', () => {
    const a = createBreastSession('left', T0);
    const paused = pauseSession(a, T0 + 5 * MIN);
    expect(paused.leftMs).toBe(5 * MIN);
    expect(paused.pausedAt).toBe(T0 + 5 * MIN);
    expect(sideElapsedMs(paused, 'left', T0 + 30 * MIN)).toBe(5 * MIN);
  });

  it('resumes accrual from the moment of resume, not from the pause', () => {
    const paused = pauseSession(createBreastSession('left', T0), T0 + 5 * MIN);
    const resumed = resumeSession(paused, T0 + 25 * MIN);
    expect(resumed.pausedAt).toBeUndefined();
    expect(sideElapsedMs(resumed, 'left', T0 + 27 * MIN)).toBe(7 * MIN);
  });

  it('leaves the idle side alone while paused', () => {
    const a = switchSide(createBreastSession('left', T0), 'right', T0 + 4 * MIN);
    const paused = pauseSession(a, T0 + 6 * MIN);
    expect(sideElapsedMs(paused, 'left', T0 + 60 * MIN)).toBe(4 * MIN);
    expect(sideElapsedMs(paused, 'right', T0 + 60 * MIN)).toBe(2 * MIN);
  });

  it('is a no-op on an already paused session', () => {
    const paused = pauseSession(createBreastSession('left', T0), T0 + 5 * MIN);
    expect(pauseSession(paused, T0 + 9 * MIN)).toBe(paused);
  });

  it('is a no-op on a running session passed to resume', () => {
    const a = createBreastSession('left', T0);
    expect(resumeSession(a, T0 + 5 * MIN)).toBe(a);
  });

  it('is a no-op on external sessions and on null', () => {
    const ext = createExternalSession(T0);
    expect(pauseSession(ext, T0 + MIN)).toBe(ext);
    expect(resumeSession(ext, T0 + MIN)).toBe(ext);
    expect(pauseSession(null, T0)).toBe(null);
    expect(resumeSession(null, T0)).toBe(null);
  });

  it('survives a JSON round trip through localStorage', () => {
    const paused = pauseSession(createBreastSession('left', T0), T0 + 5 * MIN);
    const revived = JSON.parse(JSON.stringify(paused));
    expect(sideElapsedMs(revived, 'left', T0 + 60 * MIN)).toBe(5 * MIN);
  });

  it('finalizes a paused feed without counting the paused stretch', () => {
    const paused = pauseSession(createBreastSession('left', T0), T0 + 5 * MIN);
    const feed = finalizeBreastFeed(paused, T0 + 45 * MIN);
    expect(feed.leftMs).toBe(5 * MIN);
    expect(feed.rightMs).toBe(0);
    expect(feed.endTime).toBe(T0 + 45 * MIN);
  });
});
