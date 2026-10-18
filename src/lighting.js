import * as THREE from 'three';

/** Warm point lights of the inn, by kind. */
export const LIGHT_KINDS = {
  hearth: { color: '#ff8c3a', intensity: 25, distance: 9 },
  lantern: { color: '#ffb35c', intensity: 8, distance: 6 },
  candle: { color: '#ffc98a', intensity: 3, distance: 3.5 },
  window: { color: '#ffb347', intensity: 6, distance: 5 },
};

/** Dusk: a cool hemisphere and a low moon for shape. */
export function setupLighting(scene) {
  scene.add(new THREE.HemisphereLight('#4a5f8c', '#4a3a2a', 2.4));
  const moon = new THREE.DirectionalLight('#9fb4d8', 1.4);
  moon.position.set(-30, 50, -20);
  scene.add(moon);
}

/** A point light from a level's `lights` entry, placed in world coordinates. */
export function buildLight(light, levelInfo) {
  const kind = LIGHT_KINDS[light.kind] ?? LIGHT_KINDS.candle;
  const point = new THREE.PointLight(kind.color, kind.intensity, kind.distance, 2);
  point.position.set(light.x, levelInfo.elevation + light.y, light.z);
  point.castShadow = false;
  return point;
}
