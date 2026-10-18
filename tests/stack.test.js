import { describe, it, expect } from 'vitest';
import { visibleSet, stepLevel } from '../src/stack.js';

describe('visibleSet', () => {
  it('shows a level and everything below it', () => {
    expect([...visibleSet('e1').levels].sort()).toEqual(['e1', 'rdc', 'silo1', 'silo2']);
  });

  it('shows a roof only once the storey it covers is below the selection', () => {
    expect(visibleSet('e1').roofsCovering.has('rdc')).toBe(true);
    expect(visibleSet('rdc').roofsCovering.has('rdc')).toBe(false);
    expect(visibleSet('e3').roofsCovering.has('e3')).toBe(false);
  });

  it('shows everything on toits', () => {
    const v = visibleSet('toits');
    expect(v.levels.size).toBe(8);
    expect([...v.roofsCovering].sort()).toEqual(['e1', 'e2', 'e3', 'e4', 'rdc', 'silo1', 'silo2']);
  });
});

describe('stepLevel', () => {
  it('moves one level at a time and stops at the ends', () => {
    expect(stepLevel('rdc', 1)).toBe('e1');
    expect(stepLevel('rdc', -1)).toBe('silo1');
    expect(stepLevel('toits', 1)).toBe('toits');
    expect(stepLevel('silo2', -1)).toBe('silo2');
  });
});
