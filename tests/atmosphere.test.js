import { describe, it, expect } from 'vitest';
import { Scene, Color } from 'three';
import { buildSky, SKY, setupFog, HORIZON } from '../src/atmosphere.js';

describe('sky dome', () => {
  it('is a large inward-facing sphere shaded by a dusk gradient', () => {
    const sky = buildSky();
    expect(sky.isMesh).toBe(true);
    expect(sky.geometry.parameters.radius).toBeGreaterThan(300);
    expect(sky.material.side).toBe(1); // THREE.BackSide
    expect(sky.material.uniforms.horizon.value.getHexString()).toBe(new Color(SKY.horizon).getHexString());
    expect(sky.material.uniforms.zenith.value.getHexString()).toBe(new Color(SKY.zenith).getHexString());
    expect(sky.material.depthWrite).toBe(false);
  });
  it('carries a field of stars', () => {
    const sky = buildSky();
    const stars = sky.children.find((c) => c.isPoints);
    expect(stars).toBeDefined();
    expect(stars.geometry.getAttribute('position').count).toBeGreaterThan(400);
  });
});

describe('fog', () => {
  it('matches the horizon colour and starts past the inn, ending before the ground plane edge', () => {
    const scene = new Scene();
    setupFog(scene);
    expect(scene.fog).toBeDefined();
    expect(scene.fog.color.getHexString()).toBe(new Color(HORIZON).getHexString());
    expect(scene.fog.near).toBeGreaterThanOrEqual(60);
    expect(scene.fog.far).toBeLessThanOrEqual(220);
    expect(scene.background).toBeNull();
  });
});
