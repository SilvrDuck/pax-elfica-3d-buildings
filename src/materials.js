import * as THREE from 'three';

/** Flat colours of the low-poly palette, by material name. */
export const PALETTE = {
  enclosure: '#6e6a66',
  stone: '#7a7f85',
  timber: '#6b4a2b',
  cob: '#d9c6a3',
  partition: '#c9b48e',
  planks: '#a9783f',
  dirt: '#8a6b45',
  flagstone: '#7d7b74',
  cobbles: '#6f7f78',
  water: '#3d6b74',
  tile: '#8e4a34',
  thatch: '#b89b5a',
  slate: '#4e5560',
  windowGlow: '#ffb347',
  gold: '#c9a227',
  silver: '#c8ccd4',
  cut: '#1c1a1f',
};

/** A level that is not the active one recedes: same hue, less saturation, less light. */
export function subduedColor(color) {
  const hsl = {};
  color.getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, hsl.s * 0.4, Math.max(0.06, hsl.l * 0.55));
}

/** Blends a material between its base look (t = 0) and its subdued look (t = 1). */
export function setSubdued(material, t) {
  const u = material.userData;
  if (!u.baseColor) rememberBase(material);
  material.color.lerpColors(u.baseColor, u.subduedColor, t);
  if (u.baseEmissive !== undefined) material.emissiveIntensity = u.baseEmissive * (1 - 0.7 * t);
}

function rememberBase(material) {
  const u = material.userData;
  u.baseColor = material.color.clone();
  u.subduedColor = subduedColor(material.color);
  if (material.emissive && material.emissiveIntensity) u.baseEmissive = material.emissiveIntensity;
}

/** Floor materials carry the baked contact occlusion as vertex colours. */
export const FLOORS = new Set(['planks', 'dirt', 'flagstone', 'cobbles', 'water', 'thatch']);

const cache = new Map();
const byLevel = new Map();

/**
 * One material per (name, level): levels fade independently, so each owns its material instances.
 * Materials start transparent at full opacity so a fade only has to drive `opacity`.
 */
export function materialFor(name, levelId = 'shared') {
  const key = `${name}|${levelId}`;
  if (cache.has(key)) return cache.get(key);
  const color = PALETTE[name] ?? PALETTE.stone;
  const material = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    transparent: true,
    opacity: 1,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: FLOORS.has(name),
  });
  if (name === 'windowGlow') {
    material.emissive = new THREE.Color(color);
    material.emissiveIntensity = 1.6;
  }
  material.name = key;
  rememberBase(material);
  cache.set(key, material);
  if (!byLevel.has(levelId)) byLevel.set(levelId, []);
  byLevel.get(levelId).push(material);
  return material;
}

/** Every material created for a level, for fading it as one. */
export function levelMaterials(levelId) {
  return byLevel.get(levelId) ?? [];
}

const adopted = new Map();

/**
 * Returns this level's copy of a material that came from elsewhere (a glTF model): one clone per
 * (source, level), transparent so the level fade can drive it. Materials made by `materialFor`
 * already belong to a level and come back unchanged.
 */
export function adoptMaterial(material, levelId) {
  if (cache.get(material.name) === material) return material;
  const key = `${material.uuid}|${levelId}`;
  if (adopted.has(key)) return adopted.get(key);
  const copy = material.clone();
  copy.transparent = true;
  copy.opacity = 1;
  copy.name = `${material.name || 'gltf'}|${levelId}`;
  rememberBase(copy);
  adopted.set(key, copy);
  if (!byLevel.has(levelId)) byLevel.set(levelId, []);
  byLevel.get(levelId).push(copy);
  return copy;
}
