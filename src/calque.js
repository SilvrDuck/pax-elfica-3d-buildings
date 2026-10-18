import * as THREE from 'three';
import { LEVEL_BY_ID } from './data/levels.js';

const LIFT = 0.03;
const OPACITY = 0.5;

/**
 * The DM's alignment check: the official plan crop of the selected level, projected at half
 * opacity onto that level's floor. Textures load the first time a sheet is shown.
 */
export class Calque {
  constructor(scene, calibration, { baseUrl = '' } = {}) {
    this.scene = scene;
    this.calibration = calibration;
    this.baseUrl = baseUrl;
    this.planes = new Map();
    this.loader = new THREE.TextureLoader();
    this.level = null;
    this._visible = false;
  }

  plane(id) {
    if (this.planes.has(id)) return this.planes.get(id);
    const sheet = this.calibration.sheets[id];
    const info = LEVEL_BY_ID.get(id);
    if (!sheet || !info) return null;
    const [x0, z0, w, h] = sheet.worldRect;
    const geometry = new THREE.PlaneGeometry(w, h);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: OPACITY, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `calque ${id}`;
    mesh.position.set(x0 + w / 2, info.elevation + LIFT, z0 + h / 2);
    mesh.renderOrder = 10;
    mesh.visible = false;
    this.loader.load(this.baseUrl + sheet.image, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      material.map = texture;
      material.needsUpdate = true;
    });
    this.scene.add(mesh);
    this.planes.set(id, mesh);
    return mesh;
  }

  setLevel(id) {
    this.level = id;
    this.refresh();
  }

  get visible() {
    return this._visible;
  }

  set visible(v) {
    this._visible = Boolean(v);
    this.refresh();
  }

  toggle() {
    this.visible = !this.visible;
  }

  refresh() {
    for (const mesh of this.planes.values()) mesh.visible = false;
    if (!this._visible || !this.level) return;
    const mesh = this.plane(this.level);
    if (mesh) mesh.visible = true;
  }
}
