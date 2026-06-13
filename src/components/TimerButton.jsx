import { useState } from 'react';
import { formatDuration } from '../utils/format';

const INTENSITY_LABELS = ['', 'Mild', 'Moderate', 'Strong', 'Very Strong', 'Intense'];
const INTENSITY_COLORS = ['', '#4cffb0', '#ffe44c', '#ffb84c', '#ff8a5a', '#ff5a7c'];

export function TimerButton({ isActive, isPendingStop, pendingStop, elapsed, onStart, onRequestStop, onConfirmStop, onCancelStop }) {
  const [intensity, setIntensity] = useState(null);
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    onConfirmStop({ intensity, note });
    setIntensity(null);
    setNote('');
  };

  const handleSkip = () => {
    onConfirmStop({ intensity: null, note: '' });
    setIntensity(null);
    setNote('');
  };

  const handleCancel = () => {
    onCancelStop();
    setIntensity(null);
    setNote('');
  };

  if (isPendingStop) {
    return (
      <div className="timer-section">
        <div className="intensity-picker">
          <div className="intensity-picker__header">
            <span className="intensity-picker__dur">{formatDuration(pendingStop.duration)}</span>
            <span className="intensity-picker__prompt">How intense was it?</span>
          </div>
          <div className="intensity-picker__scale">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                className={`intensity-btn ${intensity === v ? 'intensity-btn--selected' : ''}`}
                style={intensity === v ? { borderColor: INTENSITY_COLORS[v], color: INTENSITY_COLORS[v] } : {}}
                onClick={() => setIntensity(intensity === v ? null : v)}
                title={INTENSITY_LABELS[v]}
              >
                {v}
              </button>
            ))}
          </div>
          {intensity && (
            <p className="intensity-picker__label" style={{ color: INTENSITY_COLORS[intensity] }}>
              {INTENSITY_LABELS[intensity]}
            </p>
          )}
          <input
            className="intensity-picker__note"
            type="text"
            placeholder="Add a note (optional)"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="intensity-picker__actions">
            <button className="picker-btn picker-btn--cancel" onClick={handleCancel}>
              ↩ Resume
            </button>
            <button className="picker-btn picker-btn--skip" onClick={handleSkip}>
              Skip
            </button>
            <button className="picker-btn picker-btn--save" onClick={handleConfirm}>
              Save
            </button>
          </div>
        </div>
        <p className="timer-hint">Rate this contraction or skip to continue</p>
      </div>
    );
  }

  return (
    <div className="timer-section">
      <div className={`pulse-ring ${isActive ? 'active' : ''}`}>
        <button
          className={`timer-btn ${isActive ? 'timer-btn--stop' : 'timer-btn--start'}`}
          onClick={isActive ? onRequestStop : onStart}
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
