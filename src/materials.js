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
  water: '#1f3a44',
  tile: '#8e4a34',
  thatch: '#b89b5a',
  slate: '#4e5560',
  windowGlow: '#ffb347',
  gold: '#c9a227',
  silver: '#c8ccd4',
  cut: '#1c1a1f',
  plinth: '#4f5258',
  ember: '#ff6a1a',
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

/**
 * Optional textures per material name: { map, normalMap, metres }, where `metres` is the size one
 * tile of the texture covers (UVs are in metres on walls and floors). Empty by default, so the
 * look is flat colour until a map is declared with `setMaterialMaps`.
 */
export const MATERIAL_MAPS = {};

/** Declares (or replaces) the maps of a material name; every existing level copy follows. */
export function setMaterialMaps(name, { map = null, normalMap = null, metres = 1 } = {}) {
  for (const tex of [map, normalMap]) {
    if (!tex) continue;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / metres, 1 / metres);
  }
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  MATERIAL_MAPS[name] = { map, normalMap, metres };
  for (const [key, material] of cache) if (key.startsWith(`${name}|`)) applyMaps(material, name);
}

function applyMaps(material, name) {
  const maps = MATERIAL_MAPS[name];
  if (!maps) return;
  material.map = maps.map;
  material.normalMap = maps.normalMap;
  material.needsUpdate = true;
}

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
  if (name === 'water') {
    // Dark and glossy: the moon and the lanterns glint on it.
    material.flatShading = false;
    material.roughness = 0.18;
    material.metalness = 0.25;
  }
  if (name === 'windowGlow' || name === 'ember') {
    material.emissive = new THREE.Color(color);
    material.emissiveIntensity = name === 'ember' ? 1.3 : 1.6;
  }
  material.name = key;
  material.userData.palette = true;
  applyMaps(material, name);
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

// Models from one pack share an atlas but each carries its own material instance; what the GPU
// cares about is the texture, the colours and the blend state, so that is the identity used.
function signature(m) {
  const tex = (t) => (t ? t.uuid : '-');
  return [m.type, tex(m.map), tex(m.emissiveMap), tex(m.normalMap), m.color?.getHex() ?? '-', m.emissive?.getHex() ?? '-',
    m.emissiveIntensity ?? '-', m.roughness ?? '-', m.metalness ?? '-', m.transparent ? 1 : 0, m.side, m.vertexColors ? 1 : 0].join('|');
}

/**
 * Returns this level's copy of a material that came from elsewhere (a glTF model): one clone per
 * (source, level), transparent so the level fade can drive it. Materials made by `materialFor`
 * already belong to a level and come back unchanged.
 */
export function adoptMaterial(material, levelId) {
  if (cache.get(material.name) === material) return material;
  const key = `${signature(material)}|${levelId}`;
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
