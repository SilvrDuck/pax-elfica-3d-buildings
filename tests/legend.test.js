// Acceptance gate for the tracing tasks: every numbered room of the rulebook legend exists once.
import { describe, it, expect } from 'vitest';
import { LEGEND } from '../src/data/legend.js';
import { loadLevels } from '../src/data/levels.js';

describe('rulebook legend coverage', () => {
  it('places every legend number in exactly one level', async () => {
    const levels = await loadLevels();
    const where = new Map();
    for (const [id, level] of levels) {
      for (const room of level.rooms) where.set(room.number, [...(where.get(room.number) || []), id]);
    }
    const missing = Object.keys(LEGEND).map(Number).filter((n) => !where.has(n));
    const duplicated = [...where.entries()].filter(([, ids]) => ids.length > 1).map(([n]) => n);
    const unknown = [...where.keys()].filter((n) => !(n in LEGEND));
    expect(missing, 'missing').toEqual([]);
    expect(duplicated, 'duplicated').toEqual([]);
    expect(unknown, 'unknown').toEqual([]);
  });

  it('names 39 rooms (1–40 without 17, the sword wall)', () => {
    expect(Object.keys(LEGEND)).toHaveLength(39);
    expect(LEGEND[17]).toBeUndefined();
    expect(LEGEND[16]).toBe('Salle commune');
  });
});
