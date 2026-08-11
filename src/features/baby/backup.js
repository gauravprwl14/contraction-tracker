import { formatDate, formatTime } from '../../utils/format';
import { toCsv, download } from '../../utils/csv';
import { feedDurationMs } from './feedLogic';

export function buildBackup(feeds, diapers, presets) {
  return { version: 1, exportedAt: Date.now(), feeds, diapers, presets };
}

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || !Array.isArray(parsed.feeds) || !Array.isArray(parsed.diapers)) {
    throw new Error('That file is not a baby tracker backup.');
  }
  return {
    feeds: parsed.feeds,
    diapers: parsed.diapers,
    presets: Array.isArray(parsed.presets) ? parsed.presets : [],
  };
}

export function feedsToCsv(feeds) {
  const header = [
    'Date', 'Start', 'End', 'Duration (min)', 'Type',
    'Left (min)', 'Right (min)', 'Milk', 'Method', 'Offered (ml)', 'Taken (ml)', 'Note',
  ];
  const rows = feeds.map((f) => [
    formatDate(f.startTime),
    formatTime(f.startTime),
    formatTime(f.endTime),
    Math.round(feedDurationMs(f) / 60000),
    f.type,
    f.type === 'breast' ? Math.round(f.leftMs / 60000) : '',
    f.type === 'breast' ? Math.round(f.rightMs / 60000) : '',
    f.type === 'external' ? f.milk : '',
    f.type === 'external' ? f.method : '',
    f.type === 'external' ? f.offeredMl : '',
    f.type === 'external' ? f.takenMl : '',
    f.note ?? '',
  ]);
  return toCsv(header, rows);
}

export function diapersToCsv(diapers) {
  const header = ['Date', 'Time', 'Pee', 'Poop', 'Colour', 'Consistency', 'Amount', 'Note'];
  const rows = diapers.map((d) => [
    formatDate(d.time), formatTime(d.time),
    d.pee ? 'yes' : 'no', d.poop ? 'yes' : 'no',
    d.color ?? '', d.consistency ?? '', d.amount ?? '', d.note ?? '',
  ]);
  return toCsv(header, rows);
}

export { download };
