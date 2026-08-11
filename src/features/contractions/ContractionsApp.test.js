import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { installLocalStorageMock } from '../../test/localStorageMock';
import ContractionsApp from './ContractionsApp';

const T0 = new Date(2026, 7, 3, 10, 0, 0, 0).getTime();

const seed = (rows) =>
  localStorage.setItem('contraction_tracker_data', JSON.stringify(rows));

const render = () => renderToStaticMarkup(createElement(ContractionsApp));

// Static render only, so these cover the default (graph) tab and the store's
// derived stats. The backup controls live behind the History tab and need an
// interactive renderer to reach, so they are not covered here.
describe('ContractionsApp', () => {
  beforeEach(() => {
    installLocalStorageMock();
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 3600000);
  });

  it('renders with an empty log', () => {
    const html = render();
    expect(html).toContain('Graph');
    expect(html).not.toContain('NaN');
  });

  it('renders derived stats from stored contractions without NaN', () => {
    seed([
      { id: 'c2', startTime: T0 + 600000, endTime: T0 + 660000, duration: 60, intensity: 3, note: '' },
      { id: 'c1', startTime: T0, endTime: T0 + 45000, duration: 45, intensity: 2, note: '' },
    ]);
    const html = render();
    expect(html).toContain('History');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });

  it('survives a log whose records are all identical timestamps', () => {
    seed([{ id: 'c1', startTime: T0, endTime: T0, duration: 0, intensity: null, note: '' }]);
    expect(() => render()).not.toThrow();
    expect(render()).not.toContain('NaN');
  });
});
