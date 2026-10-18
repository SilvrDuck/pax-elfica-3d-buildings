import * as THREE from 'three';

const SLAB_M = 0.15;
const RAISED = new Set(['planks']);

function shapeOf(polygon) {
  const shape = new THREE.Shape();
  polygon.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, z) : shape.lineTo(x, z)));
  shape.closePath();
  return shape;
}

/**
 * A floor polygon laid flat at the storey floor: plank floors are a slab hanging 0.15 m below it,
 * ground materials a flush plane. Level-local coordinates.
 */
export function buildFloor(floor, levelInfo, matFor) {
  const shape = shapeOf(floor.polygon);
  const geometry = RAISED.has(floor.material)
    ? new THREE.ExtrudeGeometry(shape, { depth: SLAB_M, bevelEnabled: false })
    : new THREE.ShapeGeometry(shape);
  // Shape (u, v) → world (x, z); the extrusion runs down from the floor.
  geometry.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, matFor(floor.material, levelInfo.id));
  mesh.position.y = RAISED.has(floor.material) ? 0 : 0.005;
  mesh.receiveShadow = true;
  return mesh;
}
