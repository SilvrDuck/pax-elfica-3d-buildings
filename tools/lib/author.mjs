// Authoring helpers for level data written in plan-grid cells.
//
// A point is [col, row] on the sheet grid (1.5 m cells, fractional values allowed); the grid
// origin comes from src/data/calibration.json. Everything is converted to world metres on output.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT = path.resolve(HERE, '..', '..');
const calibration = JSON.parse(readFileSync(path.join(PROJECT, 'src', 'data', 'calibration.json'), 'utf8'));
const legendSource = readFileSync(path.join(PROJECT, 'src', 'data', 'legend.js'), 'utf8');
const LEGEND = Object.fromEntries([...legendSource.matchAll(/^\s+(\d+): (['"])(.*)\2,?$/gm)].map((m) => [Number(m[1]), m[3]]));

export const CELL = calibration.cellM;
const [GX, GZ] = calibration.gridOrigin;
const r2 = (v) => Math.round(v * 100) / 100;

/** Grid cell point → world [x, z] in metres. */
export const pt = ([c, r]) => [r2(GX + CELL * c), r2(GZ + CELL * r)];
/** Cell distance → metres. */
export const m = (cells) => r2(cells * CELL);

export class Level {
  constructor(id) {
    this.id = id;
    this.json = { id, walls: [], openings: [], floors: [], stairs: [], rooms: [], props: [], lights: [], roofs: [] };
    this.n = 0;
    this.byId = new Map();
  }

  /** Wall between two cell points. `h` (metres) overrides the storey height. */
  wall(a, b, material = 'stone', { id, h } = {}) {
    const wid = id ?? `w${++this.n}`;
    const w = { id: wid, a: pt(a), b: pt(b), material };
    if (h) w.h = h;
    this.json.walls.push(w);
    this.byId.set(wid, w);
    return wid;
  }

  /** Chain of walls through consecutive cell points. Returns the ids. */
  chain(points, material = 'stone', opts = {}) {
    const ids = [];
    for (let i = 0; i + 1 < points.length; i++) ids.push(this.wall(points[i], points[i + 1], material, opts));
    return ids;
  }

  /** Opening centred at the cell point projected onto the wall; width in metres. */
  opening(wallId, at, widthM, kind = 'door', extra = {}) {
    const w = this.byId.get(wallId);
    if (!w) throw new Error(`${this.id}: no wall ${wallId}`);
    const [x, z] = pt(at);
    const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1];
    const len = Math.hypot(dx, dz);
    const along = ((x - w.a[0]) * dx + (z - w.a[1]) * dz) / len;
    const off = Math.abs((x - w.a[0]) * dz - (z - w.a[1]) * dx) / len;
    if (off > 0.4) throw new Error(`${this.id}: opening at [${at}] is ${off.toFixed(2)} m off wall ${wallId}`);
    this.json.openings.push({ wall: wallId, at: r2(along), width: widthM, kind, ...extra });
  }

  door(wallId, at, widthM = 1.0) { this.opening(wallId, at, widthM, 'door'); }
  window(wallId, at, widthM = 0.8, extra = {}) { this.opening(wallId, at, widthM, 'window', extra); }
  arch(wallId, at, widthM = 3.0) { this.opening(wallId, at, widthM, 'arch'); }

  floor(polygon, material) {
    this.json.floors.push({ polygon: polygon.map(pt), material });
  }

  room(number, polygon, name = LEGEND[number]) {
    if (!name) throw new Error(`${this.id}: room ${number} has no legend name`);
    this.json.rooms.push({ number, name, polygon: polygon.map(pt) });
  }

  stair(kind, from, to, widthM, toLevel) {
    this.json.stairs.push({ kind, from: pt(from), to: pt(to), width: widthM, toLevel });
  }

  prop(asset, at, rot = 0, extra = {}) {
    const [x, z] = pt(at);
    this.json.props.push({ asset, x, z, rot, ...extra });
  }

  light(at, y, kind) {
    const [x, z] = pt(at);
    this.json.lights.push({ x, y, z, kind });
  }

  /** Roof over a cell rect [col, row, cols, rows]. */
  roof([c, r, cw, rh], ridge, pitch, material, covers) {
    const [x, z] = pt([c, r]);
    this.json.roofs.push({ rect: [x, z, m(cw), m(rh)], ridge, pitch, material, covers });
  }

  write() {
    const dir = path.join(PROJECT, 'src', 'data', 'levels');
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${this.id}.json`);
    writeFileSync(file, JSON.stringify(this.json, null, 1) + '\n');
    const j = this.json;
    console.log(`${path.relative(PROJECT, file)}: ${j.walls.length} walls, ${j.openings.length} openings, ${j.floors.length} floors, ${j.rooms.length} rooms, ${j.stairs.length} stairs, ${j.props.length} props, ${j.lights.length} lights, ${j.roofs.length} roofs`);
  }
}
