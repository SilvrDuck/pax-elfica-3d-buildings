import * as THREE from 'three';
import { LEVELS, LEVEL_BY_ID, levelIndex } from './data/levels.js';
import { levelMaterials } from './materials.js';
import { buildWall } from './build/walls.js';
import { buildFloor } from './build/floors.js';
import { buildStair } from './build/stairs.js';
import { buildRoof } from './build/roofs.js';
import { buildSilo } from './build/silo.js';
import { buildLight } from './lighting.js';
import { mergeLevelGroup } from './build/merge.js';

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
    for (const floor of json.floors ?? []) group.add(buildFloor(floor, info, this.matFor));
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
    for (const info of LEVELS) {
      this.setShown(info.id, this.groups.get(info.id), levels.has(info.id), animate);
      this.setShown(roofKey(info.id), this.roofGroups.get(info.id), roofsCovering.has(info.id), animate);
    }
    this.dispatchEvent(new CustomEvent('change', { detail: { id } }));
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
