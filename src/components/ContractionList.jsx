import React, { useState, useCallback } from 'react';
import { formatDuration, formatTime, formatDate } from '../utils/format';

const PAGE_SIZE = 30;

const INTENSITY_COLORS = {
  1: '#4cffb0',
  2: '#4cffb0',
  3: '#ffe44c',
  4: '#ffb84c',
  5: '#ff5a7c',
};

const ContractionRow = React.memo(function ContractionRow({
  c,
  index,
  total,
  gap,
  isLatest,
  onDelete,
  onUpdate,
}) {
  const [editing, setEditing] = useState(false);
  const [noteValue, setNoteValue] = useState('');

  const startEdit = useCallback(() => {
    setNoteValue(c.note || '');
    setEditing(true);
  }, [c.note]);

  const saveNote = useCallback(() => {
    onUpdate(c.id, { note: noteValue.trim() });
    setEditing(false);
  }, [c.id, noteValue, onUpdate]);

  const cancelEdit = useCallback(() => setEditing(false), []);

  const handleIntensityChange = useCallback(
    (e) => {
      const val = e.target.value;
      onUpdate(c.id, { intensity: val ? Number(val) : null });
    },
    [c.id, onUpdate]
  );

  const selectColor = c.intensity ? INTENSITY_COLORS[c.intensity] : '#888898';

  return (
    <div className={`list-row${isLatest ? ' list-row--latest' : ''}`}>
      <span className="list-row__num">{total - index}</span>
      <span className="list-row__time">
        <span>{formatTime(c.startTime)}</span>
        <span className="list-row__date">{formatDate(c.startTime)}</span>
      </span>
      <span className="list-row__dur">{formatDuration(c.duration)}</span>
      <span className="list-row__gap">
        {gap != null ? (
          `${formatDuration(gap)} gap`
        ) : (
          <span className="list-row__first">first</span>
        )}
      </span>
      <span>
        <select
          className={`intensity-select${c.intensity ? ' intensity-select--rated' : ''}`}
          value={c.intensity ?? ''}
          onChange={handleIntensityChange}
          style={{ color: selectColor }}
        >
          <option value="">-- rate --</option>
          <option value="1">1 · Mild</option>
          <option value="2">2 · Moderate</option>
          <option value="3">3 · Strong</option>
          <option value="4">4 · Very Strong</option>
          <option value="5">5 · Intense</option>
        </select>
      </span>
      <button
        className="list-row__del"
        onClick={() => onDelete(c.id)}
        title="Remove"
      >
        ×
      </button>
      <div className="list-row__note-row">
        {editing ? (
          <span className="list-row__note-edit">
            <input
              autoFocus
              value={noteValue}
              maxLength={120}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNote();
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            <button onClick={saveNote}>✓</button>
            <button onClick={cancelEdit}>✕</button>
          </span>
        ) : (
          <span
            className="list-row__note"
            onClick={startEdit}
            title="Click to edit note"
          >
            {c.note ? c.note : <span className="list-row__note--empty">+ note</span>}
          </span>
        )}
      </div>
    </div>
  );
});

export function ContractionList({ contractions, intervals, onDelete, onUpdate }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (contractions.length === 0) {
    return (
      <div className="list-empty">
        <p>No contractions recorded yet.</p>
        <p className="list-empty__sub">Tap START above when a contraction begins.</p>
      </div>
    );
  }

  const shown = contractions.slice(0, visible);
  const remaining = contractions.length - visible;

  return (
    <div className="contraction-list">
      <div className="list-header">
        <span>#</span>
        <span>Time</span>
        <span>Duration</span>
        <span>Gap before</span>
        <span>Intensity</span>
        <span></span>
      </div>
      {shown.map((c, i) => (
        <ContractionRow
          key={c.id}
          c={c}
          index={i}
          total={contractions.length}
          gap={intervals[i]}
          isLatest={i === 0}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
      {remaining > 0 && (
        <>
          <div className="list-count-badge">
            Showing {shown.length} of {contractions.length}
          </div>
          <div className="list-show-more">
            <button
              className="list-show-more-btn"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            >
              Show {Math.min(remaining, PAGE_SIZE)} more
            </button>
          </div>
        </>
      )}
    </div>
  );
}
