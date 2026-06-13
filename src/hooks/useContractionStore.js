import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'contraction_tracker_data';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveToStorage(contractions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contractions));
}

// trend: compare last 3 vs previous 3 values. Returns 'up' | 'down' | 'stable' | null
function calcTrend(values) {
  if (values.length < 4) return null;
  const recent = values.slice(0, 3);
  const older = values.slice(3, 6);
  if (older.length === 0) return null;
  const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
  const avgOlder = older.reduce((s, v) => s + v, 0) / older.length;
  const diff = avgRecent - avgOlder;
  if (Math.abs(diff) < avgOlder * 0.05) return 'stable'; // <5% change
  return diff > 0 ? 'up' : 'down';
}

function detectLaborStage(avgInterval, avgDuration, count) {
  if (count < 3 || avgInterval == null) return 'tracking';
  if (avgInterval < 180 && avgDuration >= 60) return 'transition'; // <3 min apart, ≥1 min each
  if (avgInterval <= 300 && avgDuration >= 45) return 'active';    // ≤5 min apart, ≥45s each
  return 'early';
}

export function useContractionStore() {
  const [contractions, setContractions] = useState(() => loadFromStorage());
  const [activeStart, setActiveStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [timeSinceLast, setTimeSinceLast] = useState(null);
  // Pending stop: timer stopped, waiting for intensity/note before committing
  const [pendingStop, setPendingStop] = useState(null); // { startTime, endTime, duration }
  const sessionStartRef = useRef(null);

  useEffect(() => {
    saveToStorage(contractions);
  }, [contractions]);

  // Track session start (first contraction this session)
  useEffect(() => {
    if (contractions.length > 0 && sessionStartRef.current === null) {
      const sorted = [...contractions].sort((a, b) => a.startTime - b.startTime);
      sessionStartRef.current = sorted[0].startTime;
    }
    if (contractions.length === 0) sessionStartRef.current = null;
  }, [contractions]);

  useEffect(() => {
    if (!activeStart) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - activeStart) / 1000)), 500);
    return () => clearInterval(id);
  }, [activeStart]);

  useEffect(() => {
    if (activeStart || contractions.length === 0) { setTimeSinceLast(null); return; }
    const update = () => setTimeSinceLast(Math.round((Date.now() - contractions[0].endTime) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeStart, contractions]);

  const startContraction = () => {
    if (sessionStartRef.current === null) sessionStartRef.current = Date.now();
    setActiveStart(Date.now());
    setPendingStop(null);
  };

  // Stop freezes the timer and opens the intensity picker
  const requestStop = () => {
    if (!activeStart) return;
    const endTime = Date.now();
    const duration = Math.round((endTime - activeStart) / 1000);
    setActiveStart(null);
    setElapsed(duration); // freeze display at final duration
    setPendingStop({ startTime: activeStart, endTime, duration });
  };

  // Commit the stopped contraction with optional intensity (1-5) and note
  const confirmStop = ({ intensity = null, note = '' } = {}) => {
    if (!pendingStop) return;
    const newContraction = {
      id: crypto.randomUUID(),
      startTime: pendingStop.startTime,
      endTime: pendingStop.endTime,
      duration: pendingStop.duration,
      intensity,
      note: note.trim(),
    };
    setContractions((prev) => [newContraction, ...prev]);
    setPendingStop(null);
    setElapsed(0);
  };

  const cancelStop = () => {
    // Re-start from the original startTime so no time is lost
    if (!pendingStop) return;
    setActiveStart(pendingStop.startTime);
    setPendingStop(null);
  };

  const updateContraction = (id, fields) => {
    setContractions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...fields } : c))
    );
  };

  const deleteContraction = (id) => {
    setContractions((prev) => prev.filter((c) => c.id !== id));
  };

  const reset = () => {
    setActiveStart(null);
    setElapsed(0);
    setPendingStop(null);
    setContractions([]);
    sessionStartRef.current = null;
  };

  const isActive = activeStart !== null;
  const isPendingStop = pendingStop !== null;

  // --- Derived stats ---
  const durations = contractions.map((c) => c.duration); // newest first

  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
      : null;

  const longestDuration = durations.length > 0 ? Math.max(...durations) : null;
  const shortestDuration = durations.length > 0 ? Math.min(...durations) : null;

  const intervals = contractions.slice(0, -1).map((c, i) => {
    const prev = contractions[i + 1];
    return Math.round((c.startTime - prev.endTime) / 1000);
  });

  const avgInterval =
    intervals.length > 0
      ? Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length)
      : null;

  const durationTrend = calcTrend(durations);
  const intervalTrend = calcTrend(intervals); // 'down' = getting closer = progressing

  const laborStage = detectLaborStage(avgInterval, avgDuration, contractions.length);

  // Contractions per hour (based on session window)
  const perHour = (() => {
    if (contractions.length < 2) return null;
    const oldest = contractions[contractions.length - 1].startTime;
    const newest = contractions[0].endTime;
    const hours = (newest - oldest) / 3600000;
    if (hours < 0.1) return null;
    return Math.round((contractions.length / hours) * 10) / 10;
  })();

  const sessionDuration = (() => {
    if (contractions.length === 0 && !isActive) return null;
    const start = sessionStartRef.current || (activeStart ?? Date.now());
    return Math.round((Date.now() - start) / 1000);
  })();

  const is511 =
    avgInterval != null && avgDuration != null &&
    avgInterval <= 300 && avgDuration >= 45 && contractions.length >= 6;

  return {
    contractions,
    isActive,
    isPendingStop,
    pendingStop,
    elapsed,
    avgDuration,
    avgInterval,
    longestDuration,
    shortestDuration,
    intervals,
    timeSinceLast,
    is511,
    durationTrend,
    intervalTrend,
    laborStage,
    perHour,
    sessionDuration,
    startContraction,
    requestStop,
    confirmStop,
    cancelStop,
    updateContraction,
    deleteContraction,
    reset,
  };
}
