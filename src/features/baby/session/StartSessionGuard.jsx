import { formatMs } from '../../../utils/format';
import { sessionLabel } from './sessionGuard';

const NAMES = { breast: 'breast feed', bottle: 'bottle feed' };

export function StartSessionGuard({
  running, requested, elapsedMs, onSaveAndStart, onDiscardAndStart, onCancel,
}) {
  const runningName = sessionLabel(running);
  const nextName = NAMES[requested];

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="A feed is already running">
      <div className="modal__panel">
        <h2 className="modal__title">A {runningName} is already running</h2>
        <p className="modal__body">
          It has been going for {formatMs(elapsedMs)}. Only one feed can run at a time —
          what should happen to it before the {nextName} starts?
        </p>
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onSaveAndStart}>
            Save it &amp; start {nextName}
          </button>
          <button className="btn btn--ghost btn--danger" onClick={onDiscardAndStart}>
            Discard it &amp; start {nextName}
          </button>
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
