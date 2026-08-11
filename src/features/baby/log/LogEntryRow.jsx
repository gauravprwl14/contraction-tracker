import { formatTime, formatMs } from '../../../utils/format';
import { feedDurationMs } from '../feedLogic';
import { entryIcon, growthSummary, medicineSummary } from '../entrySummary';
import { Icon } from '../icons/Icon';

function primary(entry) {
  const { kind, item } = entry;
  if (kind === 'growth') return 'Measurement';
  if (kind === 'medicine') return medicineSummary(item);
  if (kind === 'diaper') return item.pee && item.poop ? 'Pee + poop' : item.poop ? 'Poop' : 'Pee';
  if (item.type === 'breast') return `Breast · ${formatMs(feedDurationMs(item))}`;
  return `Bottle · ${item.takenMl} ml`;
}

function secondary(entry) {
  const { kind, item } = entry;
  if (kind === 'growth') return growthSummary(item);
  if (kind === 'medicine') return '';
  if (kind === 'diaper') {
    return [item.color, item.consistency, item.amount].filter(Boolean).join(' · ');
  }
  if (item.type === 'breast') {
    return `L ${Math.round(item.leftMs / 60000)}m · R ${Math.round(item.rightMs / 60000)}m`;
  }
  return `${item.takenMl} of ${item.offeredMl} ml · ${item.milk} · ${item.method}`;
}

export function LogEntryRow({ entry, onEdit }) {
  const detail = secondary(entry);

  return (
    <li>
      <button className="log__row" onClick={() => onEdit(entry.kind, entry.item)}>
        <span className="log__time">{formatTime(entry.time)}</span>
        <span className="log__icon"><Icon name={entryIcon(entry.kind, entry.item)} size={18} /></span>
        <span className="log__text">
          <span className="log__primary">{primary(entry)}</span>
          {detail && <span className="log__secondary">{detail}</span>}
          {entry.item.note && <span className="log__note">{entry.item.note}</span>}
        </span>
      </button>
    </li>
  );
}
