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
  if (!level || typeof level !== 'object') return ['le niveau n\'est pas un objet'];
  if (!LEVEL_BY_ID.has(level.id)) err(`niveau inconnu « ${level.id} »`);
  for (const key of ['walls', 'openings', 'floors', 'stairs', 'rooms', 'props', 'lights', 'roofs']) {
    if (!Array.isArray(level[key])) err(`« ${key} » doit être un tableau`);
  }
  if (errors.length) return errors;

  const wallIds = new Set();
  level.walls.forEach((w, i) => {
    const name = w.id || `walls[${i}]`;
    if (!w.id) err(`${name} : id manquant`);
    else if (wallIds.has(w.id)) err(`${name} : id en double`);
    wallIds.add(w.id);
    if (!isPoint(w.a) || !isPoint(w.b)) err(`${name} : les extrémités a et b doivent être [x, z]`);
    if (!MATERIALS.includes(w.material)) err(`${name} : matériau « ${w.material} » hors de ${MATERIALS.join('|')}`);
    if (w.h !== undefined && !(Number.isFinite(w.h) && w.h > 0)) err(`${name} : h doit être un nombre positif`);
    if (w.base !== undefined && !Number.isFinite(w.base)) err(`${name} : base doit être un nombre`);
  });
  level.openings.forEach((o, i) => {
    const name = `openings[${i}]`;
    if (!wallIds.has(o.wall)) err(`${name} : mur inconnu « ${o.wall} »`);
    if (!Number.isFinite(o.at) || !(o.width > 0)) err(`${name} : at doit être un nombre et width positif`);
    if (!OPENING_KINDS.includes(o.kind)) err(`${name} : kind « ${o.kind} » hors de ${OPENING_KINDS.join('|')}`);
  });
  level.floors.forEach((f, i) => {
    if (!isPolygon(f.polygon)) err(`floors[${i}] : polygon doit avoir au moins trois points [x, z]`);
    if (!FLOOR_MATERIALS.includes(f.material)) err(`floors[${i}] : matériau « ${f.material} » hors de ${FLOOR_MATERIALS.join('|')}`);
  });
  level.stairs.forEach((s, i) => {
    if (!STAIR_KINDS.includes(s.kind)) err(`stairs[${i}] : kind « ${s.kind} » hors de ${STAIR_KINDS.join('|')}`);
    if (!isPoint(s.from) || !isPoint(s.to)) err(`stairs[${i}] : from et to doivent être [x, z]`);
    if (!(s.width > 0)) err(`stairs[${i}] : width doit être positif`);
    if (!LEVEL_BY_ID.has(s.toLevel)) err(`stairs[${i}] : toLevel inconnu « ${s.toLevel} »`);
  });
  level.rooms.forEach((r, i) => {
    if (!Number.isInteger(r.number)) err(`rooms[${i}] : number doit être un entier`);
    if (typeof r.name !== 'string' || !r.name) err(`rooms[${i}] : name doit être une chaîne non vide`);
    if (!isPolygon(r.polygon)) err(`rooms[${i}] : polygon doit avoir au moins trois points [x, z]`);
  });
  level.props.forEach((p, i) => {
    if (typeof p.asset !== 'string' || !p.asset) err(`props[${i}] : asset doit être une chaîne`);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) err(`props[${i}] : x et z doivent être des nombres`);
    if (p.rot !== undefined && !Number.isFinite(p.rot)) err(`props[${i}] : rot doit être un nombre`);
  });
  level.lights.forEach((l, i) => {
    if (![l.x, l.y, l.z].every(Number.isFinite)) err(`lights[${i}] : x, y et z doivent être des nombres`);
    if (!LIGHT_KINDS.includes(l.kind)) err(`lights[${i}] : kind « ${l.kind} » hors de ${LIGHT_KINDS.join('|')}`);
  });
  level.roofs.forEach((r, i) => {
    if (!Array.isArray(r.rect) || r.rect.length !== 4 || !r.rect.every(Number.isFinite)) err(`roofs[${i}] : rect doit être [x, z, w, d]`);
    if (!['x', 'z', 'point'].includes(r.ridge)) err(`roofs[${i}] : ridge doit être « x », « z » ou « point »`);
    if (!(r.pitch > 0 && r.pitch < 90)) err(`roofs[${i}] : pitch doit être un angle en degrés entre 0 et 90`);
    if (!ROOF_MATERIALS.includes(r.material)) err(`roofs[${i}] : matériau « ${r.material} » hors de ${ROOF_MATERIALS.join('|')}`);
    if (!LEVEL_BY_ID.has(r.covers)) err(`roofs[${i}] : covers inconnu « ${r.covers} »`);
  });
  if (level.silo !== undefined) {
    const s = level.silo;
    if (!isPoint(s.centre) || !(s.radius > 0) || !(s.depth > 0)) err('silo doit avoir centre [x, z], radius et depth');
  }
  return errors;
}
