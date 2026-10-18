import * as THREE from 'three';

/** Warm light sources of the inn, by kind. */
export const LIGHT_KINDS = {
  hearth: { color: '#ff8c3a', intensity: 40, distance: 11 },
  lantern: { color: '#ffb35c', intensity: 14, distance: 8 },
  candle: { color: '#ffc98a', intensity: 5, distance: 5 },
  window: { color: '#ffb347', intensity: 0, distance: 0 },
};

/** Dusk: a cool hemisphere and a low moon for shape. */
export function setupLighting(scene) {
  scene.add(new THREE.HemisphereLight('#5a6f99', '#5a4030', 3));
  const moon = new THREE.DirectionalLight('#9fb4d8', 1.8);
  moon.position.set(-30, 50, -20);
  scene.add(moon);
}

/** A light source from a level's `lights` entry, placed in world coordinates. */
export function buildLight(light, levelInfo) {
  const kind = LIGHT_KINDS[light.kind] ?? LIGHT_KINDS.candle;
  if (light.kind === 'window') {
    const glow = new THREE.Object3D();
    glow.name = 'window-glow';
    glow.position.set(light.x, levelInfo.elevation + light.y, light.z);
    return glow;
  }
  const point = new THREE.PointLight(kind.color, kind.intensity, kind.distance, 2);
  point.position.set(light.x, levelInfo.elevation + light.y, light.z);
  point.castShadow = false;
  return point;
}
