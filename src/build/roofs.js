import * as THREE from 'three';

export const EAVES_M = 0.4;
/** Ridge cap half-thickness and fascia board height, in metres. */
export const RIDGE_T = 0.12;
export const FASCIA_H = 0.22;

export function ridgeHeight(span, pitchDeg) {
  return (span / 2) * Math.tan((pitchDeg * Math.PI) / 180);
}

/**
 * A roof over `rect` = [x, z, w, d] (level-local, y 0 at the eaves' wall line): a gable with the
 * ridge along `x` or `z`, or a pyramid for `point`. Returns a group holding the slopes plus the
 * trim that gives the roof its thickness: a ridge cap and a fascia board under each eave, or
 * four hips.
 */
export function buildRoof(roof, matFor) {
  const group = new THREE.Group();
  group.name = `roof over ${roof.covers}`;
  if (roof.ridge === 'point') {
    group.add(buildPyramid(roof, matFor));
    for (const hip of pyramidHips(roof, matFor)) group.add(hip);
    return group;
  }
  group.add(buildGable(roof, matFor));
  group.add(ridgeCap(roof, matFor));
  for (const fascia of fascias(roof, matFor)) group.add(fascia);
  return group;
}

function buildGable(roof, matFor) {
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

// A square beam laid along the ridge, the full run plus the eaves, in the dark trim material.
function ridgeCap(roof, matFor) {
  const [x, z, w, d] = roof.rect;
  const alongX = roof.ridge === 'x';
  const span = alongX ? d : w, run = alongX ? w : d;
  const h = ridgeHeight(span, roof.pitch);
  const length = run + 2 * EAVES_M + 2 * RIDGE_T;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? length : 2 * RIDGE_T, 2 * RIDGE_T, alongX ? 2 * RIDGE_T : length), matFor('cut'));
  cap.name = 'ridge';
  cap.position.set(x + w / 2, h, z + d / 2);
  // Turned 45° about its own axis so it reads as a cap, not a box lying on the ridge.
  cap.rotation.x = alongX ? Math.PI / 4 : 0;
  cap.rotation.z = alongX ? 0 : Math.PI / 4;
  cap.castShadow = true;
  return cap;
}

// A board hung under each eave edge, in timber, so the roof reads as a slab rather than a sheet.
function fascias(roof, matFor) {
  const [x, z, w, d] = roof.rect;
  const alongX = roof.ridge === 'x';
  const drop = EAVES_M * Math.tan((roof.pitch * Math.PI) / 180);
  const boards = [];
  for (const side of [-1, 1]) {
    const length = (alongX ? w : d) + 2 * EAVES_M;
    const board = new THREE.Mesh(new THREE.BoxGeometry(alongX ? length : 0.08, FASCIA_H, alongX ? 0.08 : length), matFor('timber'));
    board.name = 'fascia';
    const off = (alongX ? d : w) / 2 + EAVES_M;
    board.position.set(alongX ? x + w / 2 : x + w / 2 + side * off, -drop - FASCIA_H / 2 + 0.06, alongX ? z + d / 2 + side * off : z + d / 2);
    board.castShadow = true;
    boards.push(board);
  }
  return boards;
}

// Beams along the four edges of a pyramid, corner to apex.
function pyramidHips(roof, matFor) {
  const [x, z, w, d] = roof.rect;
  const h = ridgeHeight(Math.min(w, d), roof.pitch);
  const drop = EAVES_M * Math.tan((roof.pitch * Math.PI) / 180);
  const apex = new THREE.Vector3(x + w / 2, h, z + d / 2);
  const corners = [[x - EAVES_M, z - EAVES_M], [x + w + EAVES_M, z - EAVES_M], [x + w + EAVES_M, z + d + EAVES_M], [x - EAVES_M, z + d + EAVES_M]];
  return corners.map(([cx, cz]) => {
    const from = new THREE.Vector3(cx, -drop, cz);
    const length = from.distanceTo(apex);
    const hip = new THREE.Mesh(new THREE.BoxGeometry(2 * RIDGE_T, 2 * RIDGE_T, length), matFor('cut'));
    hip.name = 'hip';
    hip.position.copy(from).lerp(apex, 0.5);
    hip.lookAt(apex);
    hip.castShadow = true;
    return hip;
  });
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
  mesh.name = 'slopes';
  mesh.castShadow = true;
  return mesh;
}
