import { describe, it, expect, vi } from 'vitest';
import { Scene, Group, Mesh, MeshBasicMaterial, BoxGeometry } from 'three';
import { webglSupported } from '../src/scene.js';
import { mount } from '../src/main.js';
import { Calque } from '../src/calque.js';
import { LevelStack } from '../src/stack.js';
import { materialFor, levelMaterials } from '../src/materials.js';
import { PropLibrary } from '../src/props.js';
import { bindKeys } from '../src/ui/controls.js';
import { mountLevelSelector } from '../src/ui/levelSelector.js';
import { buildWall } from '../src/build/walls.js';

const matFor = (name, level) => materialFor(name, level);

describe('WebGL availability', () => {
  it('requires WebGL 2, which three r186 needs', () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (kind) => (kind === 'webgl' ? {} : null);
    expect(webglSupported()).toBe(false);
    HTMLCanvasElement.prototype.getContext = original;
  });

  it('shows the French message when the renderer itself throws', () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (kind) => (kind === 'webgl2' ? {} : null);
    const container = document.createElement('div');
    const app = mount(container);
    HTMLCanvasElement.prototype.getContext = original;
    expect(app).toBeNull();
    expect(container.textContent).toContain("WebGL n'est pas disponible");
  });
});

describe('Calque without crops', () => {
  it('shows nothing until a sheet texture has loaded', () => {
    const scene = new Scene();
    const calibration = { sheets: { rdc: { worldRect: [0, 0, 10, 10], image: 'plans/rdc.jpg' } } };
    const loads = [];
    const loader = { load: (url, onLoad, onProgress, onError) => loads.push({ url, onLoad, onError }) };
    const calque = new Calque(scene, calibration, { loader });
    calque.setLevel('rdc');
    calque.visible = true;
    const plane = scene.getObjectByName('calque rdc');
    expect(plane.visible).toBe(false);
    loads[0].onError(new Error('404'));
    expect(plane.visible).toBe(false);
    loads[0].onLoad({ colorSpace: null });
    expect(plane.visible).toBe(true);
  });
});

describe('LevelStack', () => {
  const siloLevel = { id: 'rdc', walls: [], openings: [], floors: [], stairs: [], rooms: [], props: [], lights: [], roofs: [], silo: { centre: [5, 5], radius: 3, depth: 10 } };

  it('keeps the silo shaft visible on the lowest level', () => {
    const scene = new Scene();
    const stack = new LevelStack(scene, new Map([['rdc', siloLevel]]), { matFor });
    stack.select('silo2', { animate: false });
    const shaft = scene.getObjectByName('silo');
    let visible = true;
    for (let o = shaft; o; o = o.parent) if (o.visible === false) visible = false;
    expect(visible).toBe(true);
  });

  it('starts a fade-in at zero opacity before the first frame', () => {
    const frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { frames.push(cb); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const scene = new Scene();
    const level = { ...siloLevel, id: 'e1', silo: undefined, walls: [{ id: 'w1', a: [0, 0], b: [4, 0], material: 'stone' }] };
    const stack = new LevelStack(scene, new Map([['e1', level]]), { matFor });
    stack.select('rdc', { animate: false });
    stack.select('e1');
    const mats = levelMaterials('e1');
    expect(mats.length).toBeGreaterThan(0);
    expect(stack.group('e1').visible).toBe(true);
    for (const m of mats) expect(m.opacity).toBe(0);
    vi.unstubAllGlobals();
  });
});

describe('PropLibrary', () => {
  const catalog = { barrel: { pack: 'kaykit-dungeon', file: 'barrel.glb', footprint: [0.6, 0.6], height: 0.9 } };

  it('has its models ready after `ready` resolves', async () => {
    const model = { scene: new Group() };
    model.scene.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial()));
    const lib = new PropLibrary(catalog, { load: () => Promise.resolve(model), matFor });
    await lib.ready;
    const group = new Group();
    const placed = lib.place(group, { asset: 'barrel', x: 1, z: 2, rot: 0 }, { id: 'rdc', elevation: 0 });
    expect(placed.isGroup).toBe(true);
    expect(placed.children[0].isGroup).toBe(true);
  });

  it('boxes a model whose file fails to load, honouring the prop scale', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const lib = new PropLibrary(catalog, { load: () => Promise.reject(new Error('404')), matFor });
    await lib.ready;
    const group = new Group();
    const placed = lib.place(group, { asset: 'barrel', x: 1, z: 2, rot: 0, scale: 2 }, { id: 'rdc', elevation: 0 });
    expect(placed.isMesh).toBe(true);
    expect(placed.geometry.parameters.width).toBeCloseTo(1.2, 9);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('keys and buttons', () => {
  it('ignores shortcuts with a modifier held', () => {
    const stats = { toggle: vi.fn() };
    const target = new EventTarget();
    bindKeys({ selected: 'rdc', select() {} }, { stats }, target);
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
    expect(stats.toggle).not.toHaveBeenCalled();
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    expect(stats.toggle).toHaveBeenCalledTimes(1);
  });

  it('offers the label and calque toggles on screen', () => {
    const container = document.createElement('div');
    const stack = new EventTarget();
    stack.selected = 'toits';
    stack.select = () => {};
    const labels = { toggle: vi.fn(), visible: false };
    const calque = { toggle: vi.fn(), visible: false };
    mountLevelSelector(container, stack, { labels, calque });
    const names = container.querySelector('button[data-toggle="labels"]');
    const plan = container.querySelector('button[data-toggle="calque"]');
    expect(names.textContent).toBe('Noms des pièces');
    expect(plan.textContent).toBe('Calque du plan');
    names.click();
    expect(labels.toggle).toHaveBeenCalled();
  });
});

describe('door leaves', () => {
  it('are no wider than the hole left in the wall', () => {
    const wall = { id: 'w1', a: [0, 0], b: [6, 0], material: 'stone' };
    const group = buildWall(wall, [{ at: 5.6, width: 1.2, kind: 'door' }], { id: 'rdc', height: 3 }, matFor);
    const leaf = group.children.find((c) => c.isGroup).children[0].children[0];
    expect(leaf.geometry.parameters.width).toBeCloseTo(1.0, 9);
  });
});
