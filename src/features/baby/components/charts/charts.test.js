import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntakePerKgChart } from './IntakePerKgChart';
import { GrowthChart } from './GrowthChart';

const at = (y, m, d, h = 0) => new Date(y, m - 1, d, h, 0, 0, 0).getTime();
const NOW = at(2026, 8, 6, 12);

const render = (C, props) => renderToStaticMarkup(createElement(C, props));

const measurement = { id: 'g1', time: at(2026, 8, 1), weightKg: 4, note: '' };
const feed = {
  id: 'f1', type: 'external', startTime: at(2026, 8, 5, 9), endTime: at(2026, 8, 5, 9),
  milk: 'formula', method: 'bottle', offeredMl: 600, takenMl: 600, note: '',
};

describe('IntakePerKgChart', () => {
  it('asks for a weight instead of guessing one', () => {
    const html = render(IntakePerKgChart, { feeds: [feed], measurements: [], now: NOW });
    expect(html).toContain('Log a weight');
    expect(html).not.toContain('NaN');
  });

  it('states the weight it used and when it was measured', () => {
    const html = render(IntakePerKgChart, {
      feeds: [feed], measurements: [measurement], now: NOW,
    });
    expect(html).toContain('4 kg');
    expect(html).toContain('ml/kg/day');
    expect(html).not.toContain('NaN');
  });

  it('renders with a weight but no feeds', () => {
    const html = render(IntakePerKgChart, { feeds: [], measurements: [measurement], now: NOW });
    expect(html).toContain('No feeds recorded');
    expect(html).not.toContain('NaN');
  });
});

describe('GrowthChart', () => {
  it('renders an empty state with no measurements', () => {
    const html = render(GrowthChart, { measurements: [] });
    expect(html).toContain('No weight measurements yet');
    expect(html).not.toContain('NaN');
  });

  it('renders a single reading without collapsing the axis', () => {
    const html = render(GrowthChart, { measurements: [measurement] });
    expect(html).toContain('one reading so far');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });

  it('reports change between the first and last reading', () => {
    const html = render(GrowthChart, {
      measurements: [measurement, { id: 'g2', time: at(2026, 8, 8), weightKg: 4.35, note: '' }],
    });
    expect(html).toContain('+0.35');
    expect(html).not.toContain('NaN');
  });

  it('survives two readings of identical value', () => {
    const html = render(GrowthChart, {
      measurements: [measurement, { id: 'g2', time: at(2026, 8, 8), weightKg: 4, note: '' }],
    });
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });
});
