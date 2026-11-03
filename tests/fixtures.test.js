import { describe, it, expect } from 'vitest';
import { Box3, MeshBasicMaterial } from 'three';
import { buildFixture, FIXTURES } from '../src/build/fixtures.js';

const matFor = (name) => { const m = new MeshBasicMaterial(); m.name = name; return m; };
const names = (g) => { const out = []; g.traverse((o) => { if (o.isMesh) out.push(o.name); }); return out; };

describe('fixtures', () => {
  it('lists the stand-ins it can build', () => {
    expect(Object.keys(FIXTURES).sort()).toEqual(['forge', 'hearth', 'stove']);
  });

  it('builds a hearth with a firebox, a mantel and glowing embers, fitting its footprint', () => {
    const g = buildFixture('hearth', { footprint: [1.8, 0.7], height: 1.6 }, matFor);
    const n = names(g);
    expect(n).toContain('mantel');
    expect(n).toContain('embers');
    expect(n).toContain('firebox');
    const box = new Box3().setFromObject(g);
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(1.8 + 0.01);
    expect(box.max.z - box.min.z).toBeLessThanOrEqual(0.7 + 0.01);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(box.max.y).toBeCloseTo(1.6, 1);
    expect(g.getObjectByName('embers').material.name).toBe('ember');
  });

  it('builds a forge as a brick hearth with a bellows and an embers bed', () => {
    const n = names(buildFixture('forge', { footprint: [1.5, 1.2], height: 1.0 }, matFor));
    expect(n).toContain('bellows');
    expect(n).toContain('embers');
  });

  it('builds a stove as a brick block with a fire mouth and a flue', () => {
    const n = names(buildFixture('stove', { footprint: [1.2, 0.8], height: 0.9 }, matFor));
    expect(n).toContain('mouth');
    expect(n).toContain('flue');
  });

  it('returns null for anything it does not know', () => {
    expect(buildFixture('cart', { footprint: [1, 1], height: 1 }, matFor)).toBeNull();
  });
});
