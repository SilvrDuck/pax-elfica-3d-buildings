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

/** Trim sizes, in metres: frame bar, sill overhang, plinth height. */
export const FRAME_T = 0.1;
export const SILL_OUT = 0.12;
export const PLINTH_H = 0.45;
const FRAME_OUT = 0.05;
const LINTEL_H = 0.18;
const THRESHOLD_H = 0.06;
const JAMB_W = 0.12;
const MULLION_T = 0.06;

/**
 * Boxes that dress an opening, in wall-local coordinates: x along the wall, y up from the floor,
 * z across the wall (positive = outer face). Each is { name, material, w, h, d, x, y, z }.
 */
export function openingTrim(kind, hole, t) {
  const w = hole.x1 - hole.x0, h = hole.y1 - hole.y0;
  const cx = (hole.x0 + hole.x1) / 2, cy = (hole.y0 + hole.y1) / 2;
  const depth = t + 2 * FRAME_OUT;
  if (kind === 'window') {
    return [
      { name: 'frame', material: 'timber', w: w + 2 * FRAME_T, h: FRAME_T, d: depth, x: cx, y: hole.y1 + FRAME_T / 2, z: 0 },
      { name: 'frame', material: 'timber', w: FRAME_T, h: h, d: depth, x: hole.x0 - FRAME_T / 2, y: cy, z: 0 },
      { name: 'frame', material: 'timber', w: FRAME_T, h: h, d: depth, x: hole.x1 + FRAME_T / 2, y: cy, z: 0 },
      { name: 'sill', material: 'stone', w: w + 2 * FRAME_T + 0.1, h: 0.08, d: t + SILL_OUT, x: cx, y: hole.y0 - 0.04, z: SILL_OUT / 2 },
      { name: 'mullion', material: 'timber', w: MULLION_T, h: h, d: MULLION_T, x: cx, y: cy, z: 0 },
      { name: 'mullion', material: 'timber', w: w, h: MULLION_T, d: MULLION_T, x: cx, y: hole.y0 + h * 0.62, z: 0 },
    ];
  }
  if (kind === 'door') {
    return [
      { name: 'lintel', material: 'timber', w: w + 2 * JAMB_W + 0.1, h: LINTEL_H, d: depth, x: cx, y: hole.y1 + LINTEL_H / 2, z: 0 },
      { name: 'jamb', material: 'timber', w: JAMB_W, h: h, d: depth, x: hole.x0 - JAMB_W / 2, y: cy, z: 0 },
      { name: 'jamb', material: 'timber', w: JAMB_W, h: h, d: depth, x: hole.x1 + JAMB_W / 2, y: cy, z: 0 },
      { name: 'threshold', material: 'stone', w: w + 2 * JAMB_W, h: THRESHOLD_H, d: t + SILL_OUT, x: cx, y: THRESHOLD_H / 2, z: SILL_OUT / 2 },
    ];
  }
  if (kind === 'arch') {
    return [{ name: 'lintel', material: 'stone', w: w + 0.6, h: LINTEL_H * 1.5, d: depth, x: cx, y: hole.y1 + LINTEL_H * 0.75, z: 0 }];
  }
  return [];
}

/** Half-timbering: post spacing and beam section, in metres. */
export const POST_SPACING = 1.3;
const BEAM_W = 0.16;
const BEAM_OUT = 0.04;

/**
 * Beams of a half-timbered wall of length `L`, storey height `h` and thickness `t`, in wall-local
 * coordinates like `openingTrim`: a sill and a plate the full length, posts at the ends and every
 * POST_SPACING (skipping any that would cross an opening), and a diagonal brace in each bay that
 * has no opening. Each is { name, w, h, d, x, y, z, roll }.
 */
export function framingFor({ L, h, t }, holes) {
  const d = t + 2 * BEAM_OUT;
  const beams = [
    { name: 'sill', w: L, h: BEAM_W, d, x: L / 2, y: BEAM_W / 2, z: 0, roll: 0 },
    { name: 'plate', w: L, h: BEAM_W, d, x: L / 2, y: h - BEAM_W / 2, z: 0, roll: 0 },
  ];
  const crosses = (x) => holes.some((o) => x > o.x0 - BEAM_W && x < o.x1 + BEAM_W);
  const n = Math.max(1, Math.round(L / POST_SPACING));
  const xs = [];
  for (let i = 0; i <= n; i++) {
    const x = Math.min(L - BEAM_W / 2, Math.max(BEAM_W / 2, (i * L) / n));
    if (!crosses(x)) xs.push(x);
  }
  for (const x of xs) beams.push({ name: 'post', w: BEAM_W, h: h - 2 * BEAM_W, d, x, y: h / 2, z: 0, roll: 0 });
  for (let i = 0; i + 1 < xs.length; i++) {
    const x0 = xs[i], x1 = xs[i + 1];
    const bay = x1 - x0;
    if (bay < 0.9 || holes.some((o) => o.x1 > x0 && o.x0 < x1)) continue;
    const inner = h - 2 * BEAM_W;
    const len = Math.hypot(bay - BEAM_W, inner) * 0.92;
    beams.push({ name: 'brace', w: BEAM_W * 0.8, h: len, d: d - 0.01, x: (x0 + x1) / 2, y: h / 2, z: 0, roll: Math.atan2(bay - BEAM_W, inner) * (i % 2 ? -1 : 1) });
  }
  return beams;
}

/**
 * Rescales a BoxGeometry's UVs so one texture unit is one metre on every face: a tiling map
 * declared "per metre" then reads at the same size on a 6 m wall and a 0.5 m post. Returns the
 * geometry.
 */
export function metreUVs(geometry) {
  const { width = 1, height = 1, depth = 1 } = geometry.parameters ?? {};
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z; the (u, v) extents of each face in metres.
  const extents = [[depth, height], [depth, height], [width, depth], [width, depth], [width, height], [width, height]];
  const uv = geometry.getAttribute('uv');
  const index = geometry.index;
  const done = new Set();
  geometry.groups.forEach((g, face) => {
    const [su, sv] = extents[face];
    for (let i = g.start; i < g.start + g.count; i++) {
      const v = index.array[i];
      if (done.has(v)) continue;
      done.add(v);
      uv.setXY(v, uv.getX(v) * su, uv.getY(v) * sv);
    }
  });
  uv.needsUpdate = true;
  return geometry;
}

/** Ground-floor stone and enclosure walls stand on a protruding base band. */
export function plinthFor(wall, levelId) {
  if (levelId !== 'rdc') return null;
  if (wall.material !== 'stone' && wall.material !== 'enclosure') return null;
  return { h: PLINTH_H, out: 0.08 };
}

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
      warnings.push(`${wall.id} : l'ouverture « ${o.kind} » à ${o.at} m n'est pas découpée dans le mur`);
      continue;
    }
    let x0 = o.at - o.width / 2, x1 = o.at + o.width / 2;
    if (x0 < 0 || x1 > L) {
      warnings.push(`${wall.id} : « ${o.kind} » à ${o.at} m (largeur ${o.width}) dépasse le mur (longueur ${L}) ; ramené dans le mur`);
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
