import { useState } from 'react';
import { RANGE_PRESETS } from './logFilter';
import { toDateInputValue, fromDateTimeInputs } from '../../../utils/dates';
import { Icon } from '../icons/Icon';

const TYPES = [
  { id: 'breast', label: 'Breast' },
  { id: 'bottle', label: 'Bottle' },
  { id: 'pee', label: 'Pee' },
  { id: 'poop', label: 'Poop' },
];

const SIDES = [
  { id: 'any', label: 'Both sides' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
];

const MILKS = [
  { id: 'any', label: 'Any milk' },
  { id: 'expressed', label: 'Expressed' },
  { id: 'formula', label: 'Formula' },
];

const BANDS = [
  { id: 'any', label: 'All hours' },
  { id: 'night', label: 'Night 22–06' },
  { id: 'day', label: 'Day 06–22' },
];

function Chips({ options, isOn, onPick, label }) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          className={`chip ${isOn(o.id) ? 'chip--active' : ''}`}
          aria-pressed={isOn(o.id)}
          onClick={() => onPick(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LogFilterBar({ state, count, now }) {
  const {
    filter, setRange, toggleType, setSide, setMilk, setBand, setQuery, clear, isDefault,
  } = state;
  const [open, setOpen] = useState(false);

  const customFrom = filter.range.from ?? now;
  const customTo = filter.range.to ?? now;

  const setCustom = (which, value) => {
    if (!value) return;
    const ts = fromDateTimeInputs(value, '00:00');
    setRange({
      preset: 'custom',
      from: which === 'from' ? ts : customFrom,
      to: which === 'to' ? ts : customTo,
    });
  };

  return (
    <div className="filters">
      <Chips
        label="Record type"
        options={TYPES}
        isOn={(id) => filter.types.includes(id)}
        onPick={toggleType}
      />

      {filter.types.includes('breast') && (
        <Chips label="Side" options={SIDES} isOn={(id) => filter.side === id} onPick={setSide} />
      )}
      {filter.types.includes('bottle') && (
        <Chips label="Milk" options={MILKS} isOn={(id) => filter.milk === id} onPick={setMilk} />
      )}

      <button className="filters__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="filter" size={18} />
        More filters
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} />
      </button>

      {open && (
        <div className="filters__more">
          <Chips
            label="Date range"
            options={RANGE_PRESETS}
            isOn={(id) => filter.range.preset === id}
            onPick={(preset) => setRange(preset === 'custom'
              ? { preset, from: customFrom, to: customTo }
              : { preset, from: null, to: null })}
          />

          {filter.range.preset === 'custom' && (
            <div className="filters__dates">
              <label>
                From
                <input
                  type="date"
                  value={toDateInputValue(customFrom)}
                  onChange={(e) => setCustom('from', e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={toDateInputValue(customTo)}
                  onChange={(e) => setCustom('to', e.target.value)}
                />
              </label>
            </div>
          )}

          <Chips label="Time of day" options={BANDS} isOn={(id) => filter.band === id} onPick={setBand} />

          <label className="filters__search">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search notes"
              value={filter.q}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      )}

      {!isDefault && (
        <div className="filters__summary">
          <span>{count} {count === 1 ? 'record' : 'records'}</span>
          <button className="action--link" onClick={clear}>Clear filters</button>
        </div>
      )}
    </div>
  );
}
