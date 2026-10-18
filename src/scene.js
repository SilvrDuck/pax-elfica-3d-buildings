import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export const HOME = {
  position: new THREE.Vector3(60, 45, 70),
  target: new THREE.Vector3(22, 0, 17),
};

export function webglSupported() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Keeps the WebGL canvas, the label layer and the camera aspect in step with the window. */
export function applySize({ camera, renderer, labelRenderer }, width, height) {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
}

export function createScene(container, { width = window.innerWidth, height = window.innerHeight } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0e1116');

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
  camera.position.copy(HOME.position);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.className = 'labels';
  container.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, labelRenderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.target.copy(HOME.target);
  controls.saveState();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: '#8a6b45' }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(22, -0.01, 17);
  scene.add(ground);

  scene.add(new THREE.HemisphereLight('#2b3a5c', '#3a2a1e', 0.55));

  const resize = (w = window.innerWidth, h = window.innerHeight) => applySize({ camera, renderer, labelRenderer }, w, h);
  window.addEventListener('resize', () => resize());

  const view = { scene, camera, renderer, labelRenderer, controls, ground, resize, setTopView };

  /** Straight-down orthographic framing of a world rect [x0, z0, w, h], north up; orbit disabled. */
  function setTopView([x0, z0, w, h], margin = 1) {
    const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight || 16 / 9;
    let halfW = w / 2 + margin, halfH = h / 2 + margin;
    if (halfW / halfH > aspect) halfH = halfW / aspect; else halfW = halfH * aspect;
    const top = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 400);
    top.position.set(x0 + w / 2, 150, z0 + h / 2);
    top.up.set(0, 0, -1);
    top.lookAt(x0 + w / 2, 0, z0 + h / 2);
    top.updateProjectionMatrix();
    controls.enabled = false;
    view.camera = top;
    return top;
  }

  function render() {
    if (controls.enabled) controls.update();
    renderer.render(scene, view.camera);
    labelRenderer.render(scene, view.camera);
  }
  renderer.setAnimationLoop(render);

  return view;
}
