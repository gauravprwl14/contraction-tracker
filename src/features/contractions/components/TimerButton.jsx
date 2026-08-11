import { formatDuration } from '../../../utils/format';

export function TimerButton({ isActive, elapsed, onStart, onStop }) {
  return (
    <div className="timer-section">
      <div className={`pulse-ring ${isActive ? 'active' : ''}`}>
        <button
          className={`timer-btn ${isActive ? 'timer-btn--stop' : 'timer-btn--start'}`}
          onClick={isActive ? onStop : onStart}
        >
          <span className="timer-btn__label">{isActive ? 'STOP' : 'START'}</span>
          {isActive && (
            <span className="timer-btn__elapsed">{formatDuration(elapsed)}</span>
          )}
        </button>
      </div>
      <p className="timer-hint">
        {isActive ? 'Tap STOP when contraction ends' : 'Tap START when contraction begins'}
      </p>
    </div>
  );
}
