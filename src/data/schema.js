// Shape checks for a level JSON file. Returns a list of human-readable problems, empty when valid.

import { LEVEL_BY_ID } from './levels.js';

const MATERIALS = ['enclosure', 'stone', 'timber', 'cob', 'partition'];
const FLOOR_MATERIALS = ['planks', 'dirt', 'flagstone', 'cobbles', 'water', 'thatch'];
const OPENING_KINDS = ['door', 'window', 'arch', 'trapdoor'];
const STAIR_KINDS = ['straight', 'spiral', 'ramp'];
const LIGHT_KINDS = ['hearth', 'lantern', 'candle', 'window'];
const ROOF_MATERIALS = ['tile', 'thatch', 'slate'];

const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const isPolygon = (poly) => Array.isArray(poly) && poly.length >= 3 && poly.every(isPoint);

export function validateLevel(level) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  if (!level || typeof level !== 'object') return ['level is not an object'];
  if (!LEVEL_BY_ID.has(level.id)) err(`unknown level id "${level.id}"`);
  for (const key of ['walls', 'openings', 'floors', 'stairs', 'rooms', 'props', 'lights', 'roofs']) {
    if (!Array.isArray(level[key])) err(`"${key}" must be an array`);
  }
  if (errors.length) return errors;

  const wallIds = new Set();
  level.walls.forEach((w, i) => {
    const name = w.id || `walls[${i}]`;
    if (!w.id) err(`${name}: missing id`);
    else if (wallIds.has(w.id)) err(`${name}: duplicate id`);
    wallIds.add(w.id);
    if (!isPoint(w.a) || !isPoint(w.b)) err(`${name}: endpoints a and b must be [x, z]`);
    if (!MATERIALS.includes(w.material)) err(`${name}: material "${w.material}" not in ${MATERIALS.join('|')}`);
    if (w.h !== undefined && !(Number.isFinite(w.h) && w.h > 0)) err(`${name}: h must be a positive number`);
    if (w.base !== undefined && !Number.isFinite(w.base)) err(`${name}: base must be a number`);
  });
  level.openings.forEach((o, i) => {
    const name = `openings[${i}]`;
    if (!wallIds.has(o.wall)) err(`${name}: unknown wall "${o.wall}"`);
    if (!Number.isFinite(o.at) || !(o.width > 0)) err(`${name}: needs numeric at and positive width`);
    if (!OPENING_KINDS.includes(o.kind)) err(`${name}: kind "${o.kind}" not in ${OPENING_KINDS.join('|')}`);
  });
  level.floors.forEach((f, i) => {
    if (!isPolygon(f.polygon)) err(`floors[${i}]: polygon needs at least three [x, z] points`);
    if (!FLOOR_MATERIALS.includes(f.material)) err(`floors[${i}]: material "${f.material}" not in ${FLOOR_MATERIALS.join('|')}`);
  });
  level.stairs.forEach((s, i) => {
    if (!STAIR_KINDS.includes(s.kind)) err(`stairs[${i}]: kind "${s.kind}" not in ${STAIR_KINDS.join('|')}`);
    if (!isPoint(s.from) || !isPoint(s.to)) err(`stairs[${i}]: from and to must be [x, z]`);
    if (!(s.width > 0)) err(`stairs[${i}]: width must be positive`);
    if (!LEVEL_BY_ID.has(s.toLevel)) err(`stairs[${i}]: unknown toLevel "${s.toLevel}"`);
  });
  level.rooms.forEach((r, i) => {
    if (!Number.isInteger(r.number)) err(`rooms[${i}]: number must be an integer`);
    if (typeof r.name !== 'string' || !r.name) err(`rooms[${i}]: name must be a non-empty string`);
    if (!isPolygon(r.polygon)) err(`rooms[${i}]: polygon needs at least three [x, z] points`);
  });
  level.props.forEach((p, i) => {
    if (typeof p.asset !== 'string' || !p.asset) err(`props[${i}]: asset must be a string`);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) err(`props[${i}]: x and z must be numbers`);
    if (p.rot !== undefined && !Number.isFinite(p.rot)) err(`props[${i}]: rot must be a number`);
  });
  level.lights.forEach((l, i) => {
    if (![l.x, l.y, l.z].every(Number.isFinite)) err(`lights[${i}]: x, y and z must be numbers`);
    if (!LIGHT_KINDS.includes(l.kind)) err(`lights[${i}]: kind "${l.kind}" not in ${LIGHT_KINDS.join('|')}`);
  });
  level.roofs.forEach((r, i) => {
    if (!Array.isArray(r.rect) || r.rect.length !== 4 || !r.rect.every(Number.isFinite)) err(`roofs[${i}]: rect must be [x, z, w, d]`);
    if (!['x', 'z', 'point'].includes(r.ridge)) err(`roofs[${i}]: ridge must be "x", "z" or "point"`);
    if (!(r.pitch > 0 && r.pitch < 90)) err(`roofs[${i}]: pitch must be in degrees between 0 and 90`);
    if (!ROOF_MATERIALS.includes(r.material)) err(`roofs[${i}]: material "${r.material}" not in ${ROOF_MATERIALS.join('|')}`);
    if (!LEVEL_BY_ID.has(r.covers)) err(`roofs[${i}]: unknown covers "${r.covers}"`);
  });
  if (level.silo !== undefined) {
    const s = level.silo;
    if (!isPoint(s.centre) || !(s.radius > 0) || !(s.depth > 0)) err('silo must have centre [x, z], radius and depth');
  }
  return errors;
}
