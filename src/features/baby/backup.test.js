import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, feedsToCsv, diapersToCsv } from './backup';

const T0 = new Date(2026, 7, 3, 10, 0, 0, 0).getTime();

const feed = {
  id: 'f1', type: 'external', startTime: T0, endTime: T0 + 600000,
  milk: 'formula', method: 'bottle', offeredMl: 90, takenMl: 60, note: 'sleepy, "fussy"',
};

const diaper = { id: 'd1', time: T0, pee: true, poop: false, note: '' };

describe('backup', () => {
  it('round-trips a backup', () => {
    const text = JSON.stringify(buildBackup([feed], [diaper], [30, 60]));
    expect(parseBackup(text)).toEqual({
      feeds: [feed], diapers: [diaper], presets: [30, 60],
    });
  });

  it('includes a version', () => {
    expect(buildBackup([], [], []).version).toBe(1);
  });

  it('rejects unparseable text', () => {
    expect(() => parseBackup('{nope')).toThrow(/not valid/i);
  });

  it('rejects a file that is not a baby tracker backup', () => {
    expect(() => parseBackup(JSON.stringify({ hello: true }))).toThrow(/backup/i);
  });

  it('defaults missing presets to an empty array', () => {
    const text = JSON.stringify({ version: 1, feeds: [], diapers: [] });
    expect(parseBackup(text).presets).toEqual([]);
  });

  it('escapes quotes in CSV notes', () => {
    const csv = feedsToCsv([feed]);
    expect(csv.split('\n')[1]).toContain('"sleepy, ""fussy"""');
  });

  it('writes a CSV header row for feeds and diapers', () => {
    expect(feedsToCsv([]).split('\n')[0]).toContain('Type');
    expect(diapersToCsv([]).split('\n')[0]).toContain('Pee');
  });
});
