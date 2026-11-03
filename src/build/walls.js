import * as THREE from 'three';
import { splitWall, THICKNESS, wallLength } from './geometry.js';
import { projectUV, SURFACE_STYLE } from '../surfaces.js';

const DOOR_LEAF_T = 0.05;
const DOOR_OPEN_DEG = 15;

const seedOf = (text) => [...text].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) | 0, 17);

function detailedBox(width, height, depth, materialName, seed = 0) {
  const ws = Math.max(1, Math.ceil(width / 0.55));
  const hs = Math.max(1, Math.ceil(height / 0.5));
  const geometry = new THREE.BoxGeometry(width, height, depth, ws, hs, 1);
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const colours = new Float32Array(position.count * 3);
  const roughness = ['stone', 'enclosure'].includes(materialName) ? 0.055 : 0.022;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    const shade = 0.78 + (Math.sin(x * 7.1 + y * 4.9 + seed) * 0.5 + 0.5) * 0.28;
    colours[i * 3] = shade;
    colours[i * 3 + 1] = shade * 0.98;
    colours[i * 3 + 2] = shade * 0.95;
    if (Math.abs(normal.getZ(i)) < 0.8) continue;
    const edge = Math.sin(Math.PI * (x / width + 0.5)) * Math.sin(Math.PI * (y / height + 0.5));
    const ripple = Math.sin(x * 4.17 + y * 2.31 + seed) * 0.55 + Math.sin(x * 1.41 - y * 5.13 + seed * 0.7) * 0.45;
    position.setZ(i, position.getZ(i) + Math.sign(normal.getZ(i)) * ripple * roughness * Math.max(0, edge));
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return projectUV(geometry, SURFACE_STYLE[materialName]?.metres ?? 1.5);
}

function trimBox(width, height, depth, materialName = 'timber') {
  return projectUV(new THREE.BoxGeometry(width, height, depth), SURFACE_STYLE[materialName]?.metres ?? 1.25);
}

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
  const place = (mesh, along, y) => {
    mesh.position.set(wall.a[0] + dir[0] * along, y, wall.a[1] + dir[1] * along);
    mesh.rotation.y = yaw;
    group.add(mesh);
  };
  for (const p of pieces) {
    const mesh = new THREE.Mesh(detailedBox(p.x1 - p.x0, p.y1 - p.y0, t, wall.material, seedOf(`${wall.id}:${p.x0}:${p.y0}`)), material);
    mesh.name = 'maçonnerie irrégulière';
    place(mesh, (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2);
    if (wall.material === 'stone' || wall.material === 'enclosure') {
      const blockH = 0.16;
      let row = 0;
      for (let y = p.y0 + 0.24; y < p.y1 - 0.12; y += 0.5, row++) {
        const offset = row % 2 ? 0.34 : 0;
        for (let along = p.x0 + 0.25 + offset; along < p.x1 - 0.18; along += 0.72) {
          const seed = seedOf(`${wall.id}:${row}:${along.toFixed(2)}`);
          if (Math.abs(seed % 7) > 2) continue;
          const blockW = 0.42 + Math.abs(seed % 19) / 100;
          const block = new THREE.Mesh(trimBox(Math.min(blockW, p.x1 - along + 0.1), blockH, t + 0.075, wall.material), side);
          block.name = 'pierres en relief';
          block.rotation.z = ((seed % 5) - 2) * 0.006;
          place(block, along, y);
        }
      }
    }
  }

  if (wall.material === 'cob' || wall.material === 'partition') {
    const timber = matFor('timber', levelInfo.id);
    const h = wall.h ?? levelInfo.height;
    const crown = new THREE.Mesh(trimBox(L, 0.14, t + 0.075), timber);
    crown.name = 'colombage';
    place(crown, L / 2, h - 0.11);
    const spacing = 2.35;
    for (let along = 0.12; along < L; along += spacing) {
      if (holes.some((hole) => along > hole.x0 - 0.08 && along < hole.x1 + 0.08)) continue;
      const post = new THREE.Mesh(trimBox(0.13, h - 0.18, t + 0.07), timber);
      post.name = 'colombage';
      place(post, along, (h - 0.18) / 2);
    }
  }

  for (const o of openings) {
    const hole = holes.find((h) => o.at >= h.x0 - 1e-6 && o.at <= h.x1 + 1e-6);
    if (!hole) continue;
    const width = Math.min(o.width, hole.x1 - hole.x0);
    const x0 = Math.max(hole.x0, o.at - o.width / 2);
    if (o.kind === 'door') {
      const timber = matFor('timber', levelInfo.id);
      const leafHeight = hole.y1 - 0.07;
      const leaf = new THREE.Mesh(trimBox(width, leafHeight, DOOR_LEAF_T * 0.48), timber);
      const gap = 0.012;
      const boardW = (width - gap * 3) / 4;
      for (let i = 0; i < 4; i++) {
        const board = new THREE.Mesh(trimBox(boardW, leafHeight, DOOR_LEAF_T), timber);
        board.position.x = -width / 2 + boardW / 2 + i * (boardW + gap);
        leaf.add(board);
      }
      for (const y of [-leafHeight * 0.28, leafHeight * 0.27]) {
        const rail = new THREE.Mesh(trimBox(width * 0.9, 0.1, 0.035), timber);
        rail.position.set(0, y, DOOR_LEAF_T * 0.7);
        leaf.add(rail);
      }
      const diagonal = new THREE.Mesh(trimBox(Math.hypot(width * 0.78, leafHeight * 0.58), 0.09, 0.03), timber);
      diagonal.position.z = DOOR_LEAF_T * 0.72;
      diagonal.rotation.z = Math.atan2(leafHeight * 0.58, width * 0.78);
      leaf.add(diagonal);
      leaf.position.set(width / 2, leafHeight / 2, 0);
      const hinge = new THREE.Group();
      hinge.add(leaf);
      hinge.rotation.y = (DOOR_OPEN_DEG * Math.PI) / 180;
      const pivot = new THREE.Group();
      pivot.add(hinge);
      place(pivot, x0, 0);
    } else if (o.kind === 'window') {
      const paneMaterial = matFor(o.glow ? 'windowGlow' : 'cut', levelInfo.id);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, hole.y1 - hole.y0 - 0.08, 0.018), paneMaterial);
      place(pane, x0 + width / 2, (hole.y0 + hole.y1) / 2);
      const timber = matFor('timber', levelInfo.id);
      const frame = 0.12, frameDepth = t + 0.15;
      for (const along of [x0 + frame / 2, x0 + width - frame / 2, x0 + width / 2]) {
        const jamb = new THREE.Mesh(trimBox(frame, hole.y1 - hole.y0 + frame, frameDepth), timber);
        jamb.name = 'encadrement de fenêtre';
        place(jamb, along, (hole.y0 + hole.y1) / 2);
      }
      for (const y of [hole.y0, hole.y1, (hole.y0 + hole.y1) / 2]) {
        const rail = new THREE.Mesh(trimBox(width + 0.12, frame, frameDepth), timber);
        rail.name = 'encadrement de fenêtre';
        place(rail, x0 + width / 2, y);
      }
      const sill = new THREE.Mesh(trimBox(width + 0.2, 0.08, t + 0.26), timber);
      sill.name = 'appui de fenêtre';
      place(sill, x0 + width / 2, hole.y0 - 0.025);
    }
  }
  return group;
}
