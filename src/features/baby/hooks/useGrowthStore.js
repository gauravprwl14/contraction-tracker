import { useState, useEffect, useRef, useCallback } from 'react';
import { loadItems, saveItems } from '../../../utils/storage';
import { createMeasurement, latestWeightKg } from '../growthLogic';

export const GROWTH_KEY = 'baby_tracker_growth_v1';

const byNewest = (a, b) => b.time - a.time;

export function useGrowthStore(now) {
  const [measurements, setMeasurements] = useState(() => loadItems(GROWTH_KEY).sort(byNewest));
  const lastAddedRef = useRef(null);

  useEffect(() => { saveItems(GROWTH_KEY, measurements); }, [measurements]);

  const logMeasurement = useCallback((fields) => {
    const entry = createMeasurement(fields, Date.now());
    if (!entry) return null;
    lastAddedRef.current = entry.id;
    setMeasurements((prev) => [entry, ...prev].sort(byNewest));
    return entry;
  }, []);

  const updateMeasurement = useCallback((id, fields) => {
    setMeasurements((prev) => prev.map((m) => (m.id === id ? { ...m, ...fields } : m)).sort(byNewest));
  }, []);

  const deleteMeasurement = useCallback((id) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const undoLast = useCallback(() => {
    const id = lastAddedRef.current;
    if (!id) return;
    lastAddedRef.current = null;
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const addMeasurement = useCallback((entry) => {
    if (!entry) return;
    lastAddedRef.current = entry.id;
    setMeasurements((prev) => [entry, ...prev].sort(byNewest));
  }, []);

  const replaceAll = useCallback((next) => setMeasurements([...next].sort(byNewest)), []);

  return {
    measurements,
    latestWeightKg: latestWeightKg(measurements, now),
    logMeasurement, addMeasurement, updateMeasurement, deleteMeasurement, undoLast, replaceAll,
  };
}
