// Every level file present must pass the schema, so a hand edit never reaches the app half-broken.
import { describe, it, expect } from 'vitest';
import { loadLevels } from '../src/data/levels.js';
import { validateLevel } from '../src/data/schema.js';
import { wallLength } from '../src/build/geometry.js';

describe('level data files', async () => {
  const levels = await loadLevels();

  it('has at least the ground floor', () => {
    expect(levels.has('rdc')).toBe(true);
  });

  for (const [id, level] of levels) {
    it(`${id}.json passes the schema`, () => {
      expect(validateLevel(level)).toEqual([]);
    });

    it(`${id}.json keeps every opening inside its wall`, () => {
      const byId = new Map(level.walls.map((w) => [w.id, w]));
      for (const o of level.openings) {
        const L = wallLength(byId.get(o.wall));
        expect(o.at - o.width / 2, `${id} ${o.wall} ${o.kind} at ${o.at}`).toBeGreaterThanOrEqual(-0.01);
        expect(o.at + o.width / 2, `${id} ${o.wall} ${o.kind} at ${o.at}`).toBeLessThanOrEqual(L + 0.01);
      }
    });
  }
});
