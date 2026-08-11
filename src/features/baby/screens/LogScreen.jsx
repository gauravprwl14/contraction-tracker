import { groupByDay, formatDayLabel } from '../../../utils/dates';
import { applyFilters } from '../log/logFilter';
import { useLogFilter } from '../log/useLogFilter';
import { LogFilterBar } from '../log/LogFilterBar';
import { LogEntryRow } from '../log/LogEntryRow';
import { Icon } from '../icons/Icon';

export function LogScreen({
  feedStore, diaperStore, now, onEdit,
  onExportJson, onExportFeedsCsv, onExportDiapersCsv, onImport,
}) {
  const state = useLogFilter();

  const all = [
    ...feedStore.feeds.map((f) => ({ kind: 'feed', time: f.startTime, item: f })),
    ...diaperStore.diapers.map((d) => ({ kind: 'diaper', time: d.time, item: d })),
  ].sort((a, b) => b.time - a.time);

  const entries = applyFilters(all, state.filter, now);
  const groups = groupByDay(entries, (e) => e.time);

  return (
    <div className="log">
      <div className="log__backup">
        <button className="action--link" onClick={onExportJson}>
          <Icon name="download" size={16} /> Backup (JSON)
        </button>
        <button className="action--link" onClick={onExportFeedsCsv}>Feeds CSV</button>
        <button className="action--link" onClick={onExportDiapersCsv}>Diapers CSV</button>
        <label className="action--link">
          <Icon name="upload" size={16} /> Import
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

      <LogFilterBar state={state} count={entries.length} now={now} />

      {all.length === 0 && <p className="placeholder">Nothing logged yet.</p>}

      {all.length > 0 && entries.length === 0 && (
        <p className="placeholder">
          No records match these filters.{' '}
          <button className="action--link" onClick={state.clear}>Clear filters</button>
        </p>
      )}

      {groups.map((group) => (
        <section key={group.key} className="log__day">
          <h2 className="log__day-title">{formatDayLabel(group.dayStart, now)}</h2>
          <ul className="log__list">
            {group.items.map((entry) => (
              <LogEntryRow key={entry.item.id} entry={entry} onEdit={onEdit} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
