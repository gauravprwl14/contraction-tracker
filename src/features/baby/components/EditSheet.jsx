import { useState } from 'react';
import {
  toDateInputValue, toTimeInputValue, fromDateTimeInputs,
} from '../../../utils/dates';
import {
  DIAPER_COLORS, DIAPER_CONSISTENCIES, DIAPER_AMOUNTS,
} from '../diaperLogic';
import { MEDICINE_UNITS } from '../medicineLogic';
import { Icon } from '../icons/Icon';

const MILKS = ['expressed', 'formula'];
const METHODS = ['bottle', 'spoon', 'syringe'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function OptionRow({ label, options, value, onChange, allowClear = false }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="chip-row">
        {options.map((o) => (
          <button
            key={o}
            className={`chip ${value === o ? 'chip--active' : ''}`}
            onClick={() => onChange(allowClear && value === o ? undefined : o)}
          >
            {cap(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

const TITLES = {
  feed: 'Edit feed',
  diaper: 'Edit diaper',
  growth: 'Edit measurement',
  medicine: 'Edit medicine',
};

export function EditSheet({ kind, record, onSave, onDelete, onClose, notice }) {
  const isFeed = kind === 'feed';
  const isDiaper = kind === 'diaper';
  const isGrowth = kind === 'growth';
  const isMedicine = kind === 'medicine';
  const baseTime = isFeed ? record.startTime : record.time;

  const [date, setDate] = useState(toDateInputValue(baseTime));
  const [startClock, setStartClock] = useState(toTimeInputValue(baseTime));
  const [endClock, setEndClock] = useState(
    isFeed ? toTimeInputValue(record.endTime) : ''
  );
  const [draft, setDraft] = useState({ ...record });
  const [error, setError] = useState(null);

  const set = (fields) => setDraft((d) => ({ ...d, ...fields }));

  const minutesField = (label, key) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="number"
        min="0"
        inputMode="numeric"
        value={Math.round((draft[key] ?? 0) / 60000)}
        onChange={(e) => set({ [key]: Math.max(0, Number(e.target.value) || 0) * 60000 })}
      />
    </label>
  );

  const numberField = (label, key) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="number"
        min="0"
        inputMode="numeric"
        value={draft[key] ?? 0}
        onChange={(e) => set({ [key]: Math.max(0, Number(e.target.value) || 0) })}
      />
    </label>
  );

  // Growth values are decimal and individually optional, so a blank field must
  // clear back to undefined rather than being coerced to 0.
  const decimalField = (label, key, step) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={draft[key] ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          const n = Number(raw);
          set({ [key]: raw === '' || !Number.isFinite(n) || n <= 0 ? undefined : n });
        }}
      />
    </label>
  );

  const handleSave = () => {
    const startTime = fromDateTimeInputs(date, startClock);
    if (isGrowth
      && draft.weightKg == null && draft.heightCm == null && draft.headCm == null) {
      setError('Enter at least one measurement.');
      return;
    }
    if (isMedicine && !(draft.name ?? '').trim()) {
      setError('Enter the medicine name.');
      return;
    }
    if (!isFeed) {
      onSave({ ...draft, time: startTime });
      onClose();
      return;
    }
    let endTime = fromDateTimeInputs(date, endClock);
    // A feed that ended "before" it started crossed midnight.
    if (endTime < startTime) endTime = endTime + 86400000;
    if (endTime - startTime > 12 * 3600000) {
      setError('That feed would be over 12 hours long. Check the times.');
      return;
    }
    onSave({ ...draft, startTime, endTime });
    onClose();
  };

  return (
    <div className="sheet" role="dialog" aria-label={TITLES[kind]}>
      <div className="sheet__head">
        <button className="sheet__close" onClick={onClose}>Cancel</button>
        <span className="sheet__title">{TITLES[kind]}</span>
        <span />
      </div>

      <div className="sheet__body">
        {notice && <p className="sheet__warn">{notice}</p>}

        <label className="field">
          <span className="field__label">Date</span>
          <input className="field__input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <label className="field">
          <span className="field__label">{isFeed ? 'Start time' : 'Time'}</span>
          <input className="field__input" type="time" value={startClock} onChange={(e) => setStartClock(e.target.value)} />
        </label>

        {isFeed && (
          <label className="field">
            <span className="field__label">End time</span>
            <input className="field__input" type="time" value={endClock} onChange={(e) => setEndClock(e.target.value)} />
          </label>
        )}

        {isFeed && draft.type === 'breast' && (
          <>
            {minutesField('Left (minutes)', 'leftMs')}
            {minutesField('Right (minutes)', 'rightMs')}
            <OptionRow
              label="Last side"
              options={['left', 'right']}
              value={draft.lastSide}
              onChange={(lastSide) => set({ lastSide })}
            />
          </>
        )}

        {isFeed && draft.type === 'external' && (
          <>
            <OptionRow label="Milk" options={MILKS} value={draft.milk} onChange={(milk) => set({ milk })} />
            <OptionRow label="Method" options={METHODS} value={draft.method} onChange={(method) => set({ method })} />
            {numberField('Offered (ml)', 'offeredMl')}
            {numberField('Taken (ml)', 'takenMl')}
          </>
        )}

        {isGrowth && (
          <>
            {decimalField('Weight (kg)', 'weightKg', '0.001')}
            {decimalField('Height (cm)', 'heightCm', '0.1')}
            {decimalField('Head circumference (cm)', 'headCm', '0.1')}
          </>
        )}

        {isMedicine && (
          <>
            <label className="field">
              <span className="field__label">Medicine</span>
              <input
                className="field__input"
                type="text"
                value={draft.name ?? ''}
                onChange={(e) => set({ name: e.target.value })}
              />
            </label>
            {decimalField('Amount', 'amount', '0.1')}
            <OptionRow
              label="Unit"
              options={MEDICINE_UNITS}
              value={draft.unit}
              onChange={(unit) => set({ unit })}
            />
          </>
        )}

        {isDiaper && (
          <>
            <div className="field">
              <span className="field__label">Contents</span>
              <div className="chip-row">
                <button
                  className={`chip ${draft.pee ? 'chip--active' : ''}`}
                  onClick={() => set({ pee: !draft.pee })}
                >
                  <Icon name="pee" size={16} /> Pee
                </button>
                <button
                  className={`chip ${draft.poop ? 'chip--active' : ''}`}
                  onClick={() => set({ poop: !draft.poop })}
                >
                  <Icon name="poop" size={16} /> Poop
                </button>
              </div>
            </div>
            {draft.poop && (
              <>
                <OptionRow label="Colour" options={DIAPER_COLORS} value={draft.color} onChange={(color) => set({ color })} allowClear />
                <OptionRow label="Consistency" options={DIAPER_CONSISTENCIES} value={draft.consistency} onChange={(consistency) => set({ consistency })} allowClear />
                <OptionRow label="Amount" options={DIAPER_AMOUNTS} value={draft.amount} onChange={(amount) => set({ amount })} allowClear />
              </>
            )}
          </>
        )}

        <label className="field">
          <span className="field__label">Note</span>
          <input
            className="field__input"
            type="text"
            value={draft.note ?? ''}
            onChange={(e) => set({ note: e.target.value })}
          />
        </label>

        {error && <p className="sheet__warn">{error}</p>}
      </div>

      <div className="sheet__foot">
        <button className="sheet__danger" onClick={() => { onDelete(record.id); onClose(); }}>
          Delete
        </button>
        <button className="sheet__primary" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
