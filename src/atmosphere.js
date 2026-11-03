import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ATMOSPHERE = {
  zenith: '#111936',
  night: '#292c57',
  dusk: '#65405f',
  ember: '#c67358',
  haze: '#604b57',
  fogNear: 70,
  fogFar: 155,
};

const HALO_COLORS = {
  hearth: '#ff7a32',
  lantern: '#ffc06a',
  window: '#ffb35c',
};

/** A transparent clear lets the CSS twilight show through; world fog closes the ground horizon. */
export function applyAtmosphere(scene, renderer) {
  scene.background = null;
  scene.fog = new THREE.Fog(ATMOSPHERE.haze, ATMOSPHERE.fogNear, ATMOSPHERE.fogFar);
  renderer.setClearColor(0x000000, 0);
  return scene.fog;
}

function haloTexture(size = 64) {
  const pixels = new Uint8Array(size * size * 4);
  const centre = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot(x - centre, y - centre) / centre;
      const alpha = Math.max(0, 1 - radius);
      const offset = (y * size + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(255 * alpha * alpha * (3 - 2 * alpha));
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** A flat table under the plans, rising into low faceted hills beyond the measured footprint. */
export function buildGroundGeometry(size = 200, segments = 40) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  const colors = [];
  const earth = new THREE.Color('#342b25');
  const heath = new THREE.Color('#172c2c');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const distance = Math.hypot(x, z);
    const t = THREE.MathUtils.smoothstep(distance, 34, 88);
    const ridge = groundHeight(x, z);
    positions.setY(i, ridge * t);
    earth.clone()
      .lerp(heath, Math.min(1, t * 0.9 + Math.max(0, ridge - 1.4) * 0.08))
      .toArray(colors, colors.length);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function groundHeight(x, z) {
  return Math.max(-0.2, 1.8 + Math.sin(x * 0.105) * 1.45 + Math.sin(z * 0.137 + 0.8) * 1.05);
}

/** A single low-poly tree line gives the measured site a world without spending one draw per tree. */
export function buildHorizonForest(count = 76) {
  const trees = [];
  const colours = ['#142827', '#19302d', '#20362f'];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const angle = i * golden + Math.sin(i * 2.17) * 0.11;
    const radius = 44 + ((i * 37) % 23) + Math.sin(i * 1.71) * 3;
    const height = 6 + ((i * 29) % 13) * 0.48;
    const crownRadius = 1.15 + height * 0.11;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const geometry = new THREE.ConeGeometry(crownRadius, height, 5, 2);
    geometry.rotateY(angle + i * 0.31);
    geometry.translate(x, groundHeight(x, z) + height / 2 - 0.12, z);
    const color = new THREE.Color(colours[i % colours.length]);
    const values = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let j = 0; j < values.length; j += 3) color.toArray(values, j);
    geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
    trees.push(geometry);
  }
  const geometry = mergeGeometries(trees, false);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  const forest = new THREE.Mesh(geometry, material);
  forest.name = 'lisière lointaine';
  forest.castShadow = false;
  forest.receiveShadow = false;
  return forest;
}

/** Warm sources share one point field, keeping the atmospheric accent to a single draw call. */
export function buildGlowField(levels, { elevations, order }) {
  const rank = new Map(order.map((id, index) => [id, index]));
  const markers = [];
  for (const id of order) {
    const level = levels.get(id);
    const elevation = elevations.get(id) ?? 0;
    for (const light of level?.lights ?? []) {
      const color = HALO_COLORS[light.kind];
      if (!color) continue;
      markers.push({
        id,
        rank: rank.get(id),
        position: [light.x, elevation + light.y, light.z],
        color,
      });
    }
    const walls = new Map((level?.walls ?? []).map((wall) => [wall.id, wall]));
    for (const opening of level?.openings ?? []) {
      if (opening.kind !== 'window' || !opening.glow) continue;
      const wall = walls.get(opening.wall);
      if (!wall) continue;
      const length = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
      if (length < 1e-6) continue;
      const along = opening.at / length;
      markers.push({
        id,
        rank: rank.get(id),
        position: [
          THREE.MathUtils.lerp(wall.a[0], wall.b[0], along),
          elevation + (wall.base ?? 0) + 1.45,
          THREE.MathUtils.lerp(wall.a[1], wall.b[1], along),
        ],
        color: HALO_COLORS.window,
      });
    }
  }

  const geometry = new THREE.BufferGeometry();
  const material = new THREE.PointsMaterial({
    size: 4.6,
    map: haloTexture(),
    transparent: true,
    opacity: 0.26,
    alphaTest: 0.015,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'halos lumineux';
  points.renderOrder = 2;
  points.frustumCulled = false;

  const select = (id) => {
    const selected = rank.get(id) ?? order.length - 1;
    const visible = markers.filter((marker) => marker.rank <= selected);
    const positions = visible.flatMap((marker) => marker.position);
    const colors = visible.flatMap((marker) => new THREE.Color(marker.color).toArray());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
  };

  select(order.at(-1));
  return { points, select };
}
