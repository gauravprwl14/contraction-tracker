import { useState } from 'react';
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

// A bottle is an entry, not a session: it never occupies the single active-session
// slot, so it can be logged while a breast feed is running and never blocks one.
// `openedAt` is captured once at mount so the saved feed still records a duration.
export function BottleSheet({ prefs, quantityPresets, setQuantityPresets, onSave, onClose }) {
  const [openedAt] = useState(() => Date.now());
  const [draft, setDraft] = useState(() => ({
    milk: prefs.milk ?? 'formula',
    method: prefs.method ?? 'bottle',
    offeredMl: 60,
    takenMl: 60,
    note: '',
  }));

  const update = (fields) => setDraft((d) => ({ ...d, ...fields }));

  // Changing what was offered carries "taken" with it, unless it was reduced deliberately.
  const setOffered = (offeredMl) =>
    update({
      offeredMl,
      takenMl: draft.takenMl === draft.offeredMl ? offeredMl : Math.min(draft.takenMl, offeredMl),
    });

  const editPreset = (index, val) => {
    const next = [...quantityPresets];
    next[index] = val;
    setQuantityPresets(next.sort((a, b) => a - b));
  };

  const handleSave = () => {
    onSave({
      id: crypto.randomUUID(),
      type: 'external',
      startTime: openedAt,
      endTime: Date.now(),
      milk: draft.milk,
      method: draft.method,
      offeredMl: draft.offeredMl,
      takenMl: draft.takenMl,
      note: draft.note,
    });
    onClose();
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Log a bottle feed">
      <div className="sheet__head">
        <button className="sheet__close" onClick={onClose}>Cancel</button>
        <span className="sheet__title">Bottle feed</span>
        <span />
      </div>

      <div className="sheet__body">
        <ChipRow options={MILKS} selected={draft.milk} onPick={(milk) => update({ milk })} />
        <ChipRow options={METHODS} selected={draft.method} onPick={(method) => update({ method })} />

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
          onChange={(takenMl) => update({ takenMl })}
        />

        <label className="field">
          <span className="field__label">Note</span>
          <input
            className="field__input"
            type="text"
            value={draft.note}
            onChange={(e) => update({ note: e.target.value })}
          />
        </label>
      </div>

      <div className="sheet__foot">
        <button className="sheet__primary" onClick={handleSave}>
          <Icon name="bottle" size={18} /> Save bottle
        </button>
      </div>
    </div>
  );
}
