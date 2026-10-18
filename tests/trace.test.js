import { describe, it, expect } from 'vitest';
import { traceInk } from '../tools/lib/trace.mjs';

const PX_PER_M = 60;

// A 6 m × 4 m room with 0.5 m walls, a 1.2 m door in the middle of the south wall and a 0.9 m
// partition stub poking in from the north wall, rasterised as wall ink (80 = ink, 0 = none).
function roomInk() {
  const width = 10 * PX_PER_M, height = 8 * PX_PER_M;
  const data = new Uint8Array(width * height);
  const fill = (x0, z0, x1, z1) => {
    for (let y = Math.round(z0 * PX_PER_M); y < Math.round(z1 * PX_PER_M); y++)
      for (let x = Math.round(x0 * PX_PER_M); x < Math.round(x1 * PX_PER_M); x++) data[y * width + x] = 80;
  };
  const clear = (x0, z0, x1, z1) => {
    for (let y = Math.round(z0 * PX_PER_M); y < Math.round(z1 * PX_PER_M); y++)
      for (let x = Math.round(x0 * PX_PER_M); x < Math.round(x1 * PX_PER_M); x++) data[y * width + x] = 0;
  };
  // Outer rectangle, wall centrelines at x = 2 and 8, z = 2 and 6.
  fill(1.75, 1.75, 8.25, 2.25); // north
  fill(1.75, 5.75, 8.25, 6.25); // south
  fill(1.75, 1.75, 2.25, 6.25); // west
  fill(7.75, 1.75, 8.25, 6.25); // east
  clear(4.4, 5.7, 5.6, 6.3); // door, 1.2 m centred at x = 5 (3 m along the south wall from the west)
  fill(3.75, 2.25, 4.25, 3.15); // partition stub, 0.9 m down from the north wall
  return { data, width, height };
}

describe('traceInk', () => {
  const { walls, openings } = traceInk(roomInk(), { pxPerM: PX_PER_M, originPx: [0, 0], material: 'stone' });
  const len = (w) => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);

  it('finds the four outer walls at their drawn lengths', () => {
    const horizontals = walls.filter((w) => Math.abs(w.a[1] - w.b[1]) < 0.05 && len(w) > 5);
    const verticals = walls.filter((w) => Math.abs(w.a[0] - w.b[0]) < 0.05 && len(w) > 3);
    expect(horizontals).toHaveLength(2);
    expect(verticals).toHaveLength(2);
    for (const w of horizontals) expect(len(w)).toBeCloseTo(6, 0);
    for (const w of verticals) expect(len(w)).toBeCloseTo(4, 0);
    for (const w of walls) expect(w.material).toBe('stone');
  });

  it('bridges the door gap into one wall with a door opening', () => {
    const south = walls.find((w) => Math.abs(w.a[1] - 6) < 0.15 && Math.abs(w.b[1] - 6) < 0.15 && len(w) > 5);
    expect(south).toBeDefined();
    const door = openings.find((o) => o.wall === south.id);
    expect(door).toBeDefined();
    expect(door.kind).toBe('door');
    expect(door.width).toBeGreaterThan(1.05);
    expect(door.width).toBeLessThan(1.35);
    const fromWest = south.a[0] < south.b[0] ? door.at : len(south) - door.at;
    expect(Math.abs(fromWest - 3)).toBeLessThan(0.2);
  });

  it('keeps the partition stub and nothing shorter than 0.6 m', () => {
    expect(walls.some((w) => Math.abs(w.a[0] - 4) < 0.15 && Math.abs(w.b[0] - 4) < 0.15)).toBe(true);
    for (const w of walls) expect(len(w)).toBeGreaterThanOrEqual(0.6);
  });
});
