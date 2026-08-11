import { useState, useEffect, useRef, useCallback } from 'react';
import { loadItems, saveItems } from '../../../utils/storage';
import { createDose, recentMedicineNames, todayDoseSummary } from '../medicineLogic';

export const MEDICINE_KEY = 'baby_tracker_medicine_v1';

const byNewest = (a, b) => b.time - a.time;

export function useMedicineStore(now) {
  const [doses, setDoses] = useState(() => loadItems(MEDICINE_KEY).sort(byNewest));
  const lastAddedRef = useRef(null);

  useEffect(() => { saveItems(MEDICINE_KEY, doses); }, [doses]);

  const logDose = useCallback((fields) => {
    const entry = createDose(fields, Date.now());
    if (!entry) return null;
    lastAddedRef.current = entry.id;
    setDoses((prev) => [entry, ...prev].sort(byNewest));
    return entry;
  }, []);

  const updateDose = useCallback((id, fields) => {
    setDoses((prev) => prev.map((d) => (d.id === id ? { ...d, ...fields } : d)).sort(byNewest));
  }, []);

  const deleteDose = useCallback((id) => {
    setDoses((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const undoLast = useCallback(() => {
    const id = lastAddedRef.current;
    if (!id) return;
    lastAddedRef.current = null;
    setDoses((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const addDose = useCallback((entry) => {
    if (!entry) return;
    lastAddedRef.current = entry.id;
    setDoses((prev) => [entry, ...prev].sort(byNewest));
  }, []);

  const replaceAll = useCallback((next) => setDoses([...next].sort(byNewest)), []);

  return {
    doses,
    recentNames: recentMedicineNames(doses),
    todaySummary: todayDoseSummary(doses, now),
    logDose, addDose, updateDose, deleteDose, undoLast, replaceAll,
  };
}
