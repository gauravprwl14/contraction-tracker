import { describe, it, expect } from 'vitest';
import {
  buildBackup, parseBackup, feedsToCsv, diapersToCsv, growthToCsv, medicineToCsv,
} from './backup';

const T0 = new Date(2026, 7, 3, 10, 0, 0, 0).getTime();

const feed = {
  id: 'f1', type: 'external', startTime: T0, endTime: T0 + 600000,
  milk: 'formula', method: 'bottle', offeredMl: 90, takenMl: 60, note: 'sleepy, "fussy"',
};

const diaper = { id: 'd1', time: T0, pee: true, poop: false, note: '' };

describe('backup', () => {
  const measurement = { id: 'g1', time: T0, weightKg: 4.2, heightCm: 55, note: '' };
  const dose = { id: 'x1', time: T0, name: 'Paracetamol', amount: 2.5, unit: 'ml', note: '' };

  it('round-trips a backup', () => {
    const text = JSON.stringify(
      buildBackup([feed], [diaper], [30, 60], [measurement], [dose])
    );
    expect(parseBackup(text)).toEqual({
      feeds: [feed], diapers: [diaper], presets: [30, 60],
      growth: [measurement], medicine: [dose],
    });
  });

  it('includes a version', () => {
    expect(buildBackup([], [], []).version).toBe(2);
  });

  it('imports a v1 backup, defaulting growth and medicine to empty', () => {
    const v1 = JSON.stringify({
      version: 1, exportedAt: T0, feeds: [feed], diapers: [diaper], presets: [30],
    });
    const parsed = parseBackup(v1);
    expect(parsed.feeds).toEqual([feed]);
    expect(parsed.growth).toEqual([]);
    expect(parsed.medicine).toEqual([]);
  });

  it('defaults growth and medicine to empty when they are the wrong shape', () => {
    const text = JSON.stringify({ feeds: [], diapers: [], growth: 'nope', medicine: 7 });
    expect(parseBackup(text).growth).toEqual([]);
    expect(parseBackup(text).medicine).toEqual([]);
  });

  it('writes CSV headers for growth and medicine', () => {
    expect(growthToCsv([]).split('\n')[0]).toContain('Weight (kg)');
    expect(medicineToCsv([]).split('\n')[0]).toContain('Medicine');
  });

  it('leaves unmeasured growth fields blank in CSV', () => {
    const row = growthToCsv([{ time: T0, weightKg: 4.2, note: '' }]).split('\n')[1];
    expect(row).toContain('4.2');
    expect(row).toMatch(/4\.2,,,/);
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
