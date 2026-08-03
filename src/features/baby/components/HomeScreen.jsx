import { formatGap, formatMs, formatTime } from '../../../utils/format';
import { feedDurationMs } from '../feedLogic';

function feedSummary(feed) {
  if (!feed) return null;
  if (feed.type === 'breast') {
    const parts = [];
    if (feed.leftMs > 0) parts.push(`L ${Math.round(feed.leftMs / 60000)}m`);
    if (feed.rightMs > 0) parts.push(`R ${Math.round(feed.rightMs / 60000)}m`);
    return parts.join(' · ') || formatMs(feedDurationMs(feed));
  }
  return `${feed.takenMl} ml · ${feed.milk === 'formula' ? 'Formula' : 'Expressed'}`;
}

function diaperSummary(d) {
  if (d.pee && d.poop) return 'Pee + Poop';
  return d.poop ? 'Poop' : 'Pee';
}

export function HomeScreen({ feedStore, diaperStore, onOpenBreast, onOpenExternal, onLogDiaper, onEdit }) {
  const { lastFeed, msSinceLastFeed, todayStats } = feedStore;
  const diaperToday = diaperStore.todayStats;

  const recent = [
    ...feedStore.feeds.slice(0, 8).map((f) => ({ kind: 'feed', time: f.startTime, item: f })),
    ...diaperStore.diapers.slice(0, 8).map((d) => ({ kind: 'diaper', time: d.time, item: d })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 8);

  return (
    <div className="home">
      <div className="banner">
        {lastFeed ? (
          <>
            <p className="banner__main">Last feed {formatGap(msSinceLastFeed)} ago</p>
            <p className="banner__sub">
              {feedSummary(lastFeed)} · {formatTime(lastFeed.startTime)}
            </p>
          </>
        ) : (
          <p className="banner__main">No feeds recorded yet</p>
        )}
      </div>

      <div className="actions">
        <button className="action action--breast" onClick={onOpenBreast}>
          <span className="action__icon" aria-hidden="true">🤱</span>
          <span>Breast</span>
        </button>
        <button className="action action--bottle" onClick={onOpenExternal}>
          <span className="action__icon" aria-hidden="true">🍼</span>
          <span>Bottle</span>
        </button>
      </div>

      <div className="actions actions--diaper">
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: true, poop: false })}>
          💧 Pee
        </button>
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: false, poop: true })}>
          💩 Poop
        </button>
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: true, poop: true })}>
          Both
        </button>
      </div>

      <p className="today-summary">
        Today · {todayStats.feedCount} feeds
        {todayStats.totalMl > 0 && ` · ${todayStats.totalMl} ml`}
        {todayStats.breastMs > 0 && ` · ${Math.round(todayStats.breastMs / 60000)}m breast`}
        {' · '}{diaperToday.peeCount}💧 · {diaperToday.poopCount}💩
      </p>

      <ul className="recent">
        {recent.length === 0 && <li className="recent__empty">Nothing logged yet.</li>}
        {recent.map(({ kind, time, item }) => (
          <li key={item.id}>
            <button className="recent__row" onClick={() => onEdit(kind, item)}>
              <span className="recent__time">{formatTime(time)}</span>
              <span className="recent__icon" aria-hidden="true">
                {kind === 'feed' ? (item.type === 'breast' ? '🤱' : '🍼') : (item.poop ? '💩' : '💧')}
              </span>
              <span className="recent__text">
                {kind === 'feed' ? feedSummary(item) : diaperSummary(item)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
