import { QuantityPicker } from './QuantityPicker';
import { formatMs } from '../../../utils/format';

const MILKS = [
  { id: 'expressed', label: 'Expressed' },
  { id: 'formula', label: 'Formula' },
];

const METHODS = [
  { id: 'bottle', label: 'Bottle' },
  { id: 'spoon', label: 'Spoon' },
  { id: 'syringe', label: 'Syringe' },
];

export function ExternalFeedSheet({ feedStore, onClose, onSaved }) {
  const {
    active, elapsedMs, updateDraft, saveExternal, discardActive,
    quantityPresets, setQuantityPresets,
  } = feedStore;

  if (!active || active.type !== 'external') return null;
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
    onClose();
    if (feed) onSaved(feed);
  };

  const handleCancel = () => {
    discardActive();
    onClose();
  };

  const chipRow = (options, selected, onPick) => (
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

  return (
    <div className="sheet" role="dialog" aria-label="Bottle feed">
      <div className="sheet__head">
        <button className="sheet__close" onClick={handleCancel}>Cancel</button>
        <span className="sheet__title">Bottle feed</span>
        <span className="sheet__elapsed">{formatMs(elapsedMs)}</span>
      </div>

      {chipRow(MILKS, draft.milk, (milk) => updateDraft({ milk }))}
      {chipRow(METHODS, draft.method, (method) => updateDraft({ method }))}

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

      <button className="sheet__primary" onClick={handleSave}>Save</button>
    </div>
  );
}
