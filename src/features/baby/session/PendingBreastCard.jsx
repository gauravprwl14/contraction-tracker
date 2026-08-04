import { Icon } from '../icons/Icon';

const SIDES = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
];

// Tapping "Breast" arms a feed but must not start the clock — the side tap
// does that. Starting on the tile tap would silently pick a side for the user.
export function PendingBreastCard({ suggestion, onPick, onCancel }) {
  return (
    <section className="session" aria-label="Start a breast feed">
      <header className="session__head">
        <Icon name="breast" size={18} />
        <span className="session__title">Breast feed</span>
      </header>

      <p className="session__hint">
        Tap a side to start. {suggestion === 'left' ? 'Left' : 'Right'} is suggested.
      </p>

      <div className="side-row">
        {SIDES.map((s) => (
          <button
            key={s.id}
            className={`side-btn ${suggestion === s.id ? 'side-btn--suggested' : ''}`}
            onClick={() => onPick(s.id)}
          >
            <span className="side-btn__label">{s.label}</span>
            <span className="side-btn__time">0s</span>
          </button>
        ))}
      </div>

      <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
    </section>
  );
}
