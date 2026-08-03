import { describe, it, expect, beforeEach } from 'vitest';
import { installLocalStorageMock } from '../test/localStorageMock';
import { loadItems, saveItems, loadValue, saveValue } from './storage';

describe('storage', () => {
  beforeEach(() => installLocalStorageMock());

  it('returns an empty array when the key is missing', () => {
    expect(loadItems('nope')).toEqual([]);
  });

  it('round-trips items', () => {
    const items = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];
    saveItems('k', items);
    expect(loadItems('k')).toEqual(items);
  });

  it('writes a versioned envelope', () => {
    saveItems('k', [{ id: 'a' }]);
    expect(JSON.parse(localStorage.getItem('k'))).toEqual({
      version: 1,
      items: [{ id: 'a' }],
    });
  });

  it('returns an empty array for corrupt JSON', () => {
    localStorage.setItem('k', '{not json');
    expect(loadItems('k')).toEqual([]);
  });

  it('backs up corrupt data instead of discarding it', () => {
    localStorage.setItem('k', '{not json');
    loadItems('k');
    expect(localStorage.getItem('k__corrupt_backup')).toBe('{not json');
  });

  it('reads a bare legacy array', () => {
    localStorage.setItem('k', JSON.stringify([{ id: 'a' }]));
    expect(loadItems('k')).toEqual([{ id: 'a' }]);
  });

  it('returns an empty array when items is not an array', () => {
    localStorage.setItem('k', JSON.stringify({ version: 1, items: 'oops' }));
    expect(loadItems('k')).toEqual([]);
  });

  it('round-trips a plain value', () => {
    saveValue('v', { a: 1 });
    expect(loadValue('v', null)).toEqual({ a: 1 });
  });

  it('returns the fallback for a missing or corrupt value', () => {
    expect(loadValue('v', 'fb')).toBe('fb');
    localStorage.setItem('v', '{bad');
    expect(loadValue('v', 'fb')).toBe('fb');
  });
});
