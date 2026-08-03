import { useState } from 'react';
import { dailyFeedTotals } from '../../feedLogic';
import { dailyDiaperTotals } from '../../diaperLogic';

const W = 1000;
const H = 280;
const PAD = 34;

const SERIES = [
  { id: 'feedCount', label: 'Feeds', color: 'var(--accent)' },
  { id: 'totalMl', label: 'ml', color: 'var(--green)' },
  { id: 'breastMin', label: 'Breast min', color: '#b06aff' },
  { id: 'peeCount', label: 'Pee', color: '#5ab8ff' },
  { id: 'poopCount', label: 'Poop', color: 'var(--warn)' },
];

export function DailyTotalsChart({ feeds, diapers, now }) {
  const [days, setDays] = useState(7);
  const [active, setActive] = useState(['feedCount', 'totalMl']);

  // `now` comes from the ticking store clock rather than Date.now() here, since
  // calling Date.now() during render trips react-hooks/purity.
  const feedRows = dailyFeedTotals(feeds, now, days);
  const diaperRows = dailyDiaperTotals(diapers, now, days);

  const rows = feedRows.map((r, i) => ({
    key: r.key,
    dayStart: r.dayStart,
    feedCount: r.feedCount,
    totalMl: r.totalMl,
    breastMin: Math.round(r.breastMs / 60000),
    peeCount: diaperRows[i].peeCount,
    poopCount: diaperRows[i].poopCount,
  }));

  const shown = SERIES.filter((s) => active.includes(s.id));
  const max = Math.max(1, ...rows.flatMap((r) => shown.map((s) => r[s.id])));
  const groupW = (W - PAD * 2) / rows.length;
  const barW = shown.length > 0 ? (groupW * 0.7) / shown.length : 0;
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);

  const toggle = (id) =>
    setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const hasData = rows.some((r) => r.feedCount > 0 || r.peeCount > 0 || r.poopCount > 0);

  return (
    <div className="chart">
      <div className="chart__head">
        <h3 className="chart__title">Daily totals</h3>
        <div className="chip-row">
          {[7, 14].map((d) => (
            <button key={d} className={`chip chip--sm ${days === d ? 'chip--active' : ''}`} onClick={() => setDays(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="chip-row chip-row--series">
        {SERIES.map((s) => (
          <button
            key={s.id}
            className={`chip chip--sm ${active.includes(s.id) ? 'chip--active' : ''}`}
            onClick={() => toggle(s.id)}
          >
            <span className="key" style={{ background: s.color }} /> {s.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <p className="chart__empty">Nothing logged in this range yet.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Daily totals">
          {rows.map((r, ri) =>
            shown.map((s, si) => {
              const v = r[s.id];
              const x = PAD + ri * groupW + groupW * 0.15 + si * barW;
              return (
                <rect key={`${r.key}-${s.id}`} x={x} y={y(v)} width={Math.max(2, barW - 2)} height={H - PAD - y(v)} rx="2" fill={s.color}>
                  <title>{`${r.key} · ${s.label}: ${v}`}</title>
                </rect>
              );
            })
          )}
          {rows.map((r, ri) => (
            <text
              key={`lbl-${r.key}`}
              x={PAD + ri * groupW + groupW / 2}
              y={H - PAD + 22}
              fill="var(--text-muted)"
              fontSize="16"
              textAnchor="middle"
            >
              {new Date(r.dayStart).getDate()}
            </text>
          ))}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}
