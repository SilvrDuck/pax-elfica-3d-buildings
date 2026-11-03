import { describe, it, expect } from 'vitest';
import { materialFor, PALETTE } from '../src/materials.js';

describe('water', () => {
  it('is dark and glossy so the moon and the lanterns glint on it', () => {
    const m = materialFor('water', 'water-test');
    expect(m.roughness).toBeLessThan(0.3);
    expect(m.metalness).toBeGreaterThan(0);
    expect(m.flatShading).toBe(false);
    const { r, g, b } = m.color;
    expect(Math.max(r, g, b)).toBeLessThan(0.35);
    expect(PALETTE.water).not.toBe('#3d6b74');
  });
});
