import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Plan symbols every level may place; each needs an entry in src/data/props.json. */
export const REQUIRED_PROPS = [
  'bed_single', 'bed_double', 'table_round', 'table_long', 'bench', 'stool', 'chair',
  'barrel', 'barrel_large', 'vat', 'crate', 'sack', 'shelf', 'counter', 'hearth', 'stove',
  'anvil', 'forge', 'cart', 'hay_bale', 'trough', 'well_ring', 'cistern_lid', 'chest',
  'bathtub', 'rug', 'desk', 'lantern_post', 'sword_rack', 'pulley',
];

const LIVED_IN = {
  bed_single: { drift: 0.1, turn: 3.5 },
  bed_double: { drift: 0.08, turn: 2.5 },
  stool: { drift: 0.14, turn: 9 },
  chair: { drift: 0.12, turn: 7 },
  bench: { drift: 0.08, turn: 3 },
  table_round: { drift: 0.07, turn: 4 },
  table_small: { drift: 0.06, turn: 3 },
  barrel: { drift: 0.1, turn: 7 },
  barrel_large: { drift: 0.08, turn: 5 },
  keg: { drift: 0.08, turn: 6 },
  crate: { drift: 0.09, turn: 5 },
  crate_small: { drift: 0.11, turn: 7 },
  trunk: { drift: 0.06, turn: 4 },
  hay_bale: { drift: 0.1, turn: 5 },
  sack: { drift: 0.12, turn: 8 },
};

const CRAFTED_PROPS = new Set(['hearth', 'stove', 'forge', 'trough', 'well_ring', 'cistern_lid', 'sack', 'pulley']);

const fract = (n) => n - Math.floor(n);
const stableUnit = (text, salt) => {
  let seed = 23 + salt * 97;
  for (const char of text) seed = ((seed * 33) ^ char.charCodeAt(0)) >>> 0;
  return fract(Math.sin(seed * 0.000013 + salt * 31.7) * 43758.5453);
};

/** Micro-variation that keeps the plan placement legible while removing copy/paste alignment. */
export function naturalTransform(prop, levelId = '') {
  const profile = LIVED_IN[prop.asset];
  if (!profile) return { x: prop.x, z: prop.z, rot: prop.rot ?? 0, scale: 1 };
  const key = `${levelId}:${prop.asset}:${prop.x}:${prop.z}:${prop.rot ?? 0}`;
  const angle = stableUnit(key, 1) * Math.PI * 2;
  const radius = profile.drift * (0.35 + stableUnit(key, 2) * 0.65);
  return {
    x: prop.x + Math.cos(angle) * radius,
    z: prop.z + Math.sin(angle) * radius,
    rot: (prop.rot ?? 0) + (stableUnit(key, 3) * 2 - 1) * profile.turn,
    scale: 0.97 + stableUnit(key, 4) * 0.06,
  };
}

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

function craftedPrimitive(asset, entry, matFor, levelId, scale) {
  const [w, d] = entry.footprint.map((value) => value * scale);
  const h = (entry.height ?? 1) * scale;
  const group = new THREE.Group();
  const material = (name = entry.material ?? 'timber') => matFor(name, levelId);
  const box = (size, position, name = entry.material ?? 'timber') => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(name));
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  if (asset === 'hearth') {
    box([w, h * 0.12, d], [0, h * 0.06, 0], 'stone');
    box([w * 0.18, h * 0.58, d], [-w * 0.41, h * 0.36, 0], 'stone');
    box([w * 0.18, h * 0.58, d], [w * 0.41, h * 0.36, 0], 'stone');
    box([w, h * 0.16, d], [0, h * 0.67, 0], 'stone');
    box([w * 0.64, h * 0.3, d * 0.72], [0, h * 0.87, d * 0.08], 'stone');
    box([w * 0.64, h * 0.42, 0.035], [0, h * 0.37, -d * 0.48], 'cut');
    box([w * 0.48, h * 0.055, d * 0.52], [0, h * 0.16, 0], 'windowGlow');
    return group;
  }
  if (asset === 'stove') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.38, w * 0.43, h * 0.74, 9), material('stone'));
    body.position.y = h * 0.37;
    group.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.45, w * 0.45, h * 0.08, 9), material('cut'));
    top.position.y = h * 0.77;
    group.add(top);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.09, w * 0.1, h * 0.62, 8), material('cut'));
    pipe.position.set(0, h * 1.08, -d * 0.18);
    group.add(pipe);
    return group;
  }
  if (asset === 'forge') {
    box([w, h * 0.58, d], [0, h * 0.29, 0], 'stone');
    box([w * 0.82, h * 0.08, d * 0.78], [0, h * 0.61, 0], 'cut');
    const coals = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.28, Math.min(w, d) * 0.34, h * 0.08, 9), material('windowGlow'));
    coals.position.y = h * 0.68;
    group.add(coals);
    return group;
  }
  if (asset === 'trough') {
    box([w, h * 0.12, d], [0, h * 0.06, 0], 'planks');
    box([w, h * 0.72, d * 0.13], [0, h * 0.42, -d * 0.44], 'planks');
    box([w, h * 0.72, d * 0.13], [0, h * 0.42, d * 0.44], 'planks');
    box([d * 0.13, h * 0.72, d * 0.75], [-w * 0.47, h * 0.42, 0], 'planks');
    box([d * 0.13, h * 0.72, d * 0.75], [w * 0.47, h * 0.42, 0], 'planks');
    return group;
  }
  if (asset === 'well_ring') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.38, w * 0.12, 6, 16), material('stone'));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = h * 0.55;
    group.add(ring);
    box([w * 0.14, h, d * 0.14], [-w * 0.43, h * 0.5, 0], 'timber');
    box([w * 0.14, h, d * 0.14], [w * 0.43, h * 0.5, 0], 'timber');
    box([w, h * 0.14, d * 0.14], [0, h, 0], 'timber');
    return group;
  }
  if (asset === 'cistern_lid') {
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.5, h, 16), material('planks'));
    lid.position.y = h / 2;
    group.add(lid);
    box([w * 0.82, h * 0.35, d * 0.1], [0, h * 0.72, 0], 'timber');
    const cross = box([w * 0.82, h * 0.35, d * 0.1], [0, h * 0.74, 0], 'timber');
    cross.rotation.y = Math.PI / 2;
    return group;
  }
  if (asset === 'sack') {
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), material('thatch'));
    sack.scale.set(w, h, d);
    sack.position.y = h * 0.48;
    sack.rotation.z = 0.08;
    group.add(sack);
    return group;
  }
  if (asset === 'pulley') {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(w * 0.36, w * 0.11, 6, 12), material('timber'));
    wheel.position.y = h * 0.55;
    group.add(wheel);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.09, w * 0.09, d, 8), material('timber'));
    axle.rotation.x = Math.PI / 2;
    axle.position.y = h * 0.55;
    group.add(axle);
    return group;
  }
  return null;
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
    const natural = model || CRAFTED_PROPS.has(prop.asset)
      ? naturalTransform(prop, levelInfo.id)
      : { x: prop.x, z: prop.z, rot: prop.rot ?? 0, scale: 1 };
    const yaw = (-natural.rot * Math.PI) / 180;
    let object;
    if (model) {
      const inner = model.scene.clone(true);
      const box = new THREE.Box3().setFromObject(inner);
      const fit = fitTransform({ min: box.min.toArray(), max: box.max.toArray() }, entry.footprint);
      const s = fit.scale * (prop.scale ?? 1) * natural.scale;
      // Scale about the model's own bounding box so its footprint centre lands on (x, z).
      inner.scale.setScalar(s);
      inner.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
      object = new THREE.Group();
      object.add(inner);
      object.position.set(natural.x, 0, natural.z);
      object.rotation.y = yaw + ((entry.yaw ?? 0) * Math.PI) / 180;
    } else {
      const k = (prop.scale ?? 1) * natural.scale;
      const [w, d] = entry.footprint.map((v) => v * k);
      const h = (entry.height ?? 1) * k;
      object = craftedPrimitive(prop.asset, entry, this.matFor, levelInfo.id, k);
      if (!object) {
        const geometry = entry.shape === 'cylinder'
          ? new THREE.CylinderGeometry(w / 2, w / 2, h, 24)
          : new THREE.BoxGeometry(w, h, d);
        object = new THREE.Mesh(geometry, this.matFor(entry.material ?? 'timber', levelInfo.id));
        object.position.y = h / 2;
      }
      object.position.x = natural.x;
      object.position.z = natural.z;
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
