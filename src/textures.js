import * as THREE from 'three';
import { setMaterialMaps } from './materials.js';

/**
 * Declares the textures of `src/data/textures.json`: { <material>: { map, normalMap?, metres } },
 * paths relative to `public/`. Each file loads once; a missing file is reported and its material
 * stays flat colour.
 */
export async function loadTextureCatalog(catalog, { load = defaultLoader(), baseUrl = '' } = {}) {
  const files = new Map();
  const fetch = (path) => {
    const url = baseUrl + path;
    if (!files.has(url)) files.set(url, load(url));
    return files.get(url);
  };
  await Promise.all(Object.entries(catalog).map(async ([name, entry]) => {
    try {
      const [map, normalMap] = await Promise.all([entry.map ? fetch(entry.map) : null, entry.normalMap ? fetch(entry.normalMap) : null]);
      setMaterialMaps(name, { map, normalMap, metres: entry.metres ?? 1 });
    } catch (err) {
      console.warn(`Texture de « ${name} » introuvable (${entry.map}) : ${err.message}. La matière reste en couleur unie.`);
    }
  }));
}

function defaultLoader() {
  const loader = new THREE.TextureLoader();
  return (url) => loader.loadAsync(url);
}
