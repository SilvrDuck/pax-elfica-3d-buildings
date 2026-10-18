import { describe, it, expect } from 'vitest';
import { Group, Mesh, MeshBasicMaterial } from 'three';
import { fitTransform, REQUIRED_PROPS, PropLibrary } from '../src/props.js';
import props from '../src/data/props.json';

describe('fitTransform', () => {
  it('scales a model so its footprint matches and its base sits on the floor', () => {
    const t = fitTransform({ min: [-1, 0, -0.5], max: [1, 1, 0.5] }, [1, 0.5]);
    expect(t.scale).toBeCloseTo(0.5, 9);
    expect(t.offsetY).toBeCloseTo(0, 9);
  });

  it('lifts a model whose origin is above its base', () => {
    const t = fitTransform({ min: [-1, -2, -1], max: [1, 0, 1] }, [2, 2]);
    expect(t.scale).toBeCloseTo(1, 9);
    expect(t.offsetY).toBeCloseTo(2, 9);
  });
});

describe('props.json', () => {
  it('maps every required prop id to a pack entry with a footprint', () => {
    for (const id of REQUIRED_PROPS) {
      expect(props[id], id).toBeDefined();
      expect(props[id].footprint, id).toHaveLength(2);
      expect(props[id].height, id).toBeGreaterThan(0);
    }
  });
});

describe('PropLibrary.place', () => {
  it('falls back to a footprint box when the model is missing', async () => {
    const lib = new PropLibrary({ barrel: { pack: 'primitive', footprint: [0.6, 0.6], height: 0.9 } }, {
      load: () => Promise.reject(new Error('nope')),
      matFor: () => new MeshBasicMaterial(),
    });
    await lib.ready;
    const group = new Group();
    lib.place(group, { asset: 'barrel', x: 2, z: 3, rot: 90 }, { id: 'rdc', elevation: 0 });
    const mesh = group.children.find((c) => c instanceof Mesh);
    expect(mesh).toBeDefined();
    expect(mesh.position.x).toBe(2);
    expect(mesh.position.z).toBe(3);
    expect(mesh.geometry.parameters).toMatchObject({ width: 0.6, height: 0.9, depth: 0.6 });
  });
});
