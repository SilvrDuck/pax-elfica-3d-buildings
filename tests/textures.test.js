import { describe, it, expect } from 'vitest';
import { BoxGeometry, Texture } from 'three';
import { metreUVs } from '../src/build/geometry.js';
import { materialFor, setMaterialMaps, MATERIAL_MAPS } from '../src/materials.js';
import { buildWall } from '../src/build/walls.js';

describe('metreUVs', () => {
  it('scales a box\'s UVs so one unit of texture is one metre on every face', () => {
    const g = metreUVs(new BoxGeometry(4, 3, 0.5));
    const uv = g.getAttribute('uv');
    let maxU = 0, maxV = 0;
    // The +z face (group 4) spans 4 m wide and 3 m high.
    const start = g.groups[4].start, count = g.groups[4].count;
    const idx = g.index.array;
    for (let i = start; i < start + count; i++) { maxU = Math.max(maxU, uv.getX(idx[i])); maxV = Math.max(maxV, uv.getY(idx[i])); }
    expect(maxU).toBeCloseTo(4, 5);
    expect(maxV).toBeCloseTo(3, 5);
  });
});

describe('material maps', () => {
  it('has no maps by default so the look stays flat colour', () => {
    expect(Object.keys(MATERIAL_MAPS)).toHaveLength(0);
    expect(materialFor('stone', 'tex-none').map).toBeNull();
  });
  it('applies a declared map and normal map with a repeat per metre', () => {
    const map = new Texture(), normalMap = new Texture();
    setMaterialMaps('stone', { map, normalMap, metres: 2 });
    const m = materialFor('stone', 'tex-set');
    expect(m.map).toBe(map);
    expect(m.normalMap).toBe(normalMap);
    expect(map.repeat.x).toBeCloseTo(0.5, 5);
    expect(map.wrapS).toBe(1000); // THREE.RepeatWrapping
    const already = materialFor('stone', 'tex-none');
    expect(already.map).toBe(map); // existing level copies follow
  });
});

describe('walls', () => {
  it('build their boxes with metre UVs', () => {
    const g = buildWall({ id: 'w', a: [0, 0], b: [6, 0], material: 'stone' }, [], { id: 'uv-test', height: 3 }, (n, l) => materialFor(n, l));
    const box = g.children.find((c) => c.isMesh && Array.isArray(c.material));
    const uv = box.geometry.getAttribute('uv');
    let maxU = 0;
    for (let i = 0; i < uv.count; i++) maxU = Math.max(maxU, uv.getX(i));
    expect(maxU).toBeCloseTo(6, 5);
  });
});
