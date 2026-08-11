import { useState } from 'react';
import { GROWTH_METRICS, growthSeries, growthChange } from '../../growthLogic';
import { formatDate } from '../../../../utils/format';

const W = 1000;
const H = 280;
const PAD_L = 80;
const PAD = 34;

export function GrowthChart({ measurements }) {
  const [metric, setMetric] = useState('weightKg');
  const meta = GROWTH_METRICS.find((m) => m.id === metric);

  const series = growthSeries(measurements, metric);
  const change = growthChange(measurements, metric);

  const values = series.map((p) => p.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  // A flat series would collapse to a zero-height axis, so pad it out.
  const span = hi - lo || Math.max(hi * 0.1, 1);
  const yMin = lo - span * 0.15;
  const yMax = hi + span * 0.15;

  const t0 = series[0]?.time ?? 0;
  const t1 = series[series.length - 1]?.time ?? 1;
  const tSpan = t1 - t0 || 1;

  const x = (time) => PAD_L + ((time - t0) / tSpan) * (W - PAD_L - PAD);
  const y = (v) => H - PAD - ((v - yMin) / (yMax - yMin)) * (H - PAD * 2);

  const fmt = (v) => Number(v.toFixed(meta.decimals)).toString();

  return (
    <div className="chart">
      <div className="chart__head">
        <h3 className="chart__title">Growth</h3>
        <div className="chip-row">
          {GROWTH_METRICS.map((m) => (
            <button
              key={m.id}
              className={`chip chip--sm ${metric === m.id ? 'chip--active' : ''}`}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {series.length === 0 ? (
        <p className="chart__empty">No {meta.label.toLowerCase()} measurements yet.</p>
      ) : (
        <>
          <p className="chart__caption">
            {change
              ? `${fmt(change.to.value)} ${meta.unit} — ${change.delta >= 0 ? '+' : ''}${fmt(change.delta)} ${meta.unit} over ${change.days} days, from ${fmt(change.from.value)} ${meta.unit} on ${formatDate(change.from.time)}.`
              : `${fmt(series[0].value)} ${meta.unit} on ${formatDate(series[0].time)} — one reading so far.`}
          </p>

          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${meta.label} over time in ${meta.unit}`}>
            {[yMin, (yMin + yMax) / 2, yMax].map((t) => (
              <g key={t}>
                <line x1={PAD_L} y1={y(t)} x2={W - PAD} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
                <text x={PAD_L - 10} y={y(t) + 6} fill="var(--text-muted)" fontSize="16" textAnchor="end">
                  {fmt(t)}
                </text>
              </g>
            ))}

            <text
              x={20} y={H / 2}
              fill="var(--text-muted)" fontSize="16" textAnchor="middle"
              transform={`rotate(-90 20 ${H / 2})`}
            >
              {meta.label} ({meta.unit})
            </text>

            {series.length > 1 && (
              <polyline
                points={series.map((p) => `${x(p.time)},${y(p.value)}`).join(' ')}
                fill="none" stroke="var(--accent)" strokeWidth="2.5"
              />
            )}

            {series.map((p) => (
              <circle key={p.id} cx={x(p.time)} cy={y(p.value)} r="5" fill="var(--accent)">
                <title>{`${formatDate(p.time)}: ${fmt(p.value)} ${meta.unit}`}</title>
              </circle>
            ))}

            {[series[0], series[series.length - 1]].map((p, i) => (
              <text
                key={`x-${p.id}-${i}`}
                x={x(p.time)} y={H - PAD + 22}
                fill="var(--text-muted)" fontSize="16"
                textAnchor={i === 0 ? 'start' : 'end'}
              >
                {formatDate(p.time)}
              </text>
            ))}

            <line x1={PAD_L} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="2" />
          </svg>
        </>
      )}
    </div>
  );
}
