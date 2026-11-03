import { describe, it, expect } from 'vitest';
import { MeshBasicMaterial, Box3 } from 'three';
import { buildRoof, RIDGE_T, FASCIA_H } from '../src/build/roofs.js';
import { buildChimney } from '../src/build/chimney.js';

const matFor = () => new MeshBasicMaterial();
const named = (group, name) => { const out = []; group.traverse((o) => { if (o.name === name) out.push(o); }); return out; };

describe('gable roof trim', () => {
  const roof = { rect: [10, 20, 12, 6], ridge: 'x', pitch: 45, material: 'tile', covers: 'e1' };
  it('returns a group with the slopes, a ridge cap along the ridge and a fascia under each eave', () => {
    const g = buildRoof(roof, matFor);
    expect(g.isGroup).toBe(true);
    expect(named(g, 'ridge')).toHaveLength(1);
    expect(named(g, 'fascia')).toHaveLength(2);
    const ridge = named(g, 'ridge')[0];
    const box = new Box3().setFromObject(ridge);
    expect(box.max.x - box.min.x).toBeCloseTo(12 + 0.8 + 2 * RIDGE_T, 1); // runs the full length plus the eaves
    expect(box.max.y).toBeGreaterThan(3); // sits on the ridge line
    const fascia = named(g, 'fascia')[0];
    const fb = new Box3().setFromObject(fascia);
    expect(fb.max.y - fb.min.y).toBeCloseTo(FASCIA_H, 5);
  });
  it('keeps the slopes as one mesh with the same vertex count as before', () => {
    const g = buildRoof(roof, matFor);
    const slopes = named(g, 'slopes')[0];
    expect(slopes.geometry.getAttribute('position').count).toBe(14);
  });
  it('gives a pyramid four hips and no fascia', () => {
    const g = buildRoof({ rect: [0, 0, 6, 6], ridge: 'point', pitch: 45, material: 'tile', covers: 'e4' }, matFor);
    expect(named(g, 'hip')).toHaveLength(4);
    expect(named(g, 'fascia')).toHaveLength(0);
  });
});

describe('chimney', () => {
  it('is a stack with a wider cap and a dark flue hole, standing from base to top', () => {
    const g = buildChimney({ x: 5, z: 7, base: -2.2, top: 1.5, w: 0.6 }, matFor);
    const box = new Box3().setFromObject(g);
    expect(box.min.y).toBeCloseTo(-2.2, 5);
    expect(box.max.y).toBeGreaterThan(1.5);
    expect(named(g, 'cap')).toHaveLength(1);
    const cap = new Box3().setFromObject(named(g, 'cap')[0]);
    expect(cap.max.x - cap.min.x).toBeGreaterThan(0.6);
    expect(named(g, 'flue')).toHaveLength(1);
  });
});
