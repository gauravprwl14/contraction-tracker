import { useState, useEffect, useRef, useCallback } from 'react';
import { loadItems, saveItems, loadValue, saveValue } from '../../../utils/storage';
import { startOfDay, addDays } from '../../../utils/dates';
import {
  createBreastSession, createExternalSession, switchSide, sideElapsedMs,
  finalizeBreastFeed, finalizeExternalFeed, isStale, suggestedSide,
  lastExternalPrefs, todayFeedStats,
} from '../feedLogic';

export const FEEDS_KEY = 'baby_tracker_feeds_v1';
export const ACTIVE_KEY = 'baby_tracker_active_v1';
export const PREFS_KEY = 'baby_tracker_prefs_v1';

export const DEFAULT_PRESETS = [30, 60, 90, 120];

// Exported for testing without React.
export function restoreActive(now) {
  const stored = loadValue(ACTIVE_KEY, null);
  if (!stored || typeof stored.startTime !== 'number') {
    return { active: null, stale: false };
  }
  return { active: stored, stale: isStale(stored, now) };
}

const byNewest = (a, b) => b.startTime - a.startTime;

export function useFeedStore() {
  const [feeds, setFeeds] = useState(() => loadItems(FEEDS_KEY).sort(byNewest));
  const [{ active, stale: staleActive }, setSession] = useState(() => restoreActive(Date.now()));
  const [presets, setPresets] = useState(
    () => loadValue(PREFS_KEY, { quantityPresets: DEFAULT_PRESETS }).quantityPresets ?? DEFAULT_PRESETS
  );
  const [now, setNow] = useState(() => Date.now());
  const lastAddedRef = useRef(null);

  useEffect(() => { saveItems(FEEDS_KEY, feeds); }, [feeds]);
  useEffect(() => { saveValue(PREFS_KEY, { quantityPresets: presets }); }, [presets]);

  useEffect(() => {
    if (active) saveValue(ACTIVE_KEY, active);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [active]);

  // One clock for the whole store. Everything time-dependent derives from `now`.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const setActive = useCallback((next, stale = false) => setSession({ active: next, stale }), []);

  const addFeed = useCallback((feed) => {
    if (!feed) return;
    lastAddedRef.current = feed.id;
    setFeeds((prev) => [feed, ...prev].sort(byNewest));
  }, []);

  const startBreast = useCallback((side) => {
    setActive(createBreastSession(side, Date.now()));
  }, [setActive]);

  const switchTo = useCallback((side) => {
    setSession(({ active: a }) => ({
      active: a ? switchSide(a, side, Date.now()) : a,
      stale: false,
    }));
  }, []);

  const stopBreast = useCallback(() => {
    if (!active) return null;
    const feed = finalizeBreastFeed(active, Date.now());
    setActive(null);
    addFeed(feed);
    return feed;
  }, [active, addFeed, setActive]);

  const startExternal = useCallback(() => {
    setActive(createExternalSession(Date.now(), lastExternalPrefs(feeds)));
  }, [feeds, setActive]);

  const updateDraft = useCallback((fields) => {
    setSession(({ active: a }) => ({
      active: a ? { ...a, draft: { ...a.draft, ...fields } } : a,
      stale: false,
    }));
  }, []);

  const saveExternal = useCallback(() => {
    if (!active) return null;
    const feed = finalizeExternalFeed(active, Date.now());
    setActive(null);
    addFeed(feed);
    return feed;
  }, [active, addFeed, setActive]);

  const discardActive = useCallback(() => setActive(null), [setActive]);

  const updateFeed = useCallback((id, fields) => {
    setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, ...fields } : f)).sort(byNewest));
  }, []);

  const deleteFeed = useCallback((id) => {
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const undoLast = useCallback(() => {
    const id = lastAddedRef.current;
    if (!id) return;
    lastAddedRef.current = null;
    setFeeds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const replaceAll = useCallback((next) => setFeeds([...next].sort(byNewest)), []);

  const lastFeed = feeds[0] ?? null;

  return {
    feeds,
    active,
    staleActive,
    elapsedMs: active ? Math.max(0, now - active.startTime) : 0,
    leftElapsedMs: sideElapsedMs(active, 'left', now),
    rightElapsedMs: sideElapsedMs(active, 'right', now),
    msSinceLastFeed: lastFeed && !active ? Math.max(0, now - lastFeed.endTime) : null,
    lastFeed,
    suggestion: suggestedSide(feeds),
    prefs: lastExternalPrefs(feeds),
    quantityPresets: presets,
    todayStats: todayFeedStats(feeds, now),
    startBreast, switchTo, stopBreast,
    startExternal, updateDraft, saveExternal, discardActive,
    addFeed, updateFeed, deleteFeed, undoLast,
    setQuantityPresets: setPresets,
    replaceAll,
    weekStart: addDays(startOfDay(now), -6),
    now,
  };
}
