import { describe, expect, it } from 'vitest';
import { Scene } from 'three';
import {
  ATMOSPHERE,
  applyAtmosphere,
  buildGroundGeometry,
  buildGlowField,
} from '../src/atmosphere.js';

describe('twilight atmosphere', () => {
  it('matches the world fog to the CSS horizon without adding geometry', () => {
    const scene = new Scene();
    const renderer = { setClearColor: (...args) => { renderer.clear = args; } };

    applyAtmosphere(scene, renderer);

    expect(scene.background).toBeNull();
    expect(scene.fog.color.getHexString()).toBe(ATMOSPHERE.haze.slice(1));
    expect(scene.fog.near).toBe(ATMOSPHERE.fogNear);
    expect(scene.fog.far).toBe(ATMOSPHERE.fogFar);
    expect(renderer.clear).toEqual([0x000000, 0]);
    expect(scene.children).toHaveLength(0);
  });

  it('groups warm halos into one depth-tested point field', () => {
    const levels = new Map([
      ['rdc', { lights: [
        { kind: 'hearth', x: 2, y: 1, z: 3 },
        { kind: 'candle', x: 4, y: 1, z: 5 },
      ] }],
      ['e1', {
        walls: [{ id: 'w1', a: [6, 8], b: [10, 8] }],
        openings: [{ wall: 'w1', at: 1, width: 0.8, kind: 'window', glow: true }],
        lights: [],
      }],
    ]);
    const elevations = new Map([['rdc', 0], ['e1', 3]]);

    const glow = buildGlowField(levels, { elevations, order: ['rdc', 'e1'] });

    expect(glow.points.isPoints).toBe(true);
    expect(glow.points.material.depthTest).toBe(true);
    expect(glow.points.material.depthWrite).toBe(false);
    expect(glow.points.material.transparent).toBe(true);
    expect(glow.points.geometry.getAttribute('position').count).toBe(2);

    glow.select('rdc');
    expect(glow.points.geometry.getAttribute('position').count).toBe(1);
    expect(glow.points.geometry.getAttribute('position').array).toEqual(
      new Float32Array([2, 1, 3]),
    );
  });

  it('keeps the inn footprint flat and raises a faceted distant horizon', () => {
    const ground = buildGroundGeometry(120, 16);
    const positions = ground.getAttribute('position');
    const colors = ground.getAttribute('color');
    const centre = Math.floor(positions.count / 2);

    expect(Math.abs(positions.getY(centre))).toBeLessThan(1e-8);
    expect([...Array(positions.count).keys()].some((i) => Math.abs(positions.getY(i)) > 0.2)).toBe(true);
    expect(colors.count).toBe(positions.count);
  });
});
