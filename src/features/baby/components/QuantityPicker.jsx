import { useState } from 'react';

export function QuantityPicker({ label, value, presets, onChange, onEditPreset, step = 10 }) {
  // While typing, the field holds a raw string so partial input ("" or "6")
  // isn't rounded or clamped mid-keystroke. null means "not editing".
  const [draft, setDraft] = useState(null);

  const handleLongPress = (preset, index) => {
    if (!onEditPreset) return;
    const next = window.prompt(`Preset value in ml`, String(preset));
    const n = Number(next);
    if (Number.isFinite(n) && n > 0) onEditPreset(index, Math.round(n));
  };

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(n) && n >= 0) onChange(Math.round(n));
    setDraft(null);
  };

  const bump = (delta) => {
    setDraft(null);
    onChange(Math.max(0, value + delta));
  };

  return (
    <div className="qty">
      <p className="qty__label">{label}</p>
      {presets && (
        <div className="qty__presets">
          {presets.map((p, i) => (
            <button
              key={p}
              className={`chip ${value === p ? 'chip--active' : ''}`}
              onClick={() => onChange(p)}
              onContextMenu={(e) => { e.preventDefault(); handleLongPress(p, i); }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="qty__stepper">
        <button
          className="qty__step"
          onClick={() => bump(-step)}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="qty__field">
          <input
            className="qty__input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft ?? String(value)}
            aria-label={`${label} in ml`}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
            onFocus={(e) => e.target.select()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
              if (e.key === 'Escape') { setDraft(null); e.target.blur(); }
            }}
          />
          <span className="qty__unit">ml</span>
        </span>
        <button
          className="qty__step"
          onClick={() => bump(step)}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
