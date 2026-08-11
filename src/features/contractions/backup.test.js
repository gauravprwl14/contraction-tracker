import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, contractionsToCsv } from './backup';

const T0 = new Date(2026, 7, 3, 10, 0, 0, 0).getTime();

const contraction = {
  id: 'c1',
  startTime: T0,
  endTime: T0 + 60000,
  duration: 60,
  intensity: 3,
  note: 'strong, "sharp"',
};

describe('contractions backup', () => {
  it('round-trips a backup', () => {
    const text = JSON.stringify(buildBackup([contraction]));
    expect(parseBackup(text).contractions).toEqual([contraction]);
  });

  it('includes a version and app tag', () => {
    const backup = buildBackup([]);
    expect(backup.version).toBe(1);
    expect(backup.app).toBe('contractions');
  });

  it('rejects unparseable text', () => {
    expect(() => parseBackup('{nope')).toThrow(/not valid/i);
  });

  it('rejects a file that is not a contraction backup', () => {
    expect(() => parseBackup(JSON.stringify({ feeds: [], diapers: [] }))).toThrow(/backup/i);
  });

  it('accepts the legacy bare-array shape', () => {
    expect(parseBackup(JSON.stringify([contraction])).contractions).toEqual([contraction]);
  });

  it('skips records without usable timestamps', () => {
    const result = parseBackup(JSON.stringify({ contractions: [contraction, { id: 'bad' }] }));
    expect(result.contractions).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it('fills in a missing duration from the timestamps', () => {
    const text = JSON.stringify({ contractions: [{ id: 'c2', startTime: T0, endTime: T0 + 45000 }] });
    expect(parseBackup(text).contractions[0].duration).toBe(45);
  });

  it('defaults a missing intensity and note', () => {
    const text = JSON.stringify({ contractions: [{ id: 'c2', startTime: T0, endTime: T0 }] });
    expect(parseBackup(text).contractions[0]).toMatchObject({ intensity: null, note: '' });
  });

  it('escapes quotes in CSV notes', () => {
    const csv = contractionsToCsv([contraction], [120]);
    expect(csv.split('\n')[1]).toContain('"strong, ""sharp"""');
  });

  it('writes a CSV header row', () => {
    expect(contractionsToCsv([]).split('\n')[0]).toContain('Duration (s)');
  });

  it('numbers rows oldest-first with newest-first input', () => {
    const older = { ...contraction, id: 'c0', startTime: T0 - 600000, endTime: T0 - 540000 };
    const csv = contractionsToCsv([contraction, older], []);
    expect(csv.split('\n')[1].startsWith('2,')).toBe(true);
    expect(csv.split('\n')[2].startsWith('1,')).toBe(true);
  });
});
