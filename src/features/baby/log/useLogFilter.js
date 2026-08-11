import { useState, useCallback } from 'react';
import { DEFAULT_FILTER, isDefaultFilter } from './logFilter';

export function useLogFilter() {
  const [filter, setFilter] = useState(DEFAULT_FILTER);

  const patch = useCallback((fields) => setFilter((f) => ({ ...f, ...fields })), []);

  const setRange = useCallback((range) => patch({ range }), [patch]);
  const setSide = useCallback((side) => patch({ side }), [patch]);
  const setMilk = useCallback((milk) => patch({ milk }), [patch]);
  const setBand = useCallback((band) => patch({ band }), [patch]);
  const setQuery = useCallback((q) => patch({ q }), [patch]);
  const clear = useCallback(() => setFilter(DEFAULT_FILTER), []);

  // Deselecting a parent type resets its drill-down so a hidden control can't
  // silently keep filtering.
  const toggleType = useCallback((type) => {
    setFilter((f) => {
      const on = f.types.includes(type);
      const types = on ? f.types.filter((t) => t !== type) : [...f.types, type];
      return {
        ...f,
        types,
        side: type === 'breast' && on ? 'any' : f.side,
        milk: type === 'bottle' && on ? 'any' : f.milk,
      };
    });
  }, []);

  return {
    filter, setRange, toggleType, setSide, setMilk, setBand, setQuery, clear,
    isDefault: isDefaultFilter(filter),
  };
}
