// Turns a wall-ink raster into wall segments and openings, in metres.
//
// Pipeline: binarise → drop small blobs → chamfer distance (half-thickness) → Zhang-Suen thinning
// → walk the skeleton into polylines between junctions and free ends → prune short spurs →
// Douglas-Peucker → straighten corner cuts → axis snap → bridge gaps between facing collinear
// ends into one wall with a door or window opening → join collinear pieces across junctions.

import { open, close } from './morph.mjs';

const SPUR_M = 0.6;
const MIN_WALL_M = 0.6;
const DP_EPS_M = 0.15; // hand-painted walls wobble by about a quarter of their thickness
const BEND_DEG = 8; // consecutive pieces bending less than this are one wall
const MIN_STEP_M = 0.05;
const SMOOTH_M = 0.5; // half-window of the running mean that irons out buttress bulges
const CORNER_CUT_M = 0.45;
const AXIS_SNAP_DEG = 5;
const GAP_WINDOW_M = [0.3, 0.7];
const GAP_DOOR_M = [0.7, 2.0];
const MIN_BLOB_M2 = 0.15;
const MIN_NETWORK_M = 6; // total length under which a disconnected group of walls is noise
const CLOSE_M = 0.12; // fills mortar lines and texture holes inside drawn walls
const OPEN_M = 0.03; // removes isolated speckles and hairlines

export function traceInk(ink, { pxPerM, originPx = [0, 0], material = 'stone', threshold = 30, keepNoise = false, log = () => {}, onStage = () => {} }) {
  const { width, height } = ink;
  const t0 = Date.now();
  const lap = (label) => log(`${label}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  let mask = binarise(ink, threshold);
  mask = close(mask, width, height, Math.max(1, Math.round(CLOSE_M * pxPerM)));
  mask = open(mask, width, height, Math.max(1, Math.round(OPEN_M * pxPerM)));
  dropSmallBlobs(mask, width, height, MIN_BLOB_M2 * pxPerM * pxPerM);
  lap('blobs');
  onStage('mask', mask);
  const dist = chamfer(mask, width, height);
  const skel = thin(mask, width, height);
  lap('thinning');
  onStage('skeleton', skel);
  let paths = walkSkeleton(skel, width, height);
  lap(`skeleton walked (${paths.length} paths)`);
  paths = pruneSpurs(paths, SPUR_M * pxPerM);
  lap(`spurs pruned (${paths.length} paths)`);
  const toM = ([x, y]) => [(x + 0.5 - originPx[0]) / pxPerM, (y + 0.5 - originPx[1]) / pxPerM];
  const segments = [];
  for (const p of paths) {
    const extended = extendFreeEnds(p, dist, width);
    let pts = smoothPath(extended.pts, Math.round(SMOOTH_M * pxPerM));
    pts = douglasPeucker(pts, DP_EPS_M * pxPerM);
    pts = straightenCornerCuts(pts, CORNER_CUT_M * pxPerM);
    pts = dropTinySteps(pts, MIN_STEP_M * pxPerM);
    pts = mergeGentleBends(pts, BEND_DEG);
    for (let i = 0; i + 1 < pts.length; i++) {
      segments.push({
        a: toM(pts[i]),
        b: toM(pts[i + 1]),
        freeA: i === 0 && extended.freeStart,
        freeB: i === pts.length - 2 && extended.freeEnd,
        openings: [],
      });
    }
  }
  segments.forEach(axisSnap);
  lap(`simplified (${segments.length} segments)`);
  let walls = bridgeGaps(segments);
  lap(`gaps bridged (${walls.length} walls)`);
  walls = mergeCollinear(walls);
  lap(`collinear merged (${walls.length} walls)`);
  const long = walls.filter((w) => length(w) >= MIN_WALL_M);
  lap(`short walls dropped (${long.length} walls)`);
  const kept = keepNoise ? long : dropSmallNetworks(long, MIN_NETWORK_M);
  lap(`small networks dropped (${kept.length} walls)`);
  const out = { walls: [], openings: [] };
  kept.forEach((w, i) => {
    const id = `w${i + 1}`;
    out.walls.push({ id, a: round(w.a), b: round(w.b), material });
    for (const o of w.openings) out.openings.push({ wall: id, at: +o.at.toFixed(2), width: +o.width.toFixed(2), kind: o.kind });
  });
  return out;
}

const round = ([x, y]) => [+x.toFixed(2), +y.toFixed(2)];
const length = (s) => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
const dirOf = (s) => { const l = length(s) || 1; return [(s.b[0] - s.a[0]) / l, (s.b[1] - s.a[1]) / l]; };
const along = (s, pt) => { const d = dirOf(s); return (pt[0] - s.a[0]) * d[0] + (pt[1] - s.a[1]) * d[1]; };
const pointAt = (s, at) => { const d = dirOf(s); return [s.a[0] + d[0] * at, s.a[1] + d[1] * at]; };
const sinDeg = (deg) => Math.sin((deg * Math.PI) / 180);

function binarise(ink, threshold) {
  const out = new Uint8Array(ink.width * ink.height);
  for (let i = 0; i < out.length; i++) out[i] = ink.data[i] > threshold ? 1 : 0;
  return out;
}

function dropSmallBlobs(mask, width, height, minArea) {
  const seen = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    let top = 0;
    const members = [];
    stack[top++] = start; seen[start] = 1;
    while (top) {
      const i = stack[--top];
      members.push(i);
      const x = i % width, y = (i - x) / width;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (mask[j] && !seen[j]) { seen[j] = 1; stack[top++] = j; }
      }
    }
    if (members.length < minArea) for (const i of members) mask[i] = 0;
  }
}

// Chamfer 3-4 distance to the nearest background pixel, in pixels.
function chamfer(mask, width, height) {
  const INF = 1e9;
  const d = new Float32Array(mask.length);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? INF : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : d[y * width + x]);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

// Zhang-Suen thinning; returns a new mask holding the one-pixel skeleton.
function thin(mask, width, height) {
  const s = new Uint8Array(mask);
  const p = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : s[y * width + x]);
  let changed = true;
  const toClear = [];
  while (changed) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      toClear.length = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (!s[y * width + x]) continue;
        const p2 = p(x, y - 1), p3 = p(x + 1, y - 1), p4 = p(x + 1, y), p5 = p(x + 1, y + 1);
        const p6 = p(x, y + 1), p7 = p(x - 1, y + 1), p8 = p(x - 1, y), p9 = p(x - 1, y - 1);
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        let a = 0;
        if (!p2 && p3) a++; if (!p3 && p4) a++; if (!p4 && p5) a++; if (!p5 && p6) a++;
        if (!p6 && p7) a++; if (!p7 && p8) a++; if (!p8 && p9) a++; if (!p9 && p2) a++;
        if (a !== 1) continue;
        if (pass === 0 ? (p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0) : (p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0)) continue;
        toClear.push(y * width + x);
      }
      if (toClear.length) changed = true;
      for (const i of toClear) s[i] = 0;
    }
  }
  return s;
}

// Walks the skeleton into pixel paths between nodes (free ends and junction clusters).
// Returns [{ pts: [[x, y], …], startNode, endNode }], node ids being -1 for a free end.
function walkSkeleton(skel, width, height) {
  const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const inb = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
  const deg = new Uint8Array(skel.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!skel[y * width + x]) continue;
    let d = 0;
    for (const [dx, dy] of N8) if (inb(x + dx, y + dy) && skel[(y + dy) * width + x + dx]) d++;
    deg[y * width + x] = d;
  }
  // Junction pixels (degree ≥ 3) touching each other form one node.
  const nodeOf = new Int32Array(skel.length).fill(-1);
  let nodeCount = 0;
  for (let i = 0; i < skel.length; i++) {
    if (!skel[i] || deg[i] < 3 || nodeOf[i] >= 0) continue;
    const stack = [i];
    nodeOf[i] = nodeCount;
    while (stack.length) {
      const j = stack.pop();
      const x = j % width, y = (j - x) / width;
      for (const [dx, dy] of N8) {
        if (!inb(x + dx, y + dy)) continue;
        const k = (y + dy) * width + x + dx;
        if (skel[k] && deg[k] >= 3 && nodeOf[k] < 0) { nodeOf[k] = nodeCount; stack.push(k); }
      }
    }
    nodeCount++;
  }
  const visited = new Uint8Array(skel.length);
  const paths = [];
  const walkFrom = (start, first, startNode) => {
    const pts = [[start % width, Math.floor(start / width)]];
    let prev = start, cur = first;
    for (;;) {
      visited[cur] = 1;
      const x = cur % width, y = (cur - x) / width;
      pts.push([x, y]);
      if (nodeOf[cur] >= 0) return { pts, startNode, endNode: nodeOf[cur] };
      if (deg[cur] === 1) return { pts, startNode, endNode: -1 };
      let next = -1;
      for (const [dx, dy] of N8) {
        if (!inb(x + dx, y + dy)) continue;
        const k = (y + dy) * width + x + dx;
        if (k !== prev && skel[k] && !visited[k]) { next = k; break; }
      }
      if (next < 0) {
        for (const [dx, dy] of N8) {
          if (!inb(x + dx, y + dy)) continue;
          const k = (y + dy) * width + x + dx;
          if (k !== prev && skel[k] && nodeOf[k] >= 0) { pts.push([k % width, Math.floor(k / width)]); return { pts, startNode, endNode: nodeOf[k] }; }
        }
        return { pts, startNode, endNode: -1 };
      }
      prev = cur; cur = next;
    }
  };
  for (let i = 0; i < skel.length; i++) {
    if (!skel[i] || !(nodeOf[i] >= 0 || deg[i] === 1)) continue;
    const x = i % width, y = (i - x) / width;
    for (const [dx, dy] of N8) {
      if (!inb(x + dx, y + dy)) continue;
      const k = (y + dy) * width + x + dx;
      if (!skel[k] || visited[k] || nodeOf[k] >= 0) continue;
      visited[i] = 1;
      paths.push(walkFrom(i, k, nodeOf[i] >= 0 ? nodeOf[i] : -1));
    }
  }
  return paths;
}

// Removes paths with a free end shorter than `minPx`, then joins the pairs of paths that meet at a
// node left with exactly two paths.
function pruneSpurs(paths, minPx) {
  const plen = (p) => { let l = 0; for (let i = 1; i < p.pts.length; i++) l += Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]); return l; };
  const kept = new Set(paths.filter((p) => !((p.startNode < 0 || p.endNode < 0) && plen(p) < minPx)));
  const byNode = new Map();
  for (const p of kept) for (const n of [p.startNode, p.endNode]) if (n >= 0) byNode.set(n, (byNode.get(n) || []).concat([p]));
  // A node left with a single path (its other branches were spurs) is now a free end.
  for (const [n, ps] of byNode) {
    if (ps.length !== 1) continue;
    const p = ps[0];
    if (p.startNode === n) p.startNode = -1;
    if (p.endNode === n) p.endNode = -1;
  }
  const replaced = new Map();
  const current = (p) => { while (replaced.has(p)) p = replaced.get(p); return p; };
  for (const [n, ps] of byNode) {
    if (ps.length !== 2) continue;
    const p = current(ps[0]), q = current(ps[1]);
    if (p === q) continue;
    const pPts = p.endNode === n ? p.pts : [...p.pts].reverse();
    const qPts = q.startNode === n ? q.pts : [...q.pts].reverse();
    const merged = {
      pts: pPts.concat(qPts.slice(1)),
      startNode: p.endNode === n ? p.startNode : p.endNode,
      endNode: q.startNode === n ? q.endNode : q.startNode,
    };
    kept.delete(p); kept.delete(q); kept.add(merged);
    replaced.set(p, merged); replaced.set(q, merged);
  }
  return [...kept];
}

// Skeleton ends stop about half a wall thickness short of the ink's end; push free ends back out.
function extendFreeEnds(path, dist, width) {
  const pts = path.pts.map((p) => [p[0], p[1]]);
  const push = (end, towards) => {
    const d = dist[end[1] * width + end[0]];
    const dx = end[0] - towards[0], dy = end[1] - towards[1];
    const l = Math.hypot(dx, dy) || 1;
    return [end[0] + (dx / l) * d, end[1] + (dy / l) * d];
  };
  const freeStart = path.startNode < 0, freeEnd = path.endNode < 0;
  if (pts.length >= 2) {
    const k = Math.min(pts.length - 1, 6);
    if (freeStart) pts[0] = push(pts[0], pts[k]);
    if (freeEnd) pts[pts.length - 1] = push(pts[pts.length - 1], pts[pts.length - 1 - k]);
  }
  return { pts, freeStart, freeEnd };
}

// Running mean over ±w points along the path; the two ends stay put.
function smoothPath(pts, w) {
  if (pts.length < 3 || w < 1) return pts;
  const out = pts.map((p) => [p[0], p[1]]);
  for (let i = 1; i < pts.length - 1; i++) {
    const lo = Math.max(0, i - w), hi = Math.min(pts.length - 1, i + w);
    const k = Math.min(i - lo, hi - i); // symmetric window so ends do not pull the curve
    let sx = 0, sy = 0;
    for (let j = i - k; j <= i + k; j++) { sx += pts[j][0]; sy += pts[j][1]; }
    out[i] = [sx / (2 * k + 1), sy / (2 * k + 1)];
  }
  return out;
}

function douglasPeucker(pts, eps) {
  if (pts.length <= 2) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let maxD = -1, idx = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointSegmentDistance(pts[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [a, b];
  return douglasPeucker(pts.slice(0, idx + 1), eps).slice(0, -1).concat(douglasPeucker(pts.slice(idx), eps));
}

function pointSegmentDistance(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Distance from p to the infinite line through a and b.
function pointToLine(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / l;
}

// Removes polyline points closer than `minPx` to their predecessor (keeps the last point).
function dropTinySteps(pts, minPx) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1];
    if (Math.hypot(pts[i][0] - prev[0], pts[i][1] - prev[1]) >= minPx || i === pts.length - 1) out.push(pts[i]);
  }
  if (out.length >= 2) {
    const a = out[out.length - 2], b = out[out.length - 1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < minPx && out.length > 2) out.splice(out.length - 2, 1);
  }
  return out;
}

// Drops interior points where the polyline bends by less than `maxDeg`.
function mergeGentleBends(pts, maxDeg) {
  const cos = Math.cos((maxDeg * Math.PI) / 180);
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], c = pts[i + 1];
    const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
    const lu = Math.hypot(...u) || 1, lv = Math.hypot(...v) || 1;
    if ((u[0] * v[0] + u[1] * v[1]) / (lu * lv) < cos) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// A thinned L-corner leaves a short diagonal; replace it by the intersection of its neighbours.
function straightenCornerCuts(pts, maxCut) {
  const out = pts.map((p) => [p[0], p[1]]);
  for (let i = 1; i + 2 < out.length; ) {
    const cut = Math.hypot(out[i + 1][0] - out[i][0], out[i + 1][1] - out[i][1]);
    if (cut > maxCut) { i++; continue; }
    const x = lineIntersection(out[i - 1], out[i], out[i + 1], out[i + 2]);
    if (!x) { i++; continue; }
    out.splice(i, 2, x);
  }
  return out;
}

function lineIntersection(p1, p2, p3, p4) {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
  const l1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), l2 = Math.hypot(p4[0] - p3[0], p4[1] - p3[1]);
  if (Math.abs(d) < 0.3 * l1 * l2) return null; // nearly parallel: not a corner
  const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}

function axisSnap(s) {
  const dx = Math.abs(s.b[0] - s.a[0]), dy = Math.abs(s.b[1] - s.a[1]);
  const tan = Math.tan((AXIS_SNAP_DEG * Math.PI) / 180);
  if (dy <= dx * tan) { const y = (s.a[1] + s.b[1]) / 2; s.a[1] = y; s.b[1] = y; }
  else if (dx <= dy * tan) { const x = (s.a[0] + s.b[0]) / 2; s.a[0] = x; s.b[0] = x; }
}

// Groups walls that touch (an end within 0.15 m of another wall) and drops groups whose total
// length is under `minM`: texture, text and furniture outlines never add up to a building.
function dropSmallNetworks(walls, minM) {
  const parent = walls.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const touch = 0.5;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const minX = Math.min(w.a[0], w.b[0]) - touch, maxX = Math.max(w.a[0], w.b[0]) + touch;
    const minY = Math.min(w.a[1], w.b[1]) - touch, maxY = Math.max(w.a[1], w.b[1]) + touch;
    for (let j = 0; j < walls.length; j++) {
      if (i === j) continue;
      for (const end of ['a', 'b']) {
        const p = walls[j][end];
        if (p[0] < minX || p[0] > maxX || p[1] < minY || p[1] > maxY) continue;
        if (pointSegmentDistance(p, w.a, w.b) <= touch) { parent[find(i)] = find(j); break; }
      }
    }
  }
  const total = new Map();
  walls.forEach((w, i) => { const r = find(i); total.set(r, (total.get(r) || 0) + length(w)); });
  return walls.filter((_, i) => total.get(find(i)) >= minM);
}

// Buckets segment endpoints by 2 m cell so pair searches only look at neighbouring cells.
class EndIndex {
  constructor(segs, cell = 2) {
    this.cell = cell;
    this.map = new Map();
    segs.forEach((s) => { this.add(s, 'a'); this.add(s, 'b'); });
  }
  key(p) { return `${Math.floor(p[0] / this.cell)},${Math.floor(p[1] / this.cell)}`; }
  add(s, end) { const k = this.key(s[end]); if (!this.map.has(k)) this.map.set(k, []); this.map.get(k).push({ s, end }); }
  near(p) {
    const cx = Math.floor(p[0] / this.cell), cy = Math.floor(p[1] / this.cell);
    const out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const l = this.map.get(`${cx + dx},${cy + dy}`);
      if (l) out.push(...l);
    }
    return out;
  }
}

// Merges s and t end to end (farS … farT), carrying both segments' openings onto the new line.
function join(s, t, farS, farT, extraOpening) {
  const merged = { a: farS, b: farT, freeA: false, freeB: false, openings: [] };
  for (const src of [s, t]) for (const o of src.openings) merged.openings.push({ ...o, at: along(merged, pointAt(src, o.at)) });
  if (extraOpening) merged.openings.push({ ...extraOpening, at: along(merged, extraOpening.mid) });
  return merged;
}

// Rounds of greedy merging: each round indexes endpoints, collects every valid pair, sorts them
// by distance and merges the ones that touch no segment already merged this round.
function mergeRounds(segments, findPairs) {
  let segs = segments;
  for (let round = 0; round < 20; round++) {
    const index = new EndIndex(segs);
    const pairs = findPairs(segs, index).sort((p, q) => p.gap - q.gap);
    if (!pairs.length) return segs;
    const used = new Set();
    const next = [];
    for (const pr of pairs) {
      if (used.has(pr.s) || used.has(pr.t)) continue;
      used.add(pr.s); used.add(pr.t);
      next.push(pr.merge());
    }
    segs = segs.filter((s) => !used.has(s)).concat(next);
  }
  return segs;
}

// Joins the closest pairs of facing free ends on collinear segments into one wall with an opening.
function bridgeGaps(segments) {
  return mergeRounds(segments, (segs, index) => {
    const pairs = [];
    for (const s of segs) for (const endS of ['a', 'b']) {
      if (!s[endS === 'a' ? 'freeA' : 'freeB']) continue;
      const p = s[endS], ds = dirOf(s);
      const outward = endS === 'b' ? 1 : -1;
      for (const { s: t, end: endT } of index.near(p)) {
        if (t === s || !t[endT === 'a' ? 'freeA' : 'freeB']) continue;
        const q = t[endT];
        const gap = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (gap < GAP_WINDOW_M[0] || gap > GAP_DOOR_M[1]) continue;
        const dt = dirOf(t);
        if (Math.abs(ds[0] * dt[1] - ds[1] * dt[0]) > sinDeg(15)) continue;
        const g = [(q[0] - p[0]) / gap, (q[1] - p[1]) / gap];
        if (Math.abs(ds[0] * g[1] - ds[1] * g[0]) > sinDeg(20)) continue;
        if ((g[0] * ds[0] + g[1] * ds[1]) * outward < 0) continue;
        const farS = endS === 'a' ? s.b : s.a, farT = endT === 'a' ? t.b : t.a;
        const kind = gap < GAP_WINDOW_M[1] ? 'window' : 'door';
        const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        pairs.push({
          s, t, gap,
          merge: () => {
            const m = join(s, t, farS, farT, { mid, width: gap, kind });
            m.freeA = endS === 'a' ? s.freeB : s.freeA;
            m.freeB = endT === 'a' ? t.freeB : t.freeA;
            axisSnap(m);
            return m;
          },
        });
      }
    }
    return pairs;
  });
}

// A straight wall crossed by partitions comes out of the skeleton in pieces; join pieces that meet
// end to end on the same line.
function mergeCollinear(segments) {
  return mergeRounds(segments, (segs, index) => {
    const pairs = [];
    for (const s of segs) for (const endS of ['a', 'b']) {
      const p = s[endS], ds = dirOf(s);
      for (const { s: t, end: endT } of index.near(p)) {
        if (t === s) continue;
        const q = t[endT];
        const gap = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (gap > 0.08) continue;
        if (Math.abs(ds[0] * dirOf(t)[1] - ds[1] * dirOf(t)[0]) > sinDeg(3)) continue;
        const farS = endS === 'a' ? s.b : s.a, farT = endT === 'a' ? t.b : t.a;
        if (pointToLine(farT, s.a, s.b) > 0.08) continue;
        pairs.push({ s, t, gap, merge: () => join(s, t, farS, farT) });
      }
    }
    return pairs;
  });
}
