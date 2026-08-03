export function QuantityPicker({ label, value, presets, onChange, onEditPreset, step = 10 }) {
  const handleLongPress = (preset, index) => {
    if (!onEditPreset) return;
    const next = window.prompt(`Preset value in ml`, String(preset));
    const n = Number(next);
    if (Number.isFinite(n) && n > 0) onEditPreset(index, Math.round(n));
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
          onClick={() => onChange(Math.max(0, value - step))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="qty__value">{value} ml</span>
        <button
          className="qty__step"
          onClick={() => onChange(value + step)}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
