import { describe, it, expect } from 'vitest';
import { parseVector } from '../src/scene.js';
import { setWallFloor, floorOcclusion } from '../src/build/ao.js';

describe('parseVector', () => {
  it('reads three finite numbers, otherwise null', () => {
    expect(parseVector('-30,50,-20')).toEqual([-30, 50, -20]);
    expect(parseVector('1,2')).toBeNull();
    expect(parseVector('a,b,c')).toBeNull();
    expect(parseVector(null)).toBeNull();
  });
});

describe('setWallFloor', () => {
  it('changes how dark the foot of a wall bakes, clamped to [0.2, 1]', () => {
    const walls = [{ a: [0, 0], b: [6, 0], material: 'stone' }];
    setWallFloor(0.3);
    const dark = floorOcclusion([3, 0.3], walls, []);
    setWallFloor(0.9);
    const light = floorOcclusion([3, 0.3], walls, []);
    expect(dark).toBeLessThan(light);
    expect(setWallFloor(5)).toBe(1);
    expect(setWallFloor(0)).toBe(0.2);
    setWallFloor(0.55);
  });
});
