import { describe, it, expect } from 'vitest';
import { MeshBasicMaterial, Box3 } from 'three';
import { buildRoof, ridgeHeight, EAVES_M } from '../src/build/roofs.js';

const matFor = () => new MeshBasicMaterial();

describe('roofs', () => {
  it('raises the ridge by half the span times tan(pitch)', () => {
    expect(ridgeHeight(6, 45)).toBeCloseTo(3, 5);
    expect(ridgeHeight(8, 30)).toBeCloseTo(4 * Math.tan(Math.PI / 6), 5);
  });

  it('builds a gable over the rect with 0.4 m eaves, ridge along x', () => {
    expect(EAVES_M).toBe(0.4);
    const mesh = buildRoof({ rect: [10, 20, 12, 6], ridge: 'x', pitch: 45, material: 'tile', covers: 'e1' }, matFor);
    const box = new Box3().setFromObject(mesh);
    expect(box.min.x).toBeCloseTo(10 - 0.4, 5);
    expect(box.max.x).toBeCloseTo(22 + 0.4, 5);
    expect(box.min.z).toBeCloseTo(20 - 0.4, 5);
    expect(box.max.z).toBeCloseTo(26 + 0.4, 5);
    expect(box.min.y).toBeCloseTo(-0.4, 5);
    expect(box.max.y).toBeCloseTo(3, 5);
    expect(mesh.geometry.getAttribute('position').count).toBe(14);
  });

  it('turns the ridge along z when asked', () => {
    const mesh = buildRoof({ rect: [0, 0, 4, 10], ridge: 'z', pitch: 45, material: 'tile', covers: 'rdc' }, matFor);
    const box = new Box3().setFromObject(mesh);
    expect(box.max.y).toBeCloseTo(2, 5);
  });

  it('builds a pyramid when the ridge is a point', () => {
    const mesh = buildRoof({ rect: [0, 0, 6, 6], ridge: 'point', pitch: 45, material: 'tile', covers: 'e4' }, matFor);
    const box = new Box3().setFromObject(mesh);
    expect(box.max.y).toBeCloseTo(3, 5);
    expect(mesh.geometry.getAttribute('position').count).toBe(12);
  });
});
