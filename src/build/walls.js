import * as THREE from 'three';
import { splitWall, THICKNESS, wallLength, openingTrim, plinthFor } from './geometry.js';

const DOOR_LEAF_T = 0.05;
const DOOR_OPEN_DEG = 15;

/**
 * Builds one wall as a group of boxes around its openings, with door leaves ajar and glowing panes
 * in windows flagged `glow`. Coordinates are level-local (y from the storey floor).
 */
export function buildWall(wall, openings, levelInfo, matFor) {
  const group = new THREE.Group();
  group.name = wall.id;
  group.position.y = wall.base ?? 0;
  const L = wallLength(wall);
  if (L < 1e-6) return group;
  const dir = [(wall.b[0] - wall.a[0]) / L, (wall.b[1] - wall.a[1]) / L];
  const yaw = Math.atan2(-dir[1], dir[0]);
  const t = THICKNESS[wall.material] ?? THICKNESS.stone;
  const { pieces, holes, warnings } = splitWall(wall, openings, levelInfo.height);
  for (const w of warnings) console.warn(w);
  const side = matFor(wall.material, levelInfo.id);
  const cap = matFor('cut', levelInfo.id);
  // BoxGeometry groups: +x, -x, +y (top), -y, +z, -z. The top reads as the cut through the storey.
  const material = [side, side, cap, side, side, side];
  // Across the wall: +z in wall-local space is the right-hand side of a→b, the outer face by
  // convention of the level scripts (enclosure and facade walls run clockwise seen from above).
  const across = [-dir[1], dir[0]];
  const place = (mesh, along, y, out = 0) => {
    mesh.position.set(wall.a[0] + dir[0] * along + across[0] * out, y, wall.a[1] + dir[1] * along + across[1] * out);
    mesh.rotation.y = yaw;
    group.add(mesh);
  };
  const plinth = plinthFor(wall, levelInfo.id);
  if (plinth) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(L, plinth.h, t + 2 * plinth.out), matFor('plinth', levelInfo.id));
    base.name = 'plinth';
    place(base, L / 2, plinth.h / 2);
  }
  for (const p of pieces) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, p.y1 - p.y0, t), material);
    place(mesh, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2);
  }
  for (const o of openings) {
    const hole = holes.find((h) => o.at >= h.x0 - 1e-6 && o.at <= h.x1 + 1e-6);
    if (!hole) continue;
    const width = Math.min(o.width, hole.x1 - hole.x0);
    const x0 = Math.max(hole.x0, o.at - o.width / 2);
    for (const part of openingTrim(o.kind, { x0, x1: x0 + width, y0: hole.y0, y1: hole.y1 }, t)) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(part.w, part.h, part.d), matFor(part.material, levelInfo.id));
      mesh.name = part.name;
      place(mesh, part.x, part.y, part.z);
    }
    if (o.kind === 'door') {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(width, hole.y1 - 0.05, DOOR_LEAF_T), matFor('timber', levelInfo.id));
      leaf.position.x = width / 2;
      const hinge = new THREE.Group();
      hinge.add(leaf);
      hinge.rotation.y = (DOOR_OPEN_DEG * Math.PI) / 180;
      const pivot = new THREE.Group();
      pivot.add(hinge);
      place(pivot, x0, (hole.y1 - 0.05) / 2);
    } else if (o.kind === 'window' && o.glow) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(width, hole.y1 - hole.y0, 0.02), matFor('windowGlow', levelInfo.id));
      place(pane, x0 + width / 2, (hole.y0 + hole.y1) / 2);
    }
  }
  return group;
}
