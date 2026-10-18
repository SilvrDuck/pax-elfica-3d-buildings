// Pure geometry helpers shared by the builders. No Three.js here.

/** Wall thickness by material, in metres. */
export const THICKNESS = { enclosure: 0.6, stone: 0.5, timber: 0.3, cob: 0.3, partition: 0.2 };

/** Vertical extent of each opening kind, in metres above the floor. */
export const OPENING_HEIGHTS = {
  door: { y0: 0, y1: 2.1 },
  arch: { y0: 0, y1: 2.4 },
  window: { y0: 0.9, y1: 2.0 },
};

const r4 = (v) => Math.round(v * 1e4) / 1e4;

export function wallLength(wall) {
  return Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
}

/**
 * Splits a wall into solid rectangles around its openings.
 * Pieces are { x0, x1, y0, y1 }: x along the wall from `a`, y up from the floor.
 * Returns the solid runs first, then sills and lintels, plus warnings for data problems.
 */
export function splitWall(wall, openings, storeyH) {
  const L = r4(wallLength(wall));
  const h = wall.h ?? storeyH;
  const warnings = [];
  const holes = [];
  for (const o of openings) {
    const heights = OPENING_HEIGHTS[o.kind];
    if (!heights) {
      warnings.push(`${wall.id}: ${o.kind} opening at ${o.at} m is not cut into the wall`);
      continue;
    }
    let x0 = o.at - o.width / 2, x1 = o.at + o.width / 2;
    if (x0 < 0 || x1 > L) {
      warnings.push(`${wall.id}: ${o.kind} at ${o.at} m (width ${o.width}) runs past the wall (length ${L}); clamped`);
      x0 = Math.max(0, x0);
      x1 = Math.min(L, x1);
    }
    if (x1 - x0 <= 0) continue;
    holes.push({ x0: r4(x0), x1: r4(x1), y0: heights.y0, y1: Math.min(heights.y1, h) });
  }
  holes.sort((p, q) => p.x0 - q.x0);
  const merged = [];
  for (const hole of holes) {
    const last = merged[merged.length - 1];
    if (last && hole.x0 <= last.x1) {
      last.x1 = Math.max(last.x1, hole.x1);
      last.y0 = Math.min(last.y0, hole.y0);
      last.y1 = Math.max(last.y1, hole.y1);
    } else {
      merged.push({ ...hole });
    }
  }
  const pieces = [];
  let cursor = 0;
  for (const hole of merged) {
    if (hole.x0 > cursor) pieces.push({ x0: r4(cursor), x1: hole.x0, y0: 0, y1: h });
    cursor = hole.x1;
  }
  if (cursor < L) pieces.push({ x0: r4(cursor), x1: L, y0: 0, y1: h });
  for (const hole of merged) {
    if (hole.y0 > 0) pieces.push({ x0: hole.x0, x1: hole.x1, y0: 0, y1: hole.y0 });
    if (hole.y1 < h) pieces.push({ x0: hole.x0, x1: hole.x1, y0: hole.y1, y1: h });
  }
  return { pieces, holes: merged, warnings };
}

/** Unsigned area of a simple polygon given as [[x, z], …]. */
export function polygonArea(polygon) {
  let s = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, z0] = polygon[i], [x1, z1] = polygon[(i + 1) % polygon.length];
    s += x0 * z1 - x1 * z0;
  }
  return Math.abs(s) / 2;
}

/** Area-weighted centroid of a simple polygon, [x, z]. */
export function centroid(polygon) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, z0] = polygon[i], [x1, z1] = polygon[(i + 1) % polygon.length];
    const cross = x0 * z1 - x1 * z0;
    a += cross;
    cx += (x0 + x1) * cross;
    cz += (z0 + z1) * cross;
  }
  if (Math.abs(a) < 1e-9) {
    const n = polygon.length;
    return [polygon.reduce((s, p) => s + p[0], 0) / n, polygon.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * a), cz / (3 * a)];
}
