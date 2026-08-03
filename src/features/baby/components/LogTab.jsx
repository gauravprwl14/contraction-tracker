import { groupByDay, formatDayLabel } from '../../../utils/dates';
import { formatTime, formatMs } from '../../../utils/format';
import { feedDurationMs } from '../feedLogic';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'feeds', label: 'Feeds' },
  { id: 'diapers', label: 'Diapers' },
];

function describe(entry) {
  const { kind, item } = entry;
  if (kind === 'diaper') {
    const what = item.pee && item.poop ? 'Pee + Poop' : item.poop ? 'Poop' : 'Pee';
    const extra = [item.color, item.consistency, item.amount].filter(Boolean).join(' · ');
    return extra ? `${what} · ${extra}` : what;
  }
  if (item.type === 'breast') {
    return `Breast · L ${Math.round(item.leftMs / 60000)}m · R ${Math.round(item.rightMs / 60000)}m · ${formatMs(feedDurationMs(item))} total`;
  }
  return `${item.takenMl} ml taken of ${item.offeredMl} · ${item.milk} · ${item.method}`;
}

export function LogTab({
  feedStore, diaperStore, filter, onFilterChange, onEdit,
  onExportJson, onExportFeedsCsv, onExportDiapersCsv, onImport,
}) {
  const entries = [
    ...(filter !== 'diapers'
      ? feedStore.feeds.map((f) => ({ kind: 'feed', time: f.startTime, item: f }))
      : []),
    ...(filter !== 'feeds'
      ? diaperStore.diapers.map((d) => ({ kind: 'diaper', time: d.time, item: d }))
      : []),
  ].sort((a, b) => b.time - a.time);

  const groups = groupByDay(entries, (e) => e.time);

  return (
    <div className="log">
      <div className="log__backup">
        <button className="action--link" onClick={onExportJson}>Backup (JSON)</button>
        <button className="action--link" onClick={onExportFeedsCsv}>Feeds CSV</button>
        <button className="action--link" onClick={onExportDiapersCsv}>Diapers CSV</button>
        <label className="action--link">
          Import
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <div className="chip-row chip-row--filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? 'chip--active' : ''}`}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && <p className="placeholder">Nothing logged yet.</p>}

      {groups.map((group) => (
        <section key={group.key} className="log__day">
          <h2 className="log__day-title">{formatDayLabel(group.dayStart)}</h2>
          <ul className="log__list">
            {group.items.map((entry) => (
              <li key={entry.item.id}>
                <button className="log__row" onClick={() => onEdit(entry.kind, entry.item)}>
                  <span className="log__time">{formatTime(entry.time)}</span>
                  <span className="log__icon" aria-hidden="true">
                    {entry.kind === 'feed'
                      ? entry.item.type === 'breast' ? '🤱' : '🍼'
                      : entry.item.poop ? '💩' : '💧'}
                  </span>
                  <span className="log__text">
                    {describe(entry)}
                    {entry.item.note && <em className="log__note"> — {entry.item.note}</em>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
