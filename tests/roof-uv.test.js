import { describe, it, expect } from 'vitest';
import { MeshBasicMaterial } from 'three';
import { buildRoof } from '../src/build/roofs.js';

describe('roof UVs', () => {
  it('gives the slopes planar UVs in metres along the ridge and down the slope', () => {
    const g = buildRoof({ rect: [10, 20, 12, 6], ridge: 'x', pitch: 45, material: 'tile', covers: 'e1' }, () => new MeshBasicMaterial());
    const slopes = g.getObjectByName('slopes');
    const uv = slopes.geometry.getAttribute('uv');
    expect(uv).toBeDefined();
    let maxU = 0, maxV = 0;
    for (let i = 0; i < uv.count; i++) { maxU = Math.max(maxU, uv.getX(i)); maxV = Math.max(maxV, uv.getY(i)); }
    expect(maxU).toBeCloseTo(12 + 0.8, 1); // the run plus both eaves
    expect(maxV).toBeGreaterThan(3); // a 45° slope over a 3.4 m half-span is longer than it is high
  });
  it('gives the pyramid UVs too', () => {
    const g = buildRoof({ rect: [0, 0, 6, 6], ridge: 'point', pitch: 45, material: 'tile', covers: 'e4' }, () => new MeshBasicMaterial());
    expect(g.getObjectByName('slopes').geometry.getAttribute('uv')).toBeDefined();
  });
});
