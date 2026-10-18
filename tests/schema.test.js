import { describe, it, expect } from 'vitest';
import { validateLevel } from '../src/data/schema.js';
import { LEVELS, levelIndex } from '../src/data/levels.js';

const minimal = () => ({
  id: 'rdc',
  walls: [{ id: 'w1', a: [0, 0], b: [6, 0], material: 'stone' }],
  openings: [{ wall: 'w1', at: 3, width: 1.2, kind: 'door' }],
  floors: [{ polygon: [[0, 0], [6, 0], [6, 4], [0, 4]], material: 'dirt' }],
  stairs: [],
  rooms: [{ number: 8, name: 'Cellier', polygon: [[0, 0], [6, 0], [6, 4], [0, 4]] }],
  props: [{ asset: 'barrel', x: 1, z: 1, rot: 0 }],
  lights: [{ x: 1, y: 1.5, z: 1, kind: 'lantern' }],
  roofs: [],
});

describe('validateLevel', () => {
  it('accepts a minimal valid level', () => {
    expect(validateLevel(minimal())).toEqual([]);
  });

  it('names the wall when an endpoint is missing', () => {
    const level = minimal();
    delete level.walls[0].b;
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('w1'))).toBe(true);
  });

  it('rejects an opening on an unknown wall', () => {
    const level = minimal();
    level.openings[0].wall = 'w99';
    const errors = validateLevel(level);
    expect(errors.some((e) => e.includes('w99'))).toBe(true);
  });

  it('rejects an unknown level id', () => {
    const level = minimal();
    level.id = 'attic';
    expect(validateLevel(level).length).toBeGreaterThan(0);
  });
});

describe('LEVELS', () => {
  it('lists the eight levels bottom to top with the spec elevations', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['silo2', 'silo1', 'rdc', 'e1', 'e2', 'e3', 'e4', 'toits']);
    expect(LEVELS.map((l) => l.elevation)).toEqual([-10, -5, 0, 3, 6, 8.6, 11.2, 13.8]);
    expect(LEVELS.map((l) => l.height)).toEqual([5, 5, 3, 3, 2.6, 2.6, 2.6, 0]);
    expect(LEVELS.map((l) => l.label)).toEqual(['Silo -2', 'Silo -1', 'RdC', '1er', '2e', '3e', '4e', 'Toits']);
  });

  it('indexes levels by id', () => {
    expect(levelIndex('rdc')).toBe(2);
    expect(levelIndex('toits')).toBe(7);
    expect(levelIndex('nope')).toBe(-1);
  });
});
