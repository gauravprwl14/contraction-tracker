import { formatDate, formatTime } from '../../utils/format';
import { toCsv } from '../../utils/csv';

export function buildBackup(contractions) {
  return { version: 1, app: 'contractions', exportedAt: Date.now(), contractions };
}

// A contraction drives every stat on the screen, so a record without usable
// timestamps is dropped rather than imported as a hole in the charts.
const isValid = (c) =>
  c != null &&
  typeof c.startTime === 'number' &&
  typeof c.endTime === 'number' &&
  Number.isFinite(c.startTime) &&
  Number.isFinite(c.endTime);

const normalize = (c) => ({
  id: typeof c.id === 'string' && c.id ? c.id : crypto.randomUUID(),
  startTime: c.startTime,
  endTime: c.endTime,
  duration: typeof c.duration === 'number'
    ? c.duration
    : Math.round((c.endTime - c.startTime) / 1000),
  intensity: typeof c.intensity === 'number' ? c.intensity : null,
  note: typeof c.note === 'string' ? c.note : '',
});

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  // A bare array is the legacy on-disk shape, so accept it as an import too.
  const raw = Array.isArray(parsed) ? parsed : parsed?.contractions;
  if (!Array.isArray(raw)) {
    throw new Error('That file is not a contraction tracker backup.');
  }
  const contractions = raw.filter(isValid).map(normalize);
  return { contractions, skipped: raw.length - contractions.length };
}

export function contractionsToCsv(contractions, intervals = []) {
  const header = [
    '#', 'Date', 'Start Time', 'End Time',
    'Duration (s)', 'Gap Before (s)', 'Intensity', 'Note',
  ];
  const rows = contractions.map((c, i) => [
    contractions.length - i,
    formatDate(c.startTime),
    formatTime(c.startTime),
    formatTime(c.endTime),
    c.duration,
    intervals[i] ?? '',
    c.intensity ?? '',
    c.note ?? '',
  ]);
  return toCsv(header, rows);
}
