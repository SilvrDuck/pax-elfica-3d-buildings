import { describe, it, expect } from 'vitest';
import { ShapeGeometry, Shape, Box3, Vector3, DirectionalLight, Mesh, MeshBasicMaterial } from 'three';
import { subdivide, floorOcclusion, bakeFloorOcclusion } from '../src/build/ao.js';
import { setupLighting, fitShadowToBox } from '../src/lighting.js';
import { configureRenderer } from '../src/scene.js';

const rect = (w, d) => { const s = new Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, d); s.lineTo(0, d); s.closePath(); return new ShapeGeometry(s); };

describe('subdivide', () => {
  it('splits every triangle until no edge is longer than the limit', () => {
    const g = subdivide(rect(6, 4), 0.6);
    const p = g.getAttribute('position');
    const idx = g.index ? Array.from(g.index.array) : [...Array(p.count).keys()];
    let longest = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = new Vector3().fromBufferAttribute(p, idx[i]), b = new Vector3().fromBufferAttribute(p, idx[i + 1]), c = new Vector3().fromBufferAttribute(p, idx[i + 2]);
      longest = Math.max(longest, a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
    }
    expect(longest).toBeLessThanOrEqual(0.6 + 1e-6);
    expect(idx.length / 3).toBeGreaterThan(100);
    expect(idx.length / 3).toBeLessThan(2000);
  });
});

describe('floorOcclusion', () => {
  const walls = [{ a: [0, 0], b: [6, 0], material: 'stone' }];
  const props = [{ x: 3, z: 3, footprint: [1, 1] }];
  it('is full brightness away from walls and props', () => {
    expect(floorOcclusion([3, 1.5], walls, props)).toBeCloseTo(1, 5);
  });
  it('darkens at the foot of a wall and under a prop', () => {
    expect(floorOcclusion([3, 0.3], walls, props)).toBeLessThan(0.75);
    expect(floorOcclusion([3, 3], walls, props)).toBeLessThan(0.8);
    expect(floorOcclusion([3, 0.3], walls, props)).toBeGreaterThan(0.4);
  });
});

describe('bakeFloorOcclusion', () => {
  it('writes a colour attribute in [0.45, 1] on a floor mesh placed in the level frame', () => {
    const geometry = subdivide(rect(6, 4), 0.6);
    geometry.rotateX(Math.PI / 2);
    const mesh = new Mesh(geometry, new MeshBasicMaterial());
    bakeFloorOcclusion(mesh, { walls: [{ a: [0, 0], b: [6, 0], material: 'stone' }], props: [] });
    const c = mesh.geometry.getAttribute('color');
    expect(c).toBeDefined();
    let min = 1, max = 0;
    for (let i = 0; i < c.count; i++) { min = Math.min(min, c.getX(i)); max = Math.max(max, c.getX(i)); }
    expect(min).toBeGreaterThanOrEqual(0.45);
    expect(min).toBeLessThan(0.8);
    expect(max).toBeCloseTo(1, 5);
  });
});

describe('moon shadow', () => {
  it('casts one soft shadow from the moon only', () => {
    const scene = { children: [], add(o) { this.children.push(o); } };
    setupLighting(scene);
    const moon = scene.children.find((c) => c.isDirectionalLight);
    expect(moon.castShadow).toBe(true);
    expect(moon.shadow.mapSize.width).toBe(2048);
    expect(scene.children.filter((c) => c.castShadow).length).toBe(1);
  });
  it('fits the shadow frustum to a box', () => {
    const moon = new DirectionalLight();
    moon.position.set(-30, 50, -20);
    fitShadowToBox(moon, new Box3(new Vector3(0, -10, 0), new Vector3(44, 17, 34)));
    const cam = moon.shadow.camera;
    expect(cam.right - cam.left).toBeGreaterThan(44);
    expect(cam.right - cam.left).toBeLessThan(90);
    expect(cam.far).toBeGreaterThan(cam.near);
  });
  it('turns soft shadow maps on for the renderer', () => {
    const renderer = { shadowMap: { enabled: false, type: null } };
    configureRenderer(renderer);
    expect(renderer.shadowMap.enabled).toBe(true);
  });
});
