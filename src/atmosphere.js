import * as THREE from 'three';

/** The colour everything fades into with distance, and the sky's colour at the horizon line. */
export const HORIZON = '#4a3b47';
/** Dusk sky: the horizon colour, a thin warm glow just above it, violet, then a deep night zenith. */
export const SKY = { horizon: HORIZON, glow: '#b8663c', mid: '#4b3356', zenith: '#0b1020' };

const SKY_RADIUS = 400;
const STAR_COUNT = 700;

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragment = /* glsl */ `
  uniform vec3 horizon;
  uniform vec3 glow;
  uniform vec3 mid;
  uniform vec3 zenith;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 c = mix(horizon, glow, smoothstep(0.0, 0.05, h));
    c = mix(c, mid, smoothstep(0.05, 0.2, h));
    c = mix(c, zenith, smoothstep(0.2, 0.65, h));
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** A dome of dusk gradient around the scene, stars scattered above the horizon. */
export function buildSky() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      horizon: { value: new THREE.Color(SKY.horizon) },
      glow: { value: new THREE.Color(SKY.glow) },
      mid: { value: new THREE.Color(SKY.mid) },
      zenith: { value: new THREE.Color(SKY.zenith) },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 16), material);
  sky.name = 'sky';
  sky.renderOrder = -10;

  const positions = new Float32Array(STAR_COUNT * 3);
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = rand() * Math.PI * 2;
    const y = 0.15 + rand() * 0.85;
    const r = Math.sqrt(1 - y * y) * (SKY_RADIUS - 5);
    positions.set([Math.cos(theta) * r, y * (SKY_RADIUS - 5), Math.sin(theta) * r], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
  stars.name = 'stars';
  sky.add(stars);
  return sky;
}

/** Bloom kept to the emissives: panes, embers, lantern glass. */
export const BLOOM = { strength: 0.35, radius: 0.4, threshold: 0.9 };

/** Linear fog in the horizon colour: the ground plane dissolves instead of ending. */
export function setupFog(scene) {
  scene.fog = new THREE.Fog(HORIZON, 70, 190);
  scene.background = null;
  return scene.fog;
}
