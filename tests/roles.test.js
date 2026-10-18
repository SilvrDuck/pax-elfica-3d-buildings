import { describe, it, expect } from 'vitest';
import { Color, Scene, Group, Mesh, BoxGeometry, MeshStandardMaterial, Box3, Vector3 } from 'three';
import { subduedColor, materialFor, setSubdued } from '../src/materials.js';
import { LevelStack } from '../src/stack.js';
import { buildWall } from '../src/build/walls.js';
import { splitByGroups, mergeLevelGroup } from '../src/build/merge.js';
import { frameBox, HOME } from '../src/scene.js';

const matFor = (name, level) => materialFor(name, level);
const level = (id, extra = {}) => ({ id, walls: [{ id: 'w1', a: [0, 0], b: [4, 0], material: 'stone' }], openings: [], floors: [], stairs: [], rooms: [], props: [], lights: [], roofs: [], ...extra });

describe('subduedColor', () => {
  it('keeps the hue, drops saturation and lightness', () => {
    const base = new Color('#a9783f');
    const sub = subduedColor(base);
    const h1 = {}, h2 = {};
    base.getHSL(h1); sub.getHSL(h2);
    expect(Math.abs(h1.h - h2.h)).toBeLessThan(0.02);
    expect(h2.s).toBeLessThan(h1.s * 0.6);
    expect(h2.l).toBeLessThan(h1.l * 0.7);
    expect(h2.l).toBeGreaterThan(0.05);
  });

  it('is reversible through setSubdued', () => {
    const m = materialFor('timber', 'roles-test');
    const base = m.color.getHex();
    setSubdued(m, 1);
    expect(m.color.getHex()).not.toBe(base);
    setSubdued(m, 0);
    expect(m.color.getHex()).toBe(base);
  });
});

describe('LevelStack roles', () => {
  it('subdues the levels below the active one and restores them', () => {
    const scene = new Scene();
    const stack = new LevelStack(scene, new Map([['rdc', level('rdc')], ['e1', level('e1')]]), { matFor });
    const rdcMat = materialFor('stone', 'rdc');
    const base = rdcMat.color.getHex();
    stack.select('e1', { animate: false });
    expect(rdcMat.color.getHex()).not.toBe(base);
    expect(materialFor('stone', 'e1').color.getHex()).toBe(materialFor('stone', 'e1').userData.baseColor.getHex());
    stack.select('rdc', { animate: false });
    expect(rdcMat.color.getHex()).toBe(base);
    stack.select('toits', { animate: false });
    expect(rdcMat.color.getHex()).toBe(base);
  });

  it('measures the active level for framing', () => {
    const scene = new Scene();
    const stack = new LevelStack(scene, new Map([['e1', level('e1')]]), { matFor });
    const box = stack.bounds('e1');
    expect(box.min.y).toBeCloseTo(3, 1);
    expect(box.max.x).toBeCloseTo(4, 1);
  });
});

describe('cut cap', () => {
  it('gives wall boxes a dark top face', () => {
    const group = buildWall({ id: 'w1', a: [0, 0], b: [4, 0], material: 'stone' }, [], { id: 'rdc', height: 3 }, matFor);
    const box = group.children.find((c) => c.isMesh);
    expect(Array.isArray(box.material)).toBe(true);
    expect(box.material[2]).toBe(materialFor('cut', 'rdc'));
    expect(box.material[0]).toBe(materialFor('stone', 'rdc'));
  });

  it('is kept by the merge pass as its own mesh', () => {
    const side = new MeshStandardMaterial({ color: 'red' }), cap = new MeshStandardMaterial({ color: 'black' });
    const box = new Mesh(new BoxGeometry(2, 3, 0.5), [side, side, cap, side, side, side]);
    const parts = splitByGroups(box.geometry);
    expect(parts).toHaveLength(6);
    expect(parts[2].materialIndex).toBe(2);
    const group = new Group();
    group.add(box);
    mergeLevelGroup(group, 'cut-test');
    const meshes = [];
    group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    expect(meshes).toHaveLength(2);
    const total = meshes.reduce((n, m) => n + m.geometry.getAttribute('position').count, 0);
    expect(total).toBe(36);
  });
});

describe('frameBox', () => {
  it('looks at the box centre from the home direction, far enough to fit it', () => {
    const box = new Box3(new Vector3(0, 0, 0), new Vector3(40, 3, 30));
    const { position, target } = frameBox(box, 16 / 9, 45);
    expect(target.toArray()).toEqual([20, 1.5, 15]);
    const dir = position.clone().sub(target).normalize();
    const home = HOME.position.clone().sub(HOME.target).normalize();
    expect(dir.distanceTo(home)).toBeLessThan(1e-6);
    const dist = position.distanceTo(target);
    expect(dist).toBeGreaterThan(30);
    expect(dist).toBeLessThan(120);
  });
});
