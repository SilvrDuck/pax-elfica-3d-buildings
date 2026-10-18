import * as THREE from 'three';
import { splitWall, THICKNESS, wallLength } from './geometry.js';

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
  const material = matFor(wall.material, levelInfo.id);
  const place = (mesh, along, y) => {
    mesh.position.set(wall.a[0] + dir[0] * along, y, wall.a[1] + dir[1] * along);
    mesh.rotation.y = yaw;
    group.add(mesh);
  };
  for (const p of pieces) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.x1 - p.x0, p.y1 - p.y0, t), material);
    place(mesh, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2);
  }
  for (const o of openings) {
    const hole = holes.find((h) => o.at >= h.x0 - 1e-6 && o.at <= h.x1 + 1e-6);
    if (!hole) continue;
    const width = Math.min(o.width, hole.x1 - hole.x0);
    const x0 = Math.max(hole.x0, o.at - o.width / 2);
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
