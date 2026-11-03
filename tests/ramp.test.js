import { describe, it, expect } from 'vitest';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { mergeLevelGroup } from '../src/build/merge.js';
import { materialFor } from '../src/materials.js';
import { heightRamp, RAMP } from '../src/build/ramp.js';

describe('heightRamp', () => {
  it('runs from the base factor at the bottom to 1 at the top of the storey', () => {
    expect(heightRamp(0, 3)).toBeCloseTo(RAMP.base, 5);
    expect(heightRamp(3, 3)).toBeCloseTo(1, 5);
    expect(heightRamp(1.5, 3)).toBeGreaterThan(RAMP.base);
    expect(heightRamp(1.5, 3)).toBeLessThan(1);
    expect(heightRamp(-1, 3)).toBeCloseTo(RAMP.base, 5);
    expect(heightRamp(9, 3)).toBeCloseTo(1, 5);
  });
});

describe('merge pass ramp', () => {
  it('bakes the ramp into palette materials and turns their vertex colours on', () => {
    const group = new Group();
    const wall = new Mesh(new BoxGeometry(4, 3, 0.5), materialFor('stone', 'ramp-test'));
    wall.position.y = 1.5;
    group.add(wall);
    mergeLevelGroup(group, 'ramp-test', { storeyHeight: 3 });
    const mesh = group.children.find((o) => o.isMesh);
    expect(mesh.material.vertexColors).toBe(true);
    const c = mesh.geometry.getAttribute('color');
    const p = mesh.geometry.getAttribute('position');
    let low = 1, high = 0;
    for (let i = 0; i < p.count; i++) { if (p.getY(i) < 0.01) low = Math.min(low, c.getX(i)); if (p.getY(i) > 2.99) high = Math.max(high, c.getX(i)); }
    expect(low).toBeCloseTo(RAMP.base, 3);
    expect(high).toBeCloseTo(1, 3);
  });

  it('leaves model materials and their own vertex colours alone', () => {
    const group = new Group();
    const prop = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#aabbcc' }));
    group.add(prop);
    mergeLevelGroup(group, 'ramp-prop', { storeyHeight: 3 });
    const mesh = group.children.find((o) => o.isMesh);
    expect(mesh.material.vertexColors).toBe(false);
    expect(mesh.geometry.getAttribute('color')).toBeUndefined();
  });
});
