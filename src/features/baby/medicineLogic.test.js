import { describe, it, expect } from 'vitest';
import {
  createDose, recentMedicineNames, lastDoseOf, msSinceLastDose, todayDoseSummary,
} from './medicineLogic';

const at = (y, m, d, h = 0) => new Date(y, m - 1, d, h, 0, 0, 0).getTime();

const D = (time, name, amount = 2.5, unit = 'ml') => ({
  id: `d${time}${name}`, time, name, amount, unit, note: '',
});

describe('medicineLogic', () => {
  it('creates a dose', () => {
    expect(createDose({ name: 'Paracetamol', amount: 2.5, unit: 'ml' }, at(2026, 8, 3)))
      .toMatchObject({ name: 'Paracetamol', amount: 2.5, unit: 'ml', time: at(2026, 8, 3) });
  });

  it('requires a medicine name', () => {
    expect(createDose({ amount: 2.5 }, at(2026, 8, 3))).toBe(null);
    expect(createDose({ name: '   ' }, at(2026, 8, 3))).toBe(null);
  });

  it('trims the name and defaults an unknown unit to ml', () => {
    const d = createDose({ name: '  Vitamin D  ', amount: 1, unit: 'spoons' }, at(2026, 8, 3));
    expect(d.name).toBe('Vitamin D');
    expect(d.unit).toBe('ml');
  });

  it('stores a missing or invalid amount as null rather than zero', () => {
    expect(createDose({ name: 'X' }, at(2026, 8, 3)).amount).toBe(null);
    expect(createDose({ name: 'X', amount: 'abc' }, at(2026, 8, 3)).amount).toBe(null);
  });

  it('lists distinct recent names, most recent first', () => {
    const doses = [
      D(at(2026, 8, 3), 'Paracetamol'), D(at(2026, 8, 2), 'Vitamin D'),
      D(at(2026, 8, 1), 'Paracetamol'),
    ];
    expect(recentMedicineNames(doses)).toEqual(['Paracetamol', 'Vitamin D']);
  });

  it('treats names case-insensitively when de-duplicating', () => {
    const doses = [D(at(2026, 8, 3), 'paracetamol'), D(at(2026, 8, 1), 'Paracetamol')];
    expect(recentMedicineNames(doses)).toEqual(['paracetamol']);
  });

  it('finds the last dose of a named medicine, ignoring others', () => {
    const doses = [D(at(2026, 8, 3), 'Vitamin D'), D(at(2026, 8, 2), 'Paracetamol')];
    expect(lastDoseOf(doses, 'paracetamol').time).toBe(at(2026, 8, 2));
    expect(lastDoseOf(doses, 'Ibuprofen')).toBe(null);
    expect(lastDoseOf(doses, '')).toBe(null);
  });

  it('measures time since the last dose of a medicine', () => {
    const doses = [D(at(2026, 8, 3, 6), 'Paracetamol')];
    expect(msSinceLastDose(doses, 'Paracetamol', at(2026, 8, 3, 10))).toBe(4 * 3600000);
    expect(msSinceLastDose(doses, 'Ibuprofen', at(2026, 8, 3, 10))).toBe(null);
  });

  it("summarises today's doses grouped by medicine", () => {
    const doses = [
      D(at(2026, 8, 3, 6), 'Paracetamol'), D(at(2026, 8, 3, 14), 'Paracetamol'),
      D(at(2026, 8, 3, 9), 'Vitamin D', 1),
      D(at(2026, 8, 2, 9), 'Paracetamol'),
    ];
    const summary = todayDoseSummary(doses, at(2026, 8, 3, 20));
    expect(summary[0]).toMatchObject({ name: 'Paracetamol', count: 2, total: 5, unit: 'ml' });
    expect(summary[1]).toMatchObject({ name: 'Vitamin D', count: 1, total: 1 });
  });

  it('does not total across mismatched units', () => {
    const doses = [
      D(at(2026, 8, 3, 6), 'Iron', 2, 'ml'),
      D(at(2026, 8, 3, 14), 'Iron', 5, 'drops'),
    ];
    const [row] = todayDoseSummary(doses, at(2026, 8, 3, 20));
    expect(row.count).toBe(2);
    expect(row.total).toBe(2);
  });

  it('excludes doses from other days', () => {
    expect(todayDoseSummary([D(at(2026, 8, 2), 'X')], at(2026, 8, 3, 12))).toEqual([]);
  });
});
