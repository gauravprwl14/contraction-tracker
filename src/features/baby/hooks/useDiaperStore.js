import { useState, useEffect, useRef, useCallback } from 'react';
import { loadItems, saveItems } from '../../../utils/storage';
import { createDiaper, todayDiaperStats, msSinceLastPoop, daysSinceLastPoop } from '../diaperLogic';

export const DIAPERS_KEY = 'baby_tracker_diapers_v1';

const byNewest = (a, b) => b.time - a.time;

export function useDiaperStore(now) {
  const [diapers, setDiapers] = useState(() => loadItems(DIAPERS_KEY).sort(byNewest));
  const lastAddedRef = useRef(null);

  useEffect(() => { saveItems(DIAPERS_KEY, diapers); }, [diapers]);

  const logDiaper = useCallback(({ pee, poop }) => {
    const entry = createDiaper({ pee, poop }, Date.now());
    lastAddedRef.current = entry.id;
    setDiapers((prev) => [entry, ...prev].sort(byNewest));
    return entry;
  }, []);

  const updateDiaper = useCallback((id, fields) => {
    setDiapers((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)).sort(byNewest));
  }, []);

  const deleteDiaper = useCallback((id) => {
    setDiapers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const undoLast = useCallback(() => {
    const id = lastAddedRef.current;
    if (!id) return;
    lastAddedRef.current = null;
    setDiapers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const replaceAll = useCallback((next) => setDiapers([...next].sort(byNewest)), []);

  return {
    diapers,
    todayStats: todayDiaperStats(diapers, now),
    msSinceLastPoop: msSinceLastPoop(diapers, now),
    daysSinceLastPoop: daysSinceLastPoop(diapers, now),
    logDiaper, updateDiaper, deleteDiaper, undoLast, replaceAll,
  };
}
