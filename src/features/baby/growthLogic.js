import { startOfDay, endOfDay } from '../../utils/dates';

export const GROWTH_METRICS = [
  { id: 'weightKg', label: 'Weight', unit: 'kg', decimals: 3 },
  { id: 'heightCm', label: 'Height', unit: 'cm', decimals: 1 },
  { id: 'headCm', label: 'Head', unit: 'cm', decimals: 1 },
];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

// A weigh-in without a tape measure is still worth recording, so every field is
// optional — but an entry with nothing measured is not, and returns null.
export function createMeasurement({ weightKg, heightCm, headCm, note }, now) {
  const fields = {
    weightKg: num(weightKg),
    heightCm: num(heightCm),
    headCm: num(headCm),
  };
  if (fields.weightKg === undefined && fields.heightCm === undefined && fields.headCm === undefined) {
    return null;
  }
  return { id: crypto.randomUUID(), time: now, ...fields, note: note ?? '' };
}

// Measurements are stored newest-first, but callers should not have to rely on
// that, so every reader here scans rather than indexing.
function latestAtOrBefore(measurements, metric, cutoff) {
  let best = null;
  for (const m of measurements) {
    if (m[metric] === undefined || m[metric] === null) continue;
    if (m.time > cutoff) continue;
    if (best === null || m.time > best.time) best = m;
  }
  return best;
}

export function latestMeasurement(measurements, metric, now = Infinity) {
  return latestAtOrBefore(measurements, metric, now);
}

export function latestWeightKg(measurements, now = Infinity) {
  return latestAtOrBefore(measurements, 'weightKg', now)?.weightKg ?? null;
}

// The weight in effect for a given day is the most recent one measured by the
// end of that day — never a later weigh-in, which would back-date knowledge the
// parent did not have.
export function weightOnDay(measurements, dayStart) {
  return latestAtOrBefore(measurements, 'weightKg', endOfDay(dayStart))?.weightKg ?? null;
}

export function growthSeries(measurements, metric) {
  return measurements
    .filter((m) => m[metric] !== undefined && m[metric] !== null)
    .map((m) => ({ time: m.time, value: m[metric], id: m.id }))
    .sort((a, b) => a.time - b.time);
}

// Change between the first and most recent reading of a metric. Returned with
// the endpoints so the UI can state what the change is measured against rather
// than presenting a bare delta.
export function growthChange(measurements, metric) {
  const series = growthSeries(measurements, metric);
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  return {
    delta: last.value - first.value,
    from: first,
    to: last,
    days: Math.round((startOfDay(last.time) - startOfDay(first.time)) / 86400000),
  };
}

// Intake per kg per day — the headline number a paediatrician looks for. Null
// on days with no weight on record rather than guessed, so the chart can show
// the gap honestly.
export function dailyIntakePerKg(feedRows, measurements) {
  return feedRows.map((r) => {
    const weightKg = weightOnDay(measurements, r.dayStart);
    return {
      key: r.key,
      dayStart: r.dayStart,
      totalMl: r.totalMl,
      weightKg,
      mlPerKg: weightKg ? Math.round((r.totalMl / weightKg) * 10) / 10 : null,
    };
  });
}
