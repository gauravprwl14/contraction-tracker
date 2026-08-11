import { useState } from 'react';
import { dailyFeedTotals } from '../../feedLogic';
import { dailyIntakePerKg, latestMeasurement } from '../../growthLogic';
import { formatDate } from '../../../../utils/format';

const W = 1000;
const H = 280;
const PAD_L = 70;
const PAD = 34;

// Intake per kg per day. The number a paediatrician reaches for first, and the
// reason the growth tracker has to exist: without a weight it cannot be shown
// at all, and a guessed weight would be worse than an honest gap.
export function IntakePerKgChart({ feeds, measurements, now }) {
  const [days, setDays] = useState(7);

  const rows = dailyIntakePerKg(dailyFeedTotals(feeds, now, days), measurements);
  const weighIn = latestMeasurement(measurements, 'weightKg', now);
  const values = rows.map((r) => r.mlPerKg).filter((v) => v != null);
  // A day with a weight but no feeds yields 0, not null, so emptiness has to be
  // judged on intake rather than on the computed ratio.
  const hasIntake = rows.some((r) => r.totalMl > 0);

  const max = Math.max(1, ...values);
  const niceMax = Math.ceil(max / 20) * 20;
  const groupW = (W - PAD_L - PAD) / rows.length;
  const y = (v) => H - PAD - (v / niceMax) * (H - PAD * 2);

  if (!weighIn) {
    return (
      <div className="chart">
        <h3 className="chart__title">Intake per kg per day</h3>
        <p className="chart__empty">
          Log a weight to see intake per kg — the measure a doctor usually asks for.
        </p>
      </div>
    );
  }

  const ticks = [0, niceMax / 2, niceMax];

  return (
    <div className="chart">
      <div className="chart__head">
        <h3 className="chart__title">Intake per kg per day</h3>
        <div className="chip-row">
          {[7, 14].map((d) => (
            <button
              key={d}
              className={`chip chip--sm ${days === d ? 'chip--active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <p className="chart__caption">
        Using weight {weighIn.weightKg} kg, measured {formatDate(weighIn.time)}.
        Days before that weigh-in are left blank.
      </p>

      {!hasIntake ? (
        <p className="chart__empty">No feeds recorded in this range.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Millilitres per kilogram per day">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} y1={y(t)} x2={W - PAD} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
              <text x={PAD_L - 10} y={y(t) + 6} fill="var(--text-muted)" fontSize="16" textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          <text
            x={18} y={H / 2}
            fill="var(--text-muted)" fontSize="16" textAnchor="middle"
            transform={`rotate(-90 18 ${H / 2})`}
          >
            ml/kg/day
          </text>

          {rows.map((r, i) => {
            const x = PAD_L + i * groupW + groupW * 0.2;
            const barW = groupW * 0.6;
            if (r.mlPerKg == null) {
              return (
                <text
                  key={r.key}
                  x={x + barW / 2} y={H - PAD - 8}
                  fill="var(--text-muted)" fontSize="16" textAnchor="middle"
                >
                  –
                </text>
              );
            }
            return (
              <rect
                key={r.key}
                x={x} y={y(r.mlPerKg)} width={barW} height={H - PAD - y(r.mlPerKg)}
                rx="2" fill="var(--accent)"
              >
                <title>{`${r.key}: ${r.mlPerKg} ml/kg (${r.totalMl} ml at ${r.weightKg} kg)`}</title>
              </rect>
            );
          })}

          {rows.map((r, i) => (
            <text
              key={`lbl-${r.key}`}
              x={PAD_L + i * groupW + groupW / 2}
              y={H - PAD + 22}
              fill="var(--text-muted)" fontSize="16" textAnchor="middle"
            >
              {new Date(r.dayStart).getDate()}
            </text>
          ))}

          <line x1={PAD_L} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}
