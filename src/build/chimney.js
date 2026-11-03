import * as THREE from 'three';

const CAP_OUT = 0.08;
const CAP_H = 0.14;
const FLUE_H = 0.3;

/**
 * A chimney stack from `base` to `top` (level-local heights) at (x, z): a stone shaft, a wider
 * cap slab and a dark flue standing out of it. `w` is the shaft's side.
 */
export function buildChimney({ x, z, base, top, w }, matFor) {
  const group = new THREE.Group();
  group.name = 'chimney';
  const h = top - base;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), matFor('stone'));
  shaft.name = 'shaft';
  shaft.position.set(x, base + h / 2, z);
  group.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * CAP_OUT, CAP_H, w + 2 * CAP_OUT), matFor('plinth'));
  cap.name = 'cap';
  cap.position.set(x, top + CAP_H / 2, z);
  group.add(cap);
  const flue = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, FLUE_H, w * 0.55), matFor('cut'));
  flue.name = 'flue';
  flue.position.set(x, top + CAP_H + FLUE_H / 2, z);
  group.add(flue);
  for (const child of group.children) child.castShadow = true;
  return group;
}
