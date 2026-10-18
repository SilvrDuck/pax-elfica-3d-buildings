import { describe, it, expect } from 'vitest';
import { MeshBasicMaterial, Box3 } from 'three';
import { polygonArea } from '../src/build/geometry.js';
import { buildFloor } from '../src/build/floors.js';

const matFor = () => new MeshBasicMaterial();
const square = [[2, 1], [5, 1], [5, 4], [2, 4]];

describe('floors', () => {
  it('measures polygon area regardless of winding', () => {
    expect(polygonArea(square)).toBe(9);
    expect(polygonArea([...square].reverse())).toBe(9);
  });

  it('builds a plank slab 0.15 m thick under the storey floor', () => {
    const mesh = buildFloor({ polygon: square, material: 'planks' }, { elevation: 3 }, matFor);
    const box = new Box3().setFromObject(mesh);
    expect(box.min.x).toBeCloseTo(2, 5);
    expect(box.max.x).toBeCloseTo(5, 5);
    expect(box.min.z).toBeCloseTo(1, 5);
    expect(box.max.z).toBeCloseTo(4, 5);
    expect(box.max.y).toBeCloseTo(0, 5);
    expect(box.min.y).toBeCloseTo(-0.15, 5);
  });

  it('lays ground materials flush as a plane', () => {
    const mesh = buildFloor({ polygon: square, material: 'dirt' }, { elevation: 0 }, matFor);
    const box = new Box3().setFromObject(mesh);
    expect(box.max.y - box.min.y).toBeLessThan(0.001);
  });
});
