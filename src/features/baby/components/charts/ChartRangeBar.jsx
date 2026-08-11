import { CHART_RANGES, MAX_CHART_DAYS } from '../../chartRange';
import { toDateInputValue, fromDateTimeInputs } from '../../../../utils/dates';

// One range control for the whole Charts screen, so every chart below it covers
// the same dates — a doctor reading two charts side by side should not have to
// check whether they span the same period.
export function ChartRangeBar({ range, onChange, now, resolved }) {
  const from = range.from ?? now;
  const to = range.to ?? now;

  const setBound = (which, value) => {
    if (!value) return;
    const ts = fromDateTimeInputs(value, '00:00');
    onChange({
      preset: 'custom',
      from: which === 'from' ? ts : from,
      to: which === 'to' ? ts : to,
    });
  };

  return (
    <div className="chart-range">
      <div className="chip-row" role="group" aria-label="Chart date range">
        {CHART_RANGES.map((r) => (
          <button
            key={r.id}
            className={`chip chip--sm ${range.preset === r.id ? 'chip--active' : ''}`}
            aria-pressed={range.preset === r.id}
            onClick={() => onChange(r.id === 'custom'
              ? { preset: 'custom', from, to }
              : { preset: r.id, from: null, to: null })}
          >
            {r.label}
          </button>
        ))}
      </div>

      {range.preset === 'custom' && (
        <div className="chart-range__dates">
          <label>
            From
            <input
              type="date"
              value={toDateInputValue(from)}
              onChange={(e) => setBound('from', e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={toDateInputValue(to)}
              onChange={(e) => setBound('to', e.target.value)}
            />
          </label>
        </div>
      )}

      {resolved?.clamped && (
        <p className="chart-range__note">
          Showing the most recent {MAX_CHART_DAYS} days of that range.
        </p>
      )}
    </div>
  );
}
