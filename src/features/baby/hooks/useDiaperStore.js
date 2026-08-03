import { useState, useEffect, useRef, useCallback } from 'react';
import { loadItems, saveItems } from '../../../utils/storage';
import { createDiaper, todayDiaperStats, msSinceLastPoop } from '../diaperLogic';

export const DIAPERS_KEY = 'baby_tracker_diapers_v1';

const byNewest = (a, b) => b.time - a.time;

export function useDiaperStore() {
  const [diapers, setDiapers] = useState(() => loadItems(DIAPERS_KEY).sort(byNewest));
  const [now, setNow] = useState(() => Date.now());
  const lastAddedRef = useRef(null);

  useEffect(() => { saveItems(DIAPERS_KEY, diapers); }, [diapers]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
    logDiaper, updateDiaper, deleteDiaper, undoLast, replaceAll,
  };
}
