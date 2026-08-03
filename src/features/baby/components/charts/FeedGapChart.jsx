import { gapsBetweenFeeds } from '../../feedLogic';

const W = 1000;
const H = 260;
const PAD = 30;

export function FeedGapChart({ feeds }) {
  const gaps = gapsBetweenFeeds(feeds).slice(0, 20).reverse(); // oldest left
  if (gaps.length < 2) {
    return (
      <div className="chart">
        <h3 className="chart__title">Gap between feeds</h3>
        <p className="chart__empty">Not enough feeds yet — log a few more.</p>
      </div>
    );
  }

  const hours = gaps.map((g) => g / 3600000);
  const max = Math.max(...hours, 1);
  const bw = (W - PAD * 2) / hours.length;
  const y = (h) => H - PAD - (h / max) * (H - PAD * 2);
  const avg = hours.reduce((s, v) => s + v, 0) / hours.length;

  return (
    <div className="chart">
      <h3 className="chart__title">Gap between feeds (hours)</h3>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Hours between feeds">
        {hours.map((h, i) => (
          <rect
            key={i}
            x={PAD + i * bw + bw * 0.15}
            y={y(h)}
            width={bw * 0.7}
            height={H - PAD - y(h)}
            rx="3"
            fill="var(--accent)"
          >
            <title>{h.toFixed(1)}h</title>
          </rect>
        ))}
        <line x1={PAD} y1={y(avg)} x2={W - PAD} y2={y(avg)} stroke="var(--green)" strokeWidth="2" strokeDasharray="8 6" />
        <text x={W - PAD} y={y(avg) - 8} fill="var(--green)" fontSize="18" textAnchor="end">
          avg {avg.toFixed(1)}h
        </text>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="2" />
      </svg>
      <p className="chart__caption">Oldest on the left · last {hours.length} gaps</p>
    </div>
  );
}
