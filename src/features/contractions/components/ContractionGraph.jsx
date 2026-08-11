import { useMemo } from 'react';
import { formatTime } from '../../../utils/format';

// Layout constants
const BAR_W    = 38;   // fixed bar width px
const BAR_GAP  = 30;   // gap between bars
const CHART_H  = 150;  // drawable height for bars
const Y_PAD    = 44;   // left gutter for Y-axis labels
const TOP_PAD  = 24;   // above bars (for duration labels)
const BOT_PAD  = 62;   // below axis (contraction# + time + interval label)
const R_PAD    = 20;   // right margin
const AXIS_Y   = TOP_PAD + CHART_H; // pixel Y where the axis sits

const REF_LINES = [
  { secs: 45, color: 'var(--accent)', dash: '4 3', label: '45s' },
  { secs: 60, color: 'var(--amber)', dash: '4 3', label: '1m' },
];

const INTENSITY_COLORS = ['var(--accent)', 'var(--accent)', 'var(--accent)', 'var(--amber)', 'var(--amber)', 'var(--stop)'];

function fmtShort(s) {
  if (s == null) return '';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${String(sec).padStart(2,'0')}s` : `${s}s`;
}

export function ContractionGraph({ contractions, intervals, isActive, elapsed }) {
  const { bars, yGridLines, yMaxRounded, svgW, svgH, visibleIntervals } =
    useMemo(() => {
      const MAX_BARS = 20;
      // chronological order oldest→newest
      const chron = [...contractions].reverse();
      const chronVisible = chron.slice(-MAX_BARS);
      const offsetFromEnd = chron.length - chronVisible.length; // how many skipped at start

      const durations = chronVisible.map((c) => c.duration);
      const rawMax = Math.max(90, ...(isActive ? [...durations, elapsed] : durations));
      const yMaxRounded = Math.ceil(rawMax / 30) * 30;

      const N = chronVisible.length + (isActive ? 1 : 0);
      const svgW = Y_PAD + N * (BAR_W + BAR_GAP) - BAR_GAP + R_PAD;
      const svgH = TOP_PAD + CHART_H + BOT_PAD;

      const yToPixel = (secs) => AXIS_Y - (secs / yMaxRounded) * CHART_H;

      // Grid lines at every 30s
      const yGridLines = [];
      for (let s = 0; s <= yMaxRounded; s += 30) {
        yGridLines.push({ secs: s, y: yToPixel(s) });
      }

      const bars = chronVisible.map((c, i) => {
        const barH = Math.max(4, (c.duration / yMaxRounded) * CHART_H);
        const x = Y_PAD + i * (BAR_W + BAR_GAP);
        const y = AXIS_Y - barH;
        const color = INTENSITY_COLORS[c.intensity ?? 0];
        // global contraction number (1-based, oldest = 1)
        const num = offsetFromEnd + i + 1;
        return { x, y, barH, color, c, num };
      });

      // intervals aligned to chronVisible gaps (oldest-first)
      // intervals prop is newest-first; reverse then slice to match chronVisible
      const intervalsChron = [...intervals].reverse();
      const visibleIntervals = intervalsChron.slice(-Math.max(0, chronVisible.length - 1));

      return { bars, yGridLines, yMaxRounded, svgW, svgH, visibleIntervals };
    }, [contractions, intervals, isActive, elapsed]);

  if (contractions.length === 0) {
    return (
      <div className="graph-empty">
        <p>Record your first contraction to see the graph.</p>
      </div>
    );
  }

  const yToPixel = (secs) => AXIS_Y - (secs / yMaxRounded) * CHART_H;

  // Active bar geometry
  const activeDur = isActive ? elapsed : 0;
  const activeBarH = activeDur > 0 ? Math.max(4, (activeDur / yMaxRounded) * CHART_H) : 0;
  const activeBarX = bars.length > 0
    ? Y_PAD + bars.length * (BAR_W + BAR_GAP)
    : Y_PAD;

  return (
    <div className="graph-wrap">
      <div className="graph-title-row">
        <span className="graph-title">Duration over time</span>
        {contractions.length > 20 && (
          <span className="graph-scroll-hint">← scroll to see all</span>
        )}
      </div>

      <div className="graph-scroll">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="graph-svg"
          aria-label="Contraction duration chart"
        >
          {/* ── Background grid lines ── */}
          {yGridLines.map(({ secs, y }) => (
            <g key={secs}>
              <line
                x1={Y_PAD - 6} y1={y} x2={svgW - R_PAD} y2={y}
                stroke="var(--border)" strokeWidth={secs === 0 ? 1.5 : 0.75}
              />
              <text x={Y_PAD - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                {fmtShort(secs)}
              </text>
            </g>
          ))}

          {/* ── Medical reference lines (45s, 1m) ── */}
          {REF_LINES.filter((r) => r.secs <= yMaxRounded).map((r) => (
            <g key={r.secs}>
              <line
                x1={Y_PAD} y1={yToPixel(r.secs)} x2={svgW - R_PAD} y2={yToPixel(r.secs)}
                stroke={r.color} strokeWidth="1" strokeDasharray={r.dash} opacity="0.45"
              />
              <text
                x={svgW - R_PAD + 2} y={yToPixel(r.secs) + 4}
                fontSize="9" fill={r.color} opacity="0.7"
              >
                {r.label}
              </text>
            </g>
          ))}

          {/* ── Trend line connecting bar tops ── */}
          {bars.length >= 2 && (() => {
            const points = bars
              .map(({ x, y }) => `${x + BAR_W / 2},${y}`)
              .join(' ');
            return (
              <polyline
                points={points}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.35"
              />
            );
          })()}

          {/* ── Contraction bars ── */}
          {bars.map(({ x, y, barH, color, c, num }) => (
            <g key={c.id}>
              {/* Bar with gradient */}
              <defs>
                <linearGradient id={`bar-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.45" />
                </linearGradient>
              </defs>
              <rect
                x={x} y={y} width={BAR_W} height={barH}
                rx="5" ry="5"
                fill={`url(#bar-${c.id})`}
              />
              {/* Duration label — inside bar if tall enough, else above */}
              {barH >= 28 ? (
                <text
                  x={x + BAR_W / 2} y={y + barH / 2 + 4}
                  textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--accent-ink)" opacity="0.8"
                >
                  {fmtShort(c.duration)}
                </text>
              ) : (
                <text
                  x={x + BAR_W / 2} y={y - 5}
                  textAnchor="middle" fontSize="10" fill={color}
                >
                  {fmtShort(c.duration)}
                </text>
              )}

              {/* X-axis: contraction number */}
              <text
                x={x + BAR_W / 2} y={AXIS_Y + 16}
                textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)"
              >
                #{num}
              </text>
              {/* X-axis: time */}
              <text
                x={x + BAR_W / 2} y={AXIS_Y + 30}
                textAnchor="middle" fontSize="9" fill="var(--text-muted)"
              >
                {formatTime(c.startTime).slice(0, -3)}
              </text>
            </g>
          ))}

          {/* ── Interval labels between bars ── */}
          {visibleIntervals.map((gapSec, i) => {
            const leftBar  = bars[i];
            const rightBar = bars[i + 1];
            if (!leftBar || !rightBar) return null;
            const midX = (leftBar.x + BAR_W / 2 + rightBar.x + BAR_W / 2) / 2;
            return (
              <g key={i}>
                {/* connector dots */}
                <line
                  x1={leftBar.x + BAR_W} y1={AXIS_Y + 44}
                  x2={rightBar.x}         y2={AXIS_Y + 44}
                  stroke="var(--border)" strokeWidth="1" strokeDasharray="2 2"
                />
                <text
                  x={midX} y={AXIS_Y + 55}
                  textAnchor="middle" fontSize="9" fill="var(--accent)" opacity="0.85"
                >
                  ↔ {fmtShort(gapSec)}
                </text>
              </g>
            );
          })}

          {/* ── Active / in-progress bar ── */}
          {isActive && activeBarH > 0 && (
            <g>
              <rect
                x={activeBarX} y={AXIS_Y - activeBarH}
                width={BAR_W} height={activeBarH}
                rx="5" ry="5"
                fill="var(--accent)" opacity="0.55"
              >
                <animate attributeName="opacity" values="0.3;0.65;0.3" dur="1s" repeatCount="indefinite" />
              </rect>
              <text
                x={activeBarX + BAR_W / 2} y={AXIS_Y - activeBarH - 6}
                textAnchor="middle" fontSize="10" fill="var(--accent)"
              >
                {fmtShort(activeDur)}
              </text>
              <text
                x={activeBarX + BAR_W / 2} y={AXIS_Y + 16}
                textAnchor="middle" fontSize="10" fill="var(--accent)"
              >
                now
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="graph-footer">
        <div className="graph-ref-legend">
          <span style={{ color: 'var(--accent)' }}>— 45s</span>
          <span style={{ color: 'var(--amber)' }}>— 1m</span>
          <span style={{ color: 'var(--accent)', opacity: 0.5 }}>--- trend</span>
        </div>
        <div className="graph-intensity-legend">
          {[['var(--accent)','Unrated'],['var(--accent)','Mild'],['var(--amber)','Moderate'],['var(--amber)','Strong'],['var(--stop)','Intense']].map(([c,l]) => (
            <span key={l} style={{ color: c }}>■ {l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
