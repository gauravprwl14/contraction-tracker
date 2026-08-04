import { describe, it, expect } from 'vitest';
import { decideStart, sessionLabel } from './sessionGuard';
import { createBreastSession, createExternalSession } from '../feedLogic';

const T0 = new Date(2026, 7, 4, 10, 0, 0, 0).getTime();

describe('decideStart', () => {
  it('starts immediately when nothing is running', () => {
    expect(decideStart(null, 'breast')).toEqual({ action: 'start', type: 'breast' });
    expect(decideStart(null, 'bottle')).toEqual({ action: 'start', type: 'bottle' });
  });

  it('asks for confirmation when a breast feed is running and a bottle is requested', () => {
    const running = createBreastSession('left', T0);
    expect(decideStart(running, 'bottle')).toEqual({
      action: 'confirm', running, requested: 'bottle',
    });
  });

  it('asks for confirmation when a bottle is running and a breast feed is requested', () => {
    const running = createExternalSession(T0);
    expect(decideStart(running, 'breast')).toEqual({
      action: 'confirm', running, requested: 'breast',
    });
  });

  it('asks for confirmation on a same-type restart', () => {
    const running = createBreastSession('left', T0);
    expect(decideStart(running, 'breast').action).toBe('confirm');
  });
});

describe('sessionLabel', () => {
  it('names each session type in human terms', () => {
    expect(sessionLabel(createBreastSession('left', T0))).toBe('breast feed');
    expect(sessionLabel(createExternalSession(T0))).toBe('bottle feed');
    expect(sessionLabel(null)).toBe(null);
  });
});
