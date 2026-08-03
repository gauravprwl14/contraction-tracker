import { formatDuration } from '../../../utils/format';

const TREND_ICON = { up: '↑', down: '↓', stable: '→', null: '' };
const TREND_COLOR = { up: '#ff8a5a', down: '#4cffb0', stable: '#888898', null: 'transparent' };

const STAGE_META = {
  tracking: { label: 'Tracking', color: '#888898', desc: 'Collecting data…' },
  early:    { label: 'Early Labor', color: '#4cffb0', desc: 'Contractions beginning to establish' },
  active:   { label: 'Active Labor', color: '#ffb84c', desc: 'Regular, closer contractions' },
  transition:{ label: 'Transition', color: '#ff5a7c', desc: 'Intense — may be near delivery' },
};

function StatCard({ label, value, sub, trend, trendInvert }) {
  // trendInvert: for intervals, 'down' (closer) is positive progress → show green
  const displayTrend = trend ?? null;
  const trendColor = displayTrend
    ? (trendInvert
        ? (displayTrend === 'down' ? '#4cffb0' : displayTrend === 'up' ? '#ff8a5a' : '#888898')
        : TREND_COLOR[displayTrend])
    : 'transparent';

  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__value">{value}</span>
        {displayTrend && (
          <span className="stat-card__trend" style={{ color: trendColor }}>
            {TREND_ICON[displayTrend]}
          </span>
        )}
      </div>
      <span className="stat-card__label">{label}</span>
      {sub && <span className="stat-card__sub">{sub}</span>}
    </div>
  );
}

export function StatsBar({
  contractions, avgDuration, avgInterval, timeSinceLast, is511,
  longestDuration, shortestDuration, durationTrend, intervalTrend,
  laborStage, perHour, sessionDuration,
}) {
  const stage = STAGE_META[laborStage] ?? STAGE_META.tracking;

  return (
    <div className="stats-section">
      {/* Labor stage banner */}
      <div className="stage-banner" style={{ borderColor: stage.color, color: stage.color }}>
        <span className="stage-banner__label">{stage.label}</span>
        <span className="stage-banner__desc">{stage.desc}</span>
      </div>

      <div className="stats-bar">
        <StatCard label="Count" value={contractions.length} />
        <StatCard
          label="Avg Duration"
          value={formatDuration(avgDuration)}
          trend={durationTrend}
        />
        <StatCard
          label="Avg Interval"
          value={formatDuration(avgInterval)}
          sub="gap between"
          trend={intervalTrend}
          trendInvert
        />
        <StatCard
          label="Last Ended"
          value={timeSinceLast != null ? formatDuration(timeSinceLast) : '--'}
          sub="ago"
        />
        <StatCard label="Per Hour" value={perHour ?? '--'} />
        <StatCard
          label="Session"
          value={formatDuration(sessionDuration)}
        />
        <StatCard label="Longest" value={formatDuration(longestDuration)} />
        <StatCard label="Shortest" value={formatDuration(shortestDuration)} />
      </div>

      {is511 && (
        <div className="alert-511">
          ⚠️ 5-1-1 pattern — contractions ≤5 min apart, ≥45s long. Consider calling your provider.
        </div>
      )}
    </div>
  );
}
