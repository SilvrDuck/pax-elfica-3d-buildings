import { describe, it, expect } from 'vitest';
import { Scene } from 'three';
import { PALETTE, materialFor, levelMaterials } from '../src/materials.js';
import { LIGHT_KINDS, buildLight, setupLighting } from '../src/lighting.js';
import { loadLevels } from '../src/data/levels.js';

describe('materials', () => {
  it('names the palette colours', () => {
    expect(PALETTE.stone).toBe('#7a7f85');
    expect(PALETTE.windowGlow).toBe('#ffb347');
    expect(Object.keys(PALETTE)).toContain('cobbles');
  });

  it('caches one flat-shaded transparent material per name and level', () => {
    const a = materialFor('stone', 'rdc');
    expect(materialFor('stone', 'rdc')).toBe(a);
    expect(materialFor('stone', 'e1')).not.toBe(a);
    expect(a.flatShading).toBe(true);
    expect(a.transparent).toBe(true);
    expect(a.opacity).toBe(1);
  });

  it('lists the materials a level uses so they can fade together', () => {
    materialFor('timber', 'e2');
    materialFor('planks', 'e2');
    const mats = levelMaterials('e2');
    expect(mats.length).toBeGreaterThanOrEqual(2);
    expect(mats).toContain(materialFor('timber', 'e2'));
    expect(levelMaterials('nothing')).toEqual([]);
  });

  it('makes window panes emissive', () => {
    const glow = materialFor('windowGlow', 'e1');
    expect(glow.emissiveIntensity).toBe(1.6);
    expect(glow.emissive.getHexString()).toBe('ffb347');
  });
});

describe('lighting', () => {
  it('defines the four warm light kinds', () => {
    expect(LIGHT_KINDS.hearth).toEqual({ color: '#ff8c3a', intensity: 40, distance: 11 });
    expect(LIGHT_KINDS.lantern.distance).toBe(8);
    expect(LIGHT_KINDS.candle.intensity).toBe(5);
    expect(LIGHT_KINDS.window.color).toBe('#ffb347');
  });

  it('places a point light at the level elevation plus its height', () => {
    const light = buildLight({ x: 1, y: 1.2, z: 2, kind: 'hearth' }, { elevation: 3 });
    expect(light.position.toArray()).toEqual([1, 4.2, 2]);
    expect(light.color.getHexString()).toBe('ff8c3a');
    expect(light.intensity).toBe(40);
    expect(light.decay).toBe(2);
    expect(light.castShadow).toBe(false);
  });

  it('uses emissive panes instead of point lights for windows', () => {
    const light = buildLight({ x: 1, y: 1.2, z: 2, kind: 'window' }, { elevation: 3 });
    expect(light.isPointLight).not.toBe(true);
    expect(light.position.toArray()).toEqual([1, 4.2, 2]);
  });

  it('keeps the complete inn near the sixty-point-light budget', async () => {
    const levels = await loadLevels();
    const points = [...levels.values()].flatMap((level) => level.lights ?? [])
      .map((light) => buildLight(light, { elevation: 0 }))
      .filter((light) => light.isPointLight);
    expect(points.length).toBeGreaterThanOrEqual(50);
    expect(points.length).toBeLessThanOrEqual(65);
  });

  it('adds the dusk hemisphere and moon to a scene', () => {
    const scene = new Scene();
    setupLighting(scene);
    const kinds = scene.children.filter((c) => c.isLight).map((c) => c.type).sort();
    expect(kinds).toEqual(['DirectionalLight', 'HemisphereLight']);
  });
});
