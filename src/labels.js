import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { LEVEL_BY_ID } from './data/levels.js';
import { centroid } from './build/geometry.js';

const HEIGHT = 1.4;

/** French room names pinned above each room's centre, for the selected level only. */
export class Labels {
  constructor(scene, levelsMap) {
    this.groups = new Map();
    this.level = null;
    this._visible = false;
    for (const [id, json] of levelsMap) {
      const info = LEVEL_BY_ID.get(id);
      if (!info) continue;
      const group = new THREE.Group();
      group.name = `labels ${id}`;
      group.visible = false;
      for (const room of json.rooms ?? []) {
        const div = document.createElement('div');
        div.className = 'room-label';
        div.textContent = room.name;
        const label = new CSS2DObject(div);
        const [x, z] = centroid(room.polygon);
        label.position.set(x, info.elevation + HEIGHT, z);
        group.add(label);
      }
      scene.add(group);
      this.groups.set(id, group);
    }
  }

  setLevel(id) {
    this.level = id;
    this.refresh();
  }

  get visible() {
    return this._visible;
  }

  set visible(v) {
    this._visible = Boolean(v);
    this.refresh();
  }

  toggle() {
    this.visible = !this.visible;
  }

  refresh() {
    for (const [id, group] of this.groups) group.visible = this._visible && id === this.level;
  }
}
