import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorageMock } from '../../../test/localStorageMock';
import { saveValue } from '../../../utils/storage';
import { restoreActive, ACTIVE_KEY } from './useFeedStore';
import { createBreastSession, sideElapsedMs, STALE_MS } from '../feedLogic';

const MIN = 60000;
const T0 = new Date(2026, 7, 3, 10, 0, 0, 0).getTime();

describe('restoreActive', () => {
  beforeEach(() => installLocalStorageMock());

  it('returns nothing when there is no stored session', () => {
    expect(restoreActive(T0)).toEqual({ active: null, stale: false });
  });

  it('restores a session and computes elapsed time from timestamps', () => {
    saveValue(ACTIVE_KEY, createBreastSession('left', T0));
    const { active, stale } = restoreActive(T0 + 20 * MIN);
    expect(stale).toBe(false);
    // 20 minutes passed while the app was closed — no ticks were counted
    expect(sideElapsedMs(active, 'left', T0 + 20 * MIN)).toBe(20 * MIN);
  });

  it('flags a session older than the stale window without discarding it', () => {
    saveValue(ACTIVE_KEY, createBreastSession('left', T0));
    const { active, stale } = restoreActive(T0 + STALE_MS + MIN);
    expect(stale).toBe(true);
    expect(active).not.toBeNull();
    expect(localStorage.getItem(ACTIVE_KEY)).not.toBeNull();
  });

  it('ignores a corrupt stored session', () => {
    localStorage.setItem(ACTIVE_KEY, '{bad');
    expect(restoreActive(T0)).toEqual({ active: null, stale: false });
  });

  it('ignores a stored session with no startTime', () => {
    saveValue(ACTIVE_KEY, { type: 'breast' });
    expect(restoreActive(T0)).toEqual({ active: null, stale: false });
  });
});
