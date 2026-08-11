import { formatGap, formatTime } from '../../../utils/format';
import { feedSummary, diaperSummary, entryIcon } from '../entrySummary';
import { ActiveSessionCard } from '../session/ActiveSessionCard';
import { PendingBreastCard } from '../session/PendingBreastCard';
import { Icon } from '../icons/Icon';

export function HomeScreen({
  feedStore, diaperStore, armed, onStart, onPickSide, onCancelArm,
  onLogDiaper, onLogGrowth, onLogMedicine, onEdit, onEditStale, onSaved,
}) {
  const { active, suggestion, lastFeed, msSinceLastFeed, todayStats } = feedStore;
  const diaperToday = diaperStore.todayStats;
  const poopDays = diaperStore.daysSinceLastPoop;

  const poopTone = poopDays === null ? 'none' : poopDays === 0 ? 'today' : poopDays >= 3 ? 'long' : 'ok';
  const poopLabel = poopDays === null
    ? 'No poop logged yet'
    : `${poopDays === 1 ? 'day' : 'days'} since last poop`;

  const recent = [
    ...feedStore.feeds.slice(0, 8).map((f) => ({ kind: 'feed', time: f.startTime, item: f })),
    ...diaperStore.diapers.slice(0, 8).map((d) => ({ kind: 'diaper', time: d.time, item: d })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 8);

  return (
    <div className="home">
      {active ? (
        <ActiveSessionCard feedStore={feedStore} onSaved={onSaved} onEditStale={onEditStale} />
      ) : armed ? (
        <PendingBreastCard
          suggestion={suggestion}
          onPick={onPickSide}
          onCancel={onCancelArm}
        />
      ) : (
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
      )}

      {/* The start actions stay reachable while a feed runs — otherwise there
          is no way to begin a different feed, and the start guard that asks
          what to do with the running one can never be triggered. */}
      {!armed && (
        <div className={`actions ${active ? 'actions--secondary' : ''}`}>
          <button className="action action--breast" onClick={() => onStart('breast')}>
            <Icon name="breast" size={active ? 20 : 26} />
            <span>Breast</span>
          </button>
          <button className="action action--bottle" onClick={() => onStart('bottle')}>
            <Icon name="bottle" size={active ? 20 : 26} />
            <span>Bottle</span>
          </button>
        </div>
      )}
      {armed && (
        <div className="actions actions--secondary">
          <button className="action action--bottle" onClick={() => onStart('bottle')}>
            <Icon name="bottle" size={20} />
            <span>Bottle</span>
          </button>
        </div>
      )}

      <div className="actions actions--diaper">
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: true, poop: false })}>
          <Icon name="pee" size={18} /> Pee
        </button>
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: false, poop: true })}>
          <Icon name="poop" size={18} /> Poop
        </button>
        <button className="action action--sm" onClick={() => onLogDiaper({ pee: true, poop: true })}>
          Both
        </button>
      </div>

      <div className="actions actions--diaper">
        <button className="action action--sm" onClick={onLogMedicine}>
          <Icon name="medicine" size={18} /> Medicine
        </button>
        <button className="action action--sm" onClick={onLogGrowth}>
          <Icon name="growth" size={18} /> Measure
        </button>
      </div>

      <div className={`poop-card poop-card--${poopTone}`}>
        <span className="poop-card__icon"><Icon name="poop" size={22} /></span>
        <span className="poop-card__value">{poopDays === null ? '—' : poopDays}</span>
        <span className="poop-card__label">{poopLabel}</span>
      </div>

      <p className="today-summary">
        Today · {todayStats.feedCount} feeds
        {todayStats.totalMl > 0 && ` · ${todayStats.totalMl} ml`}
        {todayStats.breastMs > 0 && ` · ${Math.round(todayStats.breastMs / 60000)}m breast`}
        {` · ${diaperToday.peeCount} pee · ${diaperToday.poopCount} poop`}
      </p>

      <ul className="recent">
        {recent.length === 0 && <li className="recent__empty">Nothing logged yet.</li>}
        {recent.map(({ kind, time, item }) => (
          <li key={item.id}>
            <button className="recent__row" onClick={() => onEdit(kind, item)}>
              <span className="recent__time">{formatTime(time)}</span>
              <span className="recent__icon"><Icon name={entryIcon(kind, item)} size={18} /></span>
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
