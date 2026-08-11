import { startOfDay } from '../../utils/dates';

export const MEDICINE_UNITS = ['ml', 'mg', 'drops'];

export function createDose({ name, amount, unit, note }, now) {
  const clean = (name ?? '').trim();
  if (!clean) return null;
  const n = Number(amount);
  return {
    id: crypto.randomUUID(),
    time: now,
    name: clean,
    amount: Number.isFinite(n) && n > 0 ? n : null,
    unit: MEDICINE_UNITS.includes(unit) ? unit : 'ml',
    note: note ?? '',
  };
}

// Distinct medicine names, most recently used first, so a repeat dose is one
// tap. Mirrors how feedLogic surfaces the last bottle's settings.
export function recentMedicineNames(doses, limit = 6) {
  const seen = new Map();
  for (const d of [...doses].sort((a, b) => b.time - a.time)) {
    const key = d.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, d.name);
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}

export function lastDoseOf(doses, name) {
  const key = (name ?? '').trim().toLowerCase();
  if (!key) return null;
  let best = null;
  for (const d of doses) {
    if (d.name.toLowerCase() !== key) continue;
    if (best === null || d.time > best.time) best = d;
  }
  return best;
}

export function msSinceLastDose(doses, name, now) {
  const last = lastDoseOf(doses, name);
  return last ? Math.max(0, now - last.time) : null;
}

// Doses given today, grouped by medicine — what a doctor asks for directly
// ("how much paracetamol has she had today?").
export function todayDoseSummary(doses, now) {
  const today = startOfDay(now);
  const byName = new Map();
  for (const d of doses) {
    if (startOfDay(d.time) !== today) continue;
    const key = d.name.toLowerCase();
    const row = byName.get(key) ?? { name: d.name, count: 0, total: 0, unit: d.unit };
    row.count += 1;
    if (d.amount != null && d.unit === row.unit) row.total += d.amount;
    byName.set(key, row);
  }
  return [...byName.values()].sort((a, b) => b.count - a.count);
}
