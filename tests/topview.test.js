import { describe, it, expect, vi } from 'vitest';
import { OrthographicCamera, PerspectiveCamera } from 'three';
import { topFrustum, applySize, goHome } from '../src/scene.js';

describe('top view', () => {
  it('frames a world rect with a margin, widening to the viewport aspect', () => {
    const f = topFrustum([0, 0, 40, 30], 16 / 9, 1);
    expect(f.top).toBeCloseTo(16, 5);
    expect(f.right).toBeCloseTo(16 * (16 / 9), 5);
    const tall = topFrustum([0, 0, 40, 30], 1, 1);
    expect(tall.right).toBeCloseTo(21, 5);
    expect(tall.top).toBeCloseTo(21, 5);
  });

  it('refits an orthographic camera to a new window size', () => {
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.userData.topFrame = { rect: [0, 0, 40, 30], margin: 1 };
    const renderer = { setSize: vi.fn() };
    const labelRenderer = { setSize: vi.fn() };
    applySize({ camera, renderer, labelRenderer }, 1000, 1000);
    expect(camera.right).toBeCloseTo(21, 5);
    applySize({ camera, renderer, labelRenderer }, 2000, 1000);
    expect(camera.right).toBeCloseTo(32, 5);
    expect(renderer.setSize).toHaveBeenLastCalledWith(2000, 1000);
  });

  it('returns to the perspective camera and the orbit controls from the top view', () => {
    const perspective = new PerspectiveCamera();
    const view = { camera: new OrthographicCamera(), perspective, controls: { enabled: false, reset: vi.fn() } };
    goHome(view);
    expect(view.camera).toBe(perspective);
    expect(view.controls.enabled).toBe(true);
    expect(view.controls.reset).toHaveBeenCalled();
  });
});
