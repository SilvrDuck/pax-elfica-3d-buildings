import * as THREE from 'three';
import { THICKNESS } from './geometry.js';

const WALL_REACH = 0.7;
const WALL_FLOOR = 0.55;
const PROP_FLOOR = 0.7;
const PROP_FADE = 0.4;

/**
 * Splits triangles along their longest edge until no edge exceeds `maxEdge`, so a flat floor has
 * enough vertices to carry a contact-occlusion gradient. Returns a non-indexed geometry with
 * positions and normals only.
 */
export function subdivide(geometry, maxEdge) {
  const src = geometry.index ? geometry.toNonIndexed() : geometry;
  const p = src.getAttribute('position');
  const tris = [];
  for (let i = 0; i < p.count; i += 3) {
    tris.push([new THREE.Vector3().fromBufferAttribute(p, i), new THREE.Vector3().fromBufferAttribute(p, i + 1), new THREE.Vector3().fromBufferAttribute(p, i + 2)]);
  }
  const out = [];
  while (tris.length) {
    const [a, b, c] = tris.pop();
    const ab = a.distanceTo(b), bc = b.distanceTo(c), ca = c.distanceTo(a);
    const longest = Math.max(ab, bc, ca);
    if (longest <= maxEdge) { out.push(a, b, c); continue; }
    if (longest === ab) { const m = a.clone().lerp(b, 0.5); tris.push([a, m, c], [m, b, c]); }
    else if (longest === bc) { const m = b.clone().lerp(c, 0.5); tris.push([a, b, m], [a, m, c]); }
    else { const m = c.clone().lerp(a, 0.5); tris.push([a, b, m], [m, b, c]); }
  }
  const positions = new Float32Array(out.length * 3);
  out.forEach((v, i) => positions.set([v.x, v.y, v.z], i * 3));
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  result.computeVertexNormals();
  return result;
}

const smooth = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

function distanceToSegment([x, z], [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2));
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
}

/**
 * Brightness factor (0.45–1) of a floor point: darker at the foot of walls and under furniture.
 * `walls` are level walls in metres; `props` carry `x`, `z` and a `footprint` [w, d].
 */
export function floorOcclusion(point, walls, props) {
  let nearestWall = Infinity;
  for (const w of walls) {
    const half = (THICKNESS[w.material] ?? THICKNESS.stone) / 2;
    nearestWall = Math.min(nearestWall, Math.max(0, distanceToSegment(point, w.a, w.b) - half));
  }
  const wallTerm = WALL_FLOOR + (1 - WALL_FLOOR) * smooth(nearestWall / WALL_REACH);
  let propTerm = 1;
  for (const p of props) {
    const r = Math.max(p.footprint?.[0] ?? 0.8, p.footprint?.[1] ?? 0.8) / 2;
    const d = Math.hypot(point[0] - p.x, point[1] - p.z);
    const term = d <= r ? PROP_FLOOR : d >= r + PROP_FADE ? 1 : PROP_FLOOR + (1 - PROP_FLOOR) * smooth((d - r) / PROP_FADE);
    propTerm = Math.min(propTerm, term);
  }
  return wallTerm * propTerm;
}

/** Writes the occlusion as a grey vertex colour on a floor mesh laid in the level frame. */
export function bakeFloorOcclusion(mesh, { walls, props }) {
  const g = mesh.geometry;
  const p = g.getAttribute('position');
  const colors = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrix);
    const k = floorOcclusion([v.x, v.z], walls, props);
    colors.set([k, k, k], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return mesh;
}
