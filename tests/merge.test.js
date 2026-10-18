import { describe, it, expect } from 'vitest';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, PointLight } from 'three';
import { mergeLevelGroup } from '../src/build/merge.js';

function groupWith(...meshes) {
  const g = new Group();
  for (const m of meshes) g.add(m);
  return g;
}

describe('mergeLevelGroup', () => {
  it('fuses meshes that share a material into one and keeps their placement', () => {
    const mat = new MeshStandardMaterial();
    const a = new Mesh(new BoxGeometry(1, 1, 1), mat);
    const b = new Mesh(new BoxGeometry(1, 1, 1), mat);
    b.position.set(10, 0, 0);
    const nested = new Group();
    nested.position.set(0, 0, 5);
    nested.add(new Mesh(new BoxGeometry(1, 1, 1), mat));
    const group = groupWith(a, b, nested);
    mergeLevelGroup(group, 'rdc');
    const meshes = [];
    group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.getAttribute('position').count).toBe(3 * 24);
    meshes[0].geometry.computeBoundingBox();
    expect(meshes[0].geometry.boundingBox.max.x).toBeCloseTo(10.5, 5);
    expect(meshes[0].geometry.boundingBox.max.z).toBeCloseTo(5.5, 5);
  });

  it('keeps different materials apart and leaves lights alone', () => {
    const a = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 'red' }));
    const b = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: 'blue' }));
    const light = new PointLight();
    const group = groupWith(a, b, light);
    mergeLevelGroup(group, 'e1');
    const meshes = [], lights = [];
    group.traverse((o) => { if (o.isMesh) meshes.push(o); if (o.isLight) lights.push(o); });
    expect(meshes).toHaveLength(2);
    expect(lights).toHaveLength(1);
  });

  it('gives the level its own copy of a shared material so it can fade alone', () => {
    const shared = new MeshStandardMaterial();
    const g1 = groupWith(new Mesh(new BoxGeometry(1, 1, 1), shared), new Mesh(new BoxGeometry(1, 1, 1), shared));
    const g2 = groupWith(new Mesh(new BoxGeometry(1, 1, 1), shared));
    mergeLevelGroup(g1, 'e2');
    mergeLevelGroup(g2, 'e3');
    const m1 = g1.children.find((o) => o.isMesh).material;
    const m2 = g2.children.find((o) => o.isMesh).material;
    expect(m1).not.toBe(m2);
    expect(m1.transparent).toBe(true);
  });
});
