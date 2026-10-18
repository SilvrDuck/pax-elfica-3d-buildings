import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export const HOME = {
  position: new THREE.Vector3(60, 45, 70),
  target: new THREE.Vector3(22, 0, 17),
};

/** Soft shadow maps on: the moon is the one caster. */
export function configureRenderer(renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

/** Three r186 renders through WebGL 2 only; WebGL 1 counts as unsupported. */
export function webglSupported() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

/** Orthographic bounds that frame a world rect [x0, z0, w, h] plus a margin at a given aspect. */
export function topFrustum([, , w, h], aspect, margin = 1) {
  let halfW = w / 2 + margin, halfH = h / 2 + margin;
  if (halfW / halfH > aspect) halfH = halfW / aspect; else halfW = halfH * aspect;
  return { left: -halfW, right: halfW, top: halfH, bottom: -halfH };
}

/** Keeps the WebGL canvas, the label layer and the camera in step with the window. */
export function applySize({ camera, renderer, labelRenderer }, width, height) {
  if (camera.isOrthographicCamera && camera.userData.topFrame) {
    const { rect, margin } = camera.userData.topFrame;
    Object.assign(camera, topFrustum(rect, width / height, margin));
  } else {
    camera.aspect = width / height;
  }
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
}

/** `cam=x,y,z,tx,ty,tz` from the URL: camera position and orbit target in world metres. */
export function parseCamera(text) {
  if (!text) return null;
  const n = text.split(',').map(Number);
  if (n.length !== 6 || n.some((v) => !Number.isFinite(v))) return null;
  return { position: n.slice(0, 3), target: n.slice(3) };
}

/**
 * Camera placement that looks at a box's centre from the home direction, far enough for the box
 * to fit the view at the given aspect and vertical fov (degrees), with a little air around it.
 */
export function frameBox(box, aspect, fov, margin = 1.15) {
  const target = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = (Math.hypot(size.x, size.z) / 2) * margin;
  const vFov = (fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distance = Math.max(radius / Math.sin(vFov / 2), radius / Math.sin(hFov / 2));
  const dir = HOME.position.clone().sub(HOME.target).normalize();
  return { position: target.clone().addScaledVector(dir, distance), target };
}

/** Back to the perspective camera, orbit controls on, framed on `box` when one is given. */
export function goHome(view, box = null, { animate = true } = {}) {
  view.camera = view.perspective;
  view.controls.enabled = true;
  if (!box) { view.controls.reset(); return; }
  const { position, target } = frameBox(box, view.perspective.aspect, view.perspective.fov);
  view.flyTo(position, target, animate);
}

export function createScene(container, { width = window.innerWidth, height = window.innerHeight } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0e1116');

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
  camera.position.copy(HOME.position);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  configureRenderer(renderer);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;
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
  ground.receiveShadow = true;
  scene.add(ground);

  const view = { scene, camera, perspective: camera, renderer, labelRenderer, controls, ground, setTopView, home: (box) => goHome(view, box) };

  // Eased camera move; a second call cancels the first.
  let flight = 0;
  view.flyTo = (position, target, animate = true) => {
    cancelAnimationFrame(flight);
    if (!animate) { camera.position.copy(position); controls.target.copy(target); controls.update(); return; }
    const p0 = camera.position.clone(), t0 = controls.target.clone(), start = performance.now(), ms = 700;
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      camera.position.lerpVectors(p0, position, e);
      controls.target.lerpVectors(t0, target, e);
      controls.update();
      if (t < 1) flight = requestAnimationFrame(step);
    };
    flight = requestAnimationFrame(step);
  };
  view.resize = (w = window.innerWidth, h = window.innerHeight) => applySize({ camera: view.camera, renderer, labelRenderer }, w, h);
  window.addEventListener('resize', () => view.resize());

  /** Straight-down orthographic framing of a world rect [x0, z0, w, h], north up; orbit disabled. */
  function setTopView(rect, margin = 1) {
    const [x0, z0, w, h] = rect;
    const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight || 16 / 9;
    const f = topFrustum(rect, aspect, margin);
    const top = new THREE.OrthographicCamera(f.left, f.right, f.top, f.bottom, 0.1, 400);
    top.userData.topFrame = { rect, margin };
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
