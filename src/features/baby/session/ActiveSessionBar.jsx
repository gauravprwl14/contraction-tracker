import { formatMs } from '../../../utils/format';
import { Icon } from '../icons/Icon';

export function ActiveSessionBar({ feedStore, onOpen }) {
  const { active, isPaused, elapsedMs } = feedStore;
  if (!active) return null;

  const isBreast = active.type === 'breast';

  return (
    <button className="session-bar" onClick={onOpen}>
      <span
        className={`session__dot ${isPaused ? 'session__dot--paused' : ''}`}
        aria-hidden="true"
      />
      <Icon name={isBreast ? 'breast' : 'bottle'} size={18} />
      <span className="session-bar__label">
        {isBreast ? 'Breast feed' : 'Bottle feed'}{isPaused ? ' · paused' : ''}
      </span>
      <span className="session-bar__time">{formatMs(elapsedMs)}</span>
      <Icon name="chevron-up" size={18} />
    </button>
  );
}
