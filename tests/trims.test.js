import { describe, it, expect } from 'vitest';
import { openingTrim, plinthFor, FRAME_T, SILL_OUT, PLINTH_H } from '../src/build/geometry.js';
import { buildWall } from '../src/build/walls.js';
import { materialFor } from '../src/materials.js';

const matFor = (name, level) => materialFor(name, level);
const names = (group) => { const out = []; group.traverse((o) => { if (o.name) out.push(o.name); }); return out; };

describe('openingTrim', () => {
  const hole = { x0: 2, x1: 3.2, y0: 0.9, y1: 2.0 };

  it('frames a window on both faces with a sill outside and a mullion inside the pane', () => {
    const parts = openingTrim('window', hole, 0.5);
    const by = Object.fromEntries(parts.map((p) => [p.name, p]));
    expect(by.frame).toBeDefined();
    expect(by.sill).toBeDefined();
    expect(by.mullion).toBeDefined();
    expect(by.frame.d).toBeGreaterThan(0.5); // sticks out of the wall on both faces
    expect(by.sill.w).toBeGreaterThan(1.2); // wider than the hole
    expect(by.sill.y).toBeLessThan(0.9); // just under the hole
    expect(by.sill.z).toBeGreaterThan(0); // outer face only
    expect(by.mullion.x).toBeCloseTo(2.6, 5); // centred in the hole
  });

  it('gives a door a lintel, a threshold and two jambs', () => {
    const parts = openingTrim('door', { x0: 2, x1: 3.0, y0: 0, y1: 2.1 }, 0.5);
    const kinds = parts.map((p) => p.name);
    expect(kinds.filter((k) => k === 'jamb')).toHaveLength(2);
    expect(kinds).toContain('lintel');
    expect(kinds).toContain('threshold');
    const lintel = parts.find((p) => p.name === 'lintel');
    expect(lintel.y).toBeGreaterThan(2.1);
    expect(lintel.w).toBeGreaterThan(1.0);
  });

  it('leaves trapdoors and arches without trim other than a lintel', () => {
    expect(openingTrim('trapdoor', hole, 0.5)).toEqual([]);
    expect(openingTrim('arch', { x0: 0, x1: 3, y0: 0, y1: 2.4 }, 0.6).map((p) => p.name)).toEqual(['lintel']);
  });
});

describe('plinthFor', () => {
  it('gives ground-floor stone and enclosure walls a protruding base band', () => {
    expect(plinthFor({ material: 'stone' }, 'rdc')).toEqual({ h: PLINTH_H, out: 0.08 });
    expect(plinthFor({ material: 'enclosure' }, 'rdc')).toEqual({ h: PLINTH_H, out: 0.08 });
  });
  it('gives nothing to partitions, timber or upper floors', () => {
    expect(plinthFor({ material: 'partition' }, 'rdc')).toBeNull();
    expect(plinthFor({ material: 'timber' }, 'rdc')).toBeNull();
    expect(plinthFor({ material: 'stone' }, 'e1')).toBeNull();
  });
});

describe('buildWall with trims', () => {
  it('adds the trim pieces around each opening and a plinth on the ground floor', () => {
    const wall = { id: 'w1', a: [0, 0], b: [6, 0], material: 'stone' };
    const openings = [{ at: 2, width: 1.0, kind: 'door' }, { at: 4.5, width: 0.8, kind: 'window', glow: true }];
    const group = buildWall(wall, openings, { id: 'rdc', height: 3 }, matFor);
    const n = names(group);
    expect(n).toContain('frame');
    expect(n).toContain('sill');
    expect(n).toContain('mullion');
    expect(n).toContain('lintel');
    expect(n).toContain('threshold');
    expect(n).toContain('plinth');
    const plinth = group.getObjectByName('plinth');
    expect(plinth.material).toBe(materialFor('plinth', 'rdc'));
  });

  it('uses the window frame material, not the wall material, for frames', () => {
    const group = buildWall({ id: 'w1', a: [0, 0], b: [6, 0], material: 'stone' }, [{ at: 3, width: 0.8, kind: 'window' }], { id: 'e1', height: 3 }, matFor);
    expect(group.getObjectByName('frame').material).toBe(materialFor('timber', 'e1'));
    expect(group.getObjectByName('sill').material).toBe(materialFor('stone', 'e1'));
  });
});

describe('constants', () => {
  it('fixes the trim sizes', () => {
    expect(FRAME_T).toBe(0.1);
    expect(SILL_OUT).toBe(0.12);
    expect(PLINTH_H).toBe(0.45);
  });
});
