import { describe, it, expect, vi } from 'vitest';
import { centroid } from '../src/build/geometry.js';
import { applySize } from '../src/scene.js';

describe('centroid', () => {
  it('finds the centre of a rectangle', () => {
    expect(centroid([[1, 1], [5, 1], [5, 3], [1, 3]]).map((v) => +v.toFixed(6))).toEqual([3, 2]);
  });

  it('weights an L-shape by area', () => {
    // A 4×4 square missing its top-right 2×2 quarter: area 12, centroid (5/3, 5/3) from the corner.
    const L = [[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]];
    const [x, z] = centroid(L);
    expect(x).toBeCloseTo(5 / 3, 6);
    expect(z).toBeCloseTo(5 / 3, 6);
  });

  it('is winding-independent', () => {
    const a = centroid([[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]]);
    const b = centroid([[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]].reverse());
    expect(a[0]).toBeCloseTo(b[0], 9);
    expect(a[1]).toBeCloseTo(b[1], 9);
  });
});

describe('applySize', () => {
  it('resizes both renderers and the camera aspect together', () => {
    const camera = { aspect: 1, updateProjectionMatrix: vi.fn() };
    const renderer = { setSize: vi.fn() };
    const labelRenderer = { setSize: vi.fn() };
    applySize({ camera, renderer, labelRenderer }, 1920, 1080);
    expect(camera.aspect).toBeCloseTo(1920 / 1080, 9);
    expect(camera.updateProjectionMatrix).toHaveBeenCalled();
    expect(renderer.setSize).toHaveBeenCalledWith(1920, 1080);
    expect(labelRenderer.setSize).toHaveBeenCalledWith(1920, 1080);
  });
});
