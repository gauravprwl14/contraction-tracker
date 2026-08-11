import { useState } from 'react';
import { startOfDay, addDays, formatDayLabel, DAY_MS } from '../../../../utils/dates';
import { feedDurationMs } from '../../feedLogic';

const W = 1000;
const H = 120;
const TRACK_Y = 46;
const TRACK_H = 34;

// Fraction of the day, clamped so an entry that started yesterday still renders at 0.
const frac = (ts, dayStart) => Math.min(1, Math.max(0, (ts - dayStart) / DAY_MS));

export function TimelineStrip({ feeds, diapers, initialDayStart, now }) {
  // `now` comes from the ticking store clock rather than Date.now() here, since
  // calling Date.now() during render trips react-hooks/purity.
  const [dayStart, setDayStart] = useState(() => initialDayStart ?? startOfDay(now));
  const dayEnd = dayStart + DAY_MS;

  const dayFeeds = feeds.filter((f) => f.startTime >= dayStart && f.startTime < dayEnd);
  const dayDiapers = diapers.filter((d) => d.time >= dayStart && d.time < dayEnd);
  const isToday = startOfDay(now) === dayStart;

  return (
    <div className="chart">
      <div className="chart__head">
        <button className="chart__nav" onClick={() => setDayStart((d) => addDays(d, -1))} aria-label="Previous day">‹</button>
        <h3 className="chart__title">{formatDayLabel(dayStart)}</h3>
        <button className="chart__nav" onClick={() => setDayStart((d) => addDays(d, 1))} disabled={isToday} aria-label="Next day">›</button>
      </div>

      {dayFeeds.length === 0 && dayDiapers.length === 0 ? (
        <p className="chart__empty">Nothing logged on this day.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="24 hour timeline">
          <rect x="0" y={TRACK_Y} width={W} height={TRACK_H} rx="6" fill="var(--surface-2)" />

          {[0, 6, 12, 18, 24].map((h) => (
            <g key={h}>
              <line x1={(h / 24) * W} y1={TRACK_Y} x2={(h / 24) * W} y2={TRACK_Y + TRACK_H} stroke="var(--border)" strokeWidth="2" />
              <text x={Math.min(W - 20, Math.max(14, (h / 24) * W))} y={TRACK_Y + TRACK_H + 20} fill="var(--text-muted)" fontSize="18" textAnchor="middle">
                {h}
              </text>
            </g>
          ))}

          {dayFeeds.map((f) => {
            const x = frac(f.startTime, dayStart) * W;
            const w = Math.max(4, (feedDurationMs(f) / DAY_MS) * W);
            return (
              <rect
                key={f.id}
                x={x}
                y={TRACK_Y}
                width={Math.min(w, W - x)}
                height={TRACK_H}
                fill={f.type === 'breast' ? 'var(--accent)' : 'var(--amber)'}
              >
                <title>{f.type === 'breast' ? 'Breast feed' : 'Bottle feed'}</title>
              </rect>
            );
          })}

          {dayDiapers.map((d) => (
            <circle
              key={d.id}
              cx={frac(d.time, dayStart) * W}
              cy={d.poop ? 22 : TRACK_Y + TRACK_H + 34}
              r="8"
              fill={d.poop ? 'var(--stop)' : 'var(--slate)'}
            >
              <title>{d.poop ? 'Poop' : 'Pee'}</title>
            </circle>
          ))}
        </svg>
      )}

      <p className="chart__legend">
        <span className="key key--accent" /> Breast
        <span className="key key--green" /> Bottle
        <span className="key key--warn" /> Poop
        <span className="key key--blue" /> Pee
      </p>
    </div>
  );
}
