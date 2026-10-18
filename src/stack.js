import * as THREE from 'three';
import { LEVELS, LEVEL_BY_ID, levelIndex } from './data/levels.js';
import { levelMaterials, setSubdued } from './materials.js';
import { buildWall } from './build/walls.js';
import { buildFloor } from './build/floors.js';
import { buildStair } from './build/stairs.js';
import { buildRoof } from './build/roofs.js';
import { buildSilo } from './build/silo.js';
import { buildLight } from './lighting.js';
import { mergeLevelGroup } from './build/merge.js';
import { subdivide, bakeFloorOcclusion } from './build/ao.js';
import { polygonArea } from './build/geometry.js';

// Rooms and the courtyard get a fine mesh for the contact occlusion; the street, the river and
// the ground beyond the enclosure are large and nearly unoccluded, a coarse mesh is enough.
const FLOOR_CELL_M = 0.6;
const COARSE_CELL_M = 2.5;
const COARSE_ABOVE_M2 = 150;

const FADE_MS = 300;

/** Which levels and which roofs (by the storey they cover) are shown for a selection. */
export function visibleSet(selectedId) {
  const sel = levelIndex(selectedId);
  const levels = new Set(LEVELS.filter((_, i) => i <= sel).map((l) => l.id));
  const roofsCovering = new Set(LEVELS.filter((l) => levelIndex(l.id) < sel).map((l) => l.id));
  return { levels, roofsCovering };
}

/** The level `delta` steps up (+1) or down (−1), clamped to the stack. */
export function stepLevel(id, delta) {
  const i = Math.max(0, Math.min(LEVELS.length - 1, levelIndex(id) + delta));
  return LEVELS[i].id;
}

const roofKey = (covers) => `roofs:${covers}`;

/**
 * Owns one group per level (translated to its elevation) plus one group per covered storey for
 * roofs, and implements peeling with a short opacity fade.
 */
export class LevelStack extends EventTarget {
  constructor(scene, levelsMap, { matFor, propLibrary = null } = {}) {
    super();
    this.scene = scene;
    this.matFor = matFor;
    this.propLibrary = propLibrary;
    this.groups = new Map();
    this.roofGroups = new Map();
    this.shown = new Map();
    this.opacity = new Map();
    this.tweens = new Map();
    this.subdued = new Map();
    this.subduedTweens = new Map();
    this._selected = 'toits';
    for (const info of LEVELS) {
      const group = new THREE.Group();
      group.name = info.id;
      group.position.y = info.elevation;
      scene.add(group);
      this.groups.set(info.id, group);
      const roofs = new THREE.Group();
      roofs.name = roofKey(info.id);
      roofs.position.y = info.elevation + info.height;
      scene.add(roofs);
      this.roofGroups.set(info.id, roofs);
      this.shown.set(info.id, true);
      this.shown.set(roofKey(info.id), true);
    }
    for (const [id, json] of levelsMap) this.build(id, json);
    for (const [covers, roofs] of this.roofGroups) if (roofs.children.length) mergeLevelGroup(roofs, roofKey(covers));
  }

  build(id, json) {
    const info = LEVEL_BY_ID.get(id);
    const group = this.groups.get(id);
    if (!info || !group) return;
    const openingsByWall = new Map();
    for (const o of json.openings ?? []) openingsByWall.set(o.wall, [...(openingsByWall.get(o.wall) ?? []), o]);
    for (const wall of json.walls ?? []) group.add(buildWall(wall, openingsByWall.get(wall.id) ?? [], info, this.matFor));
    const occluders = {
      walls: json.walls ?? [],
      props: (json.props ?? []).map((p) => ({ x: p.x, z: p.z, footprint: this.propLibrary?.catalog?.[p.asset]?.footprint })),
    };
    for (const floor of json.floors ?? []) {
      const mesh = buildFloor(floor, info, this.matFor);
      mesh.geometry = subdivide(mesh.geometry, polygonArea(floor.polygon) > COARSE_ABOVE_M2 ? COARSE_CELL_M : FLOOR_CELL_M);
      mesh.updateMatrix();
      bakeFloorOcclusion(mesh, occluders);
      group.add(mesh);
    }
    for (const stair of json.stairs ?? []) group.add(buildStair(stair, info, this.matFor));
    for (const light of json.lights ?? []) {
      const point = buildLight(light, { elevation: 0 });
      group.add(point);
    }
    if (this.propLibrary) for (const prop of json.props ?? []) this.propLibrary.place(group, prop, info);
    for (const roof of json.roofs ?? []) {
      const covers = roof.covers;
      const mesh = buildRoof(roof, (name) => this.matFor(name, roofKey(covers)));
      this.roofGroups.get(covers)?.add(mesh);
    }
    if (json.silo) {
      // The shaft belongs to the lowest level so it stays when everything above is peeled.
      const silo = buildSilo(json.silo, this.matFor);
      const bottom = this.groups.get('silo2');
      silo.position.y = -bottom.position.y;
      bottom.add(silo);
    }
    mergeLevelGroup(group, id);
  }

  get selected() {
    return this._selected;
  }

  group(id) {
    return this.groups.get(id);
  }

  select(id, { animate = true } = {}) {
    if (!LEVEL_BY_ID.has(id)) return;
    this._selected = id;
    const { levels, roofsCovering } = visibleSet(id);
    const sel = levelIndex(id);
    for (const info of LEVELS) {
      this.setShown(info.id, this.groups.get(info.id), levels.has(info.id), animate);
      this.setShown(roofKey(info.id), this.roofGroups.get(info.id), roofsCovering.has(info.id), animate);
      // Everything under the active level is a supporting role: same hue, less light.
      const below = id !== 'toits' && levelIndex(info.id) < sel;
      this.setSubdued(info.id, below, animate);
      this.setSubdued(roofKey(info.id), below && levelIndex(info.id) < sel - 1, animate);
    }
    this.dispatchEvent(new CustomEvent('change', { detail: { id } }));
  }

  /** World-space bounds of every level's geometry. */
  allBounds() {
    const box = new THREE.Box3();
    for (const id of this.groups.keys()) box.union(this.bounds(id));
    for (const roofs of this.roofGroups.values()) { roofs.updateMatrixWorld(true); roofs.traverse((o) => { if (o.isMesh) box.expandByObject(o); }); }
    return box;
  }

  /** World-space bounds of a level's own geometry (lights excluded). */
  bounds(id) {
    const group = this.groups.get(id);
    const box = new THREE.Box3();
    group.updateMatrixWorld(true);
    group.traverse((o) => { if (o.isMesh) box.expandByObject(o); });
    return box;
  }

  setSubdued(key, on, animate) {
    const to = on ? 1 : 0;
    const from = this.subdued.get(key) ?? 0;
    if (from === to) return;
    const materials = levelMaterials(key);
    this.subduedTweens.get(key)?.cancel();
    if (!animate || typeof requestAnimationFrame !== 'function') {
      for (const m of materials) setSubdued(m, to);
      this.subdued.set(key, to);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      const value = from + (to - from) * t * (2 - t);
      for (const m of materials) setSubdued(m, value);
      this.subdued.set(key, value);
      if (t < 1) frame = requestAnimationFrame(tick); else this.subduedTweens.delete(key);
    };
    frame = requestAnimationFrame(tick);
    this.subduedTweens.set(key, { cancel: () => cancelAnimationFrame(frame) });
  }

  setShown(key, group, show, animate) {
    if (this.shown.get(key) === show) return;
    this.shown.set(key, show);
    const materials = levelMaterials(key);
    this.tweens.get(key)?.cancel();
    const to = show ? 1 : 0;
    if (!animate || typeof requestAnimationFrame !== 'function') {
      group.visible = show;
      for (const m of materials) m.opacity = 1;
      this.opacity.set(key, to);
      return;
    }
    // A fade picks up from wherever the previous one stopped; the materials are set before the
    // group becomes visible so no frame shows the level at full opacity.
    const from = this.opacity.get(key) ?? (show ? 0 : 1);
    for (const m of materials) m.opacity = from;
    group.visible = true;
    const start = performance.now();
    const span = FADE_MS * Math.abs(to - from);
    let frame = 0;
    const tick = (now) => {
      const t = span ? Math.min(1, (now - start) / span) : 1;
      const eased = t * (2 - t);
      const value = from + (to - from) * eased;
      for (const m of materials) m.opacity = value;
      this.opacity.set(key, value);
      if (t < 1) frame = requestAnimationFrame(tick);
      else { group.visible = show; for (const m of materials) m.opacity = 1; this.tweens.delete(key); }
    };
    frame = requestAnimationFrame(tick);
    this.tweens.set(key, { cancel: () => cancelAnimationFrame(frame) });
  }
}
