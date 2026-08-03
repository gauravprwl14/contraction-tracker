import { formatMs } from '../../../utils/format';
import { LONG_FEED_MS } from '../feedLogic';

export function BreastFeedSheet({ feedStore, onClose, onSaved }) {
  const {
    active, suggestion, elapsedMs, leftElapsedMs, rightElapsedMs,
    startBreast, switchTo, stopBreast, discardActive,
  } = feedStore;

  const running = active?.type === 'breast';
  const activeSide = running ? active.activeSide : null;
  const hasTime = leftElapsedMs + rightElapsedMs > 0;

  const tapSide = (side) => {
    if (!running) startBreast(side);
    else if (activeSide !== side) switchTo(side);
  };

  const handleStop = () => {
    const feed = stopBreast();
    onClose();
    if (feed) onSaved(feed);
  };

  const handleCancel = () => {
    discardActive();
    onClose();
  };

  const sideBtn = (side, label) => (
    <button
      className={[
        'side-btn',
        activeSide === side && 'side-btn--running',
        !running && suggestion === side && 'side-btn--suggested',
      ].filter(Boolean).join(' ')}
      onClick={() => tapSide(side)}
      aria-pressed={activeSide === side}
    >
      <span className="side-btn__label">{label}</span>
      <span className="side-btn__time">
        {formatMs(side === 'left' ? leftElapsedMs : rightElapsedMs)}
      </span>
      {activeSide === side && <span className="side-btn__dot" aria-label="running" />}
    </button>
  );

  return (
    <div className="sheet" role="dialog" aria-label="Breast feed">
      <div className="sheet__head">
        <button className="sheet__close" onClick={handleCancel}>Cancel</button>
        <span className="sheet__title">Breast feed</span>
        <span />
      </div>

      <p className="sheet__timer">{running ? formatMs(elapsedMs) : '0s'}</p>
      {running && elapsedMs > LONG_FEED_MS && (
        <p className="sheet__warn">Still feeding? This has been running over 2 hours.</p>
      )}
      {!running && (
        <p className="sheet__hint">Tap a side to start. {suggestion === 'left' ? 'Left' : 'Right'} is suggested.</p>
      )}

      <div className="side-row">
        {sideBtn('left', 'Left')}
        {sideBtn('right', 'Right')}
      </div>

      <button className="sheet__primary" onClick={handleStop} disabled={!hasTime}>
        Stop &amp; save
      </button>
    </div>
  );
}
