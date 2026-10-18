import * as THREE from 'three';

export const EAVES_M = 0.4;

export function ridgeHeight(span, pitchDeg) {
  return (span / 2) * Math.tan((pitchDeg * Math.PI) / 180);
}

/**
 * A gable roof over `rect` = [x, z, w, d] (level-local, y 0 at the eaves' wall line), ridge along
 * `x` or `z`, with 0.4 m eaves all round. Two slopes and two gable triangles, 14 vertices.
 */
export function buildRoof(roof, matFor) {
  if (roof.ridge === 'point') return buildPyramid(roof, matFor);
  const [x, z, w, d] = roof.rect;
  const alongX = roof.ridge === 'x';
  const span = alongX ? d : w;
  const run = alongX ? w : d;
  const h = ridgeHeight(span, roof.pitch);
  const drop = EAVES_M * Math.tan((roof.pitch * Math.PI) / 180);
  // Local frame: u along the ridge, v across the span (centred), y up.
  const u0 = -EAVES_M, u1 = run + EAVES_M;
  const v0 = -span / 2 - EAVES_M, v1 = span / 2 + EAVES_M;
  const local = [
    // slope on the v<0 side
    [u0, -drop, v0], [u1, -drop, v0], [u1, h, 0], [u0, h, 0],
    // slope on the v>0 side
    [u0, h, 0], [u1, h, 0], [u1, -drop, v1], [u0, -drop, v1],
    // gables at the wall line (no eaves drop)
    [0, 0, -span / 2], [0, h, 0], [0, 0, span / 2],
    [run, 0, -span / 2], [run, 0, span / 2], [run, h, 0],
  ];
  const index = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 11, 12, 13];
  const positions = new Float32Array(local.length * 3);
  local.forEach(([u, y, v], i) => {
    const px = alongX ? x + u : x + w / 2 + v;
    const pz = alongX ? z + d / 2 + v : z + u;
    positions.set([px, y, pz], i * 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return finish(geometry, roof, matFor);
}

// A pyramid over `rect`: four slopes meeting at an apex above the centre, eaves all round.
function buildPyramid(roof, matFor) {
  const [x, z, w, d] = roof.rect;
  const h = ridgeHeight(Math.min(w, d), roof.pitch);
  const drop = EAVES_M * Math.tan((roof.pitch * Math.PI) / 180);
  const x0 = x - EAVES_M, x1 = x + w + EAVES_M, z0 = z - EAVES_M, z1 = z + d + EAVES_M;
  const apex = [x + w / 2, h, z + d / 2];
  const corners = [[x0, -drop, z0], [x1, -drop, z0], [x1, -drop, z1], [x0, -drop, z1]];
  const positions = [];
  for (let i = 0; i < 4; i++) positions.push(...corners[i], ...corners[(i + 1) % 4], ...apex);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  return finish(geometry, roof, matFor);
}

function finish(geometry, roof, matFor) {
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, matFor(roof.material));
  mesh.name = `roof over ${roof.covers}`;
  mesh.castShadow = true;
  return mesh;
}
