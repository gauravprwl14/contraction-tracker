import { formatMs } from '../../../utils/format';
import { LONG_FEED_MS } from '../feedLogic';
import { QuantityPicker } from '../components/QuantityPicker';
import { Icon } from '../icons/Icon';

const MILKS = [
  { id: 'expressed', label: 'Expressed' },
  { id: 'formula', label: 'Formula' },
];

const METHODS = [
  { id: 'bottle', label: 'Bottle' },
  { id: 'spoon', label: 'Spoon' },
  { id: 'syringe', label: 'Syringe' },
];

function ChipRow({ options, selected, onPick }) {
  return (
    <div className="chip-row">
      {options.map((o) => (
        <button
          key={o.id}
          className={`chip ${selected === o.id ? 'chip--active' : ''}`}
          onClick={() => onPick(o.id)}
          aria-pressed={selected === o.id}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StaleNotice({ elapsedMs, onEdit, onDiscard }) {
  return (
    <div className="session__notice" role="alert">
      <p>
        This has been running for {formatMs(elapsedMs)}. Check the end time and save it,
        or discard it.
      </p>
      <div className="session__notice-actions">
        <button className="btn btn--sm btn--ghost" onClick={onEdit}>Fix &amp; save</button>
        <button className="btn btn--sm btn--ghost btn--danger" onClick={onDiscard}>Discard</button>
      </div>
    </div>
  );
}

function BreastSession({ feedStore, onSaved }) {
  const {
    active, isPaused, elapsedMs, leftElapsedMs, rightElapsedMs,
    switchTo, stopBreast, discardActive, pauseActive, resumeActive,
  } = feedStore;

  const activeSide = active.activeSide;
  const hasTime = leftElapsedMs + rightElapsedMs > 0;

  // Tapping the other side switches to it. Tapping the current side does
  // nothing while running, and resumes while paused.
  const tapSide = (side) => {
    if (isPaused) resumeActive();
    if (activeSide !== side) switchTo(side);
  };

  const handleStop = () => {
    const feed = stopBreast();
    if (feed) onSaved(feed);
  };

  const handleDiscard = () => {
    if (window.confirm('Discard this feed? The time recorded so far will be lost.')) {
      discardActive();
    }
  };

  const sideBtn = (side, label) => (
    <button
      className={[
        'side-btn',
        activeSide === side && 'side-btn--active',
        activeSide === side && !isPaused && 'side-btn--running',
      ].filter(Boolean).join(' ')}
      onClick={() => tapSide(side)}
      aria-pressed={activeSide === side}
    >
      <span className="side-btn__label">{label}</span>
      <span className="side-btn__time">
        {formatMs(side === 'left' ? leftElapsedMs : rightElapsedMs)}
      </span>
    </button>
  );

  return (
    <>
      <p className="session__timer">{formatMs(elapsedMs)}</p>
      {isPaused && <p className="session__hint">Paused</p>}
      {!isPaused && elapsedMs > LONG_FEED_MS && (
        <p className="session__hint session__hint--warn">
          Still feeding? This has been running over 2 hours.
        </p>
      )}

      <div className="side-row">
        {sideBtn('left', 'Left')}
        {sideBtn('right', 'Right')}
      </div>

      <button className="btn btn--primary" onClick={handleStop} disabled={!hasTime}>
        <Icon name="stop" size={18} /> Stop &amp; save
      </button>

      <div className="session__secondary">
        <button className="btn btn--ghost" onClick={isPaused ? resumeActive : pauseActive}>
          <Icon name={isPaused ? 'play' : 'pause'} size={18} />
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button className="btn btn--ghost btn--danger" onClick={handleDiscard}>
          <Icon name="trash" size={18} /> Discard
        </button>
      </div>
    </>
  );
}

function BottleSession({ feedStore, onSaved }) {
  const {
    active, elapsedMs, updateDraft, saveExternal, discardActive,
    quantityPresets, setQuantityPresets,
  } = feedStore;

  const draft = active.draft;

  // Changing what was offered carries "taken" with it, unless it was reduced deliberately.
  const setOffered = (offeredMl) =>
    updateDraft({
      offeredMl,
      takenMl: draft.takenMl === draft.offeredMl ? offeredMl : Math.min(draft.takenMl, offeredMl),
    });

  const editPreset = (index, val) => {
    const next = [...quantityPresets];
    next[index] = val;
    setQuantityPresets(next.sort((a, b) => a - b));
  };

  const handleSave = () => {
    const feed = saveExternal();
    if (feed) onSaved(feed);
  };

  const handleDiscard = () => {
    if (window.confirm('Discard this bottle feed?')) discardActive();
  };

  return (
    <>
      <p className="session__timer session__timer--sm">{formatMs(elapsedMs)}</p>

      <ChipRow options={MILKS} selected={draft.milk} onPick={(milk) => updateDraft({ milk })} />
      <ChipRow options={METHODS} selected={draft.method} onPick={(method) => updateDraft({ method })} />

      <QuantityPicker
        label="Offered"
        value={draft.offeredMl}
        presets={quantityPresets}
        onChange={setOffered}
        onEditPreset={editPreset}
      />

      <QuantityPicker
        label="Taken"
        value={draft.takenMl}
        onChange={(takenMl) => updateDraft({ takenMl })}
      />

      <button className="btn btn--primary" onClick={handleSave}>Save</button>

      <div className="session__secondary">
        <button className="btn btn--ghost btn--danger" onClick={handleDiscard}>
          <Icon name="trash" size={18} /> Discard
        </button>
      </div>
    </>
  );
}

export function ActiveSessionCard({ feedStore, onSaved, onEditStale }) {
  const { active, staleActive, elapsedMs, isPaused, discardActive } = feedStore;
  if (!active) return null;

  const isBreast = active.type === 'breast';

  return (
    <section className={`session session--${isBreast ? 'breast' : 'bottle'}`} aria-label="Active feed">
      <header className="session__head">
        <span
          className={`session__dot ${isPaused ? 'session__dot--paused' : ''}`}
          aria-hidden="true"
        />
        <Icon name={isBreast ? 'breast' : 'bottle'} size={18} />
        <span className="session__title">{isBreast ? 'Breast feed' : 'Bottle feed'}</span>
      </header>

      {staleActive && (
        <StaleNotice
          elapsedMs={elapsedMs}
          onEdit={() => onEditStale(active)}
          onDiscard={discardActive}
        />
      )}

      {isBreast
        ? <BreastSession feedStore={feedStore} onSaved={onSaved} />
        : <BottleSession feedStore={feedStore} onSaved={onSaved} />}
    </section>
  );
}
