import { useState } from 'react';
import { formatDuration, formatTime, formatDate } from '../utils/format';

const INTENSITY_LABELS = ['', 'Mild', 'Moderate', 'Strong', 'Very Strong', 'Intense'];
const INTENSITY_COLORS = ['', '#4cffb0', '#4cffb0', '#ffe44c', '#ffb84c', '#ff5a7c'];

function IntensityDot({ value }) {
  if (!value) return <span className="intensity-dot intensity-dot--none">—</span>;
  return (
    <span
      className="intensity-dot"
      style={{ background: INTENSITY_COLORS[value] }}
      title={INTENSITY_LABELS[value]}
    >
      {value}
    </span>
  );
}

export function ContractionList({ contractions, intervals, onDelete, onUpdate }) {
  const [editingNote, setEditingNote] = useState(null); // id of row being edited
  const [noteValue, setNoteValue] = useState('');

  const startEditNote = (c) => {
    setEditingNote(c.id);
    setNoteValue(c.note || '');
  };

  const saveNote = (id) => {
    onUpdate(id, { note: noteValue.trim() });
    setEditingNote(null);
  };

  if (contractions.length === 0) {
    return (
      <div className="list-empty">
        <p>No contractions recorded yet.</p>
        <p className="list-empty__sub">Tap START above when a contraction begins.</p>
      </div>
    );
  }

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
      {contractions.map((c, i) => {
        const gap = intervals[i];
        return (
          <div key={c.id} className={`list-row ${i === 0 ? 'list-row--latest' : ''}`}>
            <span className="list-row__num">{contractions.length - i}</span>
            <span className="list-row__time">
              <span>{formatTime(c.startTime)}</span>
              <span className="list-row__date">{formatDate(c.startTime)}</span>
            </span>
            <span className="list-row__dur">{formatDuration(c.duration)}</span>
            <span className="list-row__gap">
              {gap != null
                ? `${formatDuration(gap)} gap`
                : <span className="list-row__first">first</span>}
            </span>
            <span className="list-row__intensity">
              <IntensityDot value={c.intensity} />
            </span>
            <button
              className="list-row__del"
              onClick={() => onDelete(c.id)}
              title="Remove"
            >
              ×
            </button>
            {/* Note row */}
            <div className="list-row__note-row">
              {editingNote === c.id ? (
                <span className="list-row__note-edit">
                  <input
                    autoFocus
                    value={noteValue}
                    maxLength={120}
                    onChange={(e) => setNoteValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNote(c.id);
                      if (e.key === 'Escape') setEditingNote(null);
                    }}
                  />
                  <button onClick={() => saveNote(c.id)}>✓</button>
                  <button onClick={() => setEditingNote(null)}>✕</button>
                </span>
              ) : (
                <span
                  className="list-row__note"
                  onClick={() => startEditNote(c)}
                  title="Click to edit note"
                >
                  {c.note ? c.note : <span className="list-row__note--empty">+ note</span>}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
