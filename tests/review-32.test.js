import { describe, it, expect, afterEach } from 'vitest';
import { Box3 } from 'three';
import { outerSide, openingTrim, plinthPieces } from '../src/build/geometry.js';
import { buildWall } from '../src/build/walls.js';
import { materialFor } from '../src/materials.js';
import { setWallFloor, floorOcclusion } from '../src/build/ao.js';

const matFor = (n, l) => materialFor(n, l);
const named = (g, name) => { const out = []; g.traverse((o) => { if (o.name === name) out.push(o); }); return out; };

describe('outerSide', () => {
  const room = [[0, 0], [6, 0], [6, 4], [0, 4]];
  it('is the side with no room on it', () => {
    // Wall along the room's north edge, a→b eastwards: the room lies at +z (south), outside is -z.
    expect(outerSide({ a: [0, 0], b: [6, 0] }, [room])).toBe(-1);
    // Same wall drawn westwards: outside is now +z.
    expect(outerSide({ a: [6, 0], b: [0, 0] }, [room])).toBe(1);
  });
  it('defaults to +1 for a partition between two rooms or a wall with no rooms', () => {
    const other = [[0, 4], [6, 4], [6, 8], [0, 8]];
    expect(outerSide({ a: [0, 4], b: [6, 4] }, [room, other])).toBe(1);
    expect(outerSide({ a: [0, 4], b: [6, 4] }, [])).toBe(1);
  });
});

describe('plinthPieces', () => {
  it('leaves the doorways open', () => {
    const pieces = plinthPieces(6, [{ x0: 2, x1: 3, y0: 0, y1: 2.1 }, { x0: 4, x1: 4.8, y0: 0.9, y1: 2 }]);
    expect(pieces).toEqual([{ x0: 0, x1: 2 }, { x0: 3, x1: 6 }]); // the window does not cut it
  });
});

describe('openingTrim clamps to the wall', () => {
  it('never extends past the wall ends', () => {
    for (const kind of ['window', 'door', 'arch']) {
      const parts = openingTrim(kind, { x0: 0, x1: 1, y0: 0, y1: 2 }, 0.5, 6);
      for (const p of parts) {
        expect(p.x - p.w / 2).toBeGreaterThanOrEqual(-1e-9);
        expect(p.x + p.w / 2).toBeLessThanOrEqual(6 + 1e-9);
      }
    }
  });
});

describe('buildWall sides and plinth', () => {
  it('puts the sill on the outer side given by the rooms', () => {
    const rooms = [[[0, 0], [6, 0], [6, 4], [0, 4]]];
    const g = buildWall({ id: 'w', a: [0, 0], b: [6, 0], material: 'stone' }, [{ at: 3, width: 0.8, kind: 'window' }], { id: 'side-test', height: 3 }, matFor, { rooms });
    const sill = new Box3().setFromObject(named(g, 'sill')[0]);
    expect((sill.min.z + sill.max.z) / 2).toBeLessThan(0); // north of the wall, away from the room
  });
  it('breaks the plinth at doors', () => {
    const g = buildWall({ id: 'w', a: [0, 0], b: [6, 0], material: 'stone' }, [{ at: 2.5, width: 1, kind: 'door' }], { id: 'rdc', height: 3 }, matFor);
    const plinths = named(g, 'plinth').map((p) => new Box3().setFromObject(p));
    expect(plinths).toHaveLength(2);
    for (const b of plinths) expect(b.min.x >= 2.99 || b.max.x <= 2.01).toBe(true);
  });
});

describe('setWallFloor', () => {
  afterEach(() => setWallFloor(0.55));
  it('treats an empty or non-numeric value as the default', () => {
    expect(setWallFloor('')).toBe(0.55);
    expect(setWallFloor('abc')).toBe(0.55);
    expect(setWallFloor(undefined)).toBe(0.55);
    expect(setWallFloor('0.3')).toBe(0.3);
  });
});
