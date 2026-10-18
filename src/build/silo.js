import * as THREE from 'three';

const WALL_T = 0.5;
const RING_W = 1.0;

/**
 * The buried grain silo: an open stone cylinder from y = -depth to 0, a timber ring floor halfway
 * down and a central post. World coordinates (the caller offsets it into its level group).
 */
export function buildSilo({ centre, radius, depth }, matFor) {
  const group = new THREE.Group();
  group.name = 'silo';
  const [cx, cz] = centre;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + WALL_T, radius + WALL_T, depth, 32, 1, true),
    matFor('stone', 'silo1'),
  );
  wall.position.set(cx, -depth / 2, cz);
  group.add(wall);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 32, 1, true), matFor('stone', 'silo1'));
  inner.position.copy(wall.position);
  group.add(inner);
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius - RING_W, radius, 32), matFor('planks', 'silo1'));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(cx, -depth / 2, cz);
  group.add(ring);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, depth, 12), matFor('timber', 'silo1'));
  post.position.set(cx, -depth / 2, cz);
  group.add(post);
  return group;
}
