import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Plan symbols every level may place; each needs an entry in src/data/props.json. */
export const REQUIRED_PROPS = [
  'bed_single', 'bed_double', 'table_round', 'table_long', 'bench', 'stool', 'chair',
  'barrel', 'barrel_large', 'vat', 'crate', 'sack', 'shelf', 'counter', 'hearth', 'stove',
  'anvil', 'forge', 'cart', 'hay_bale', 'trough', 'well_ring', 'cistern_lid', 'chest',
  'bathtub', 'rug', 'desk', 'lantern_post', 'sword_rack', 'pulley',
];

/**
 * Uniform scale that makes a model's XZ bounding box match `footprint` = [w, d], and the lift that
 * puts its base at y = 0.
 */
export function fitTransform(bbox, footprint) {
  const w = bbox.max[0] - bbox.min[0] || 1;
  const d = bbox.max[2] - bbox.min[2] || 1;
  const scale = Math.min(footprint[0] / w, footprint[1] / d);
  return { scale, offsetY: -bbox.min[1] * scale };
}

/**
 * Loads each distinct glTF once and places props as instanced copies per level. A model that
 * fails to load (or a `primitive` entry) is a box of the declared footprint.
 */
export class PropLibrary {
  constructor(catalog, { load, matFor, baseUrl = '' } = {}) {
    this.catalog = catalog;
    this.matFor = matFor;
    this.baseUrl = baseUrl;
    this.models = new Map();
    const loader = load ?? defaultLoader();
    const files = new Map();
    const pending = [];
    for (const [id, entry] of Object.entries(catalog)) {
      if (entry.pack === 'primitive' || !entry.file) continue;
      const url = `${baseUrl}assets/${entry.pack}/${entry.file}`;
      if (!files.has(url)) {
        files.set(url, loader(url).catch((err) => {
          console.warn(`Modèle ${id} introuvable (${url}) : ${err.message}. Un volume de substitution le remplace.`);
          return null;
        }));
      }
      pending.push(files.get(url).then((model) => { if (model) this.models.set(id, model); }));
    }
    this.ready = Promise.all(pending).then(() => this);
  }

  static load(catalog, options) {
    return new PropLibrary(catalog, options).ready;
  }

  /** Adds `prop` = { asset, x, z, rot, scale? } to a level group, level-local coordinates. */
  place(group, prop, levelInfo) {
    const entry = this.catalog[prop.asset];
    if (!entry) {
      console.warn(`Meuble inconnu dans le catalogue : ${prop.asset}`);
      return null;
    }
    const model = this.models.get(prop.asset);
    const yaw = (-(prop.rot ?? 0) * Math.PI) / 180;
    let object;
    if (model) {
      const inner = model.scene.clone(true);
      const box = new THREE.Box3().setFromObject(inner);
      const fit = fitTransform({ min: box.min.toArray(), max: box.max.toArray() }, entry.footprint);
      const s = fit.scale * (prop.scale ?? 1);
      // Scale about the model's own bounding box so its footprint centre lands on (x, z).
      inner.scale.setScalar(s);
      inner.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
      object = new THREE.Group();
      object.add(inner);
      object.position.set(prop.x, 0, prop.z);
      object.rotation.y = yaw + ((entry.yaw ?? 0) * Math.PI) / 180;
    } else {
      const k = prop.scale ?? 1;
      const [w, d] = entry.footprint.map((v) => v * k);
      const h = (entry.height ?? 1) * k;
      const geometry = entry.shape === 'cylinder'
        ? new THREE.CylinderGeometry(w / 2, w / 2, h, 24)
        : new THREE.BoxGeometry(w, h, d);
      object = new THREE.Mesh(geometry, this.matFor(entry.material ?? 'timber', levelInfo.id));
      object.position.set(prop.x, h / 2, prop.z);
      object.rotation.y = yaw;
    }
    object.name = prop.asset;
    group.add(object);
    return object;
  }
}

function defaultLoader() {
  const gltf = new GLTFLoader();
  return (url) => gltf.loadAsync(url);
}
