import * as THREE from 'three';

const RISER_M = 0.25;
const SPIRAL_STEPS_PER_TURN = 16;
const POST_R = 0.15;

/**
 * A stair climbing the storey height from `from` to `to` (level-local): straight flights are solid
 * steps, spirals wind around a post at `from` with radius `width`, ramps are one tilted slab.
 */
export function buildStair(stair, levelInfo, matFor) {
  const group = new THREE.Group();
  group.name = `${stair.kind} stair to ${stair.toLevel}`;
  const material = matFor('planks', levelInfo.id);
  const rise = levelInfo.height;
  const [fx, fz] = stair.from, [tx, tz] = stair.to;
  const run = Math.hypot(tx - fx, tz - fz);
  const yaw = Math.atan2(-(tz - fz), tx - fx);

  if (stair.kind === 'straight') {
    const n = Math.max(1, Math.round(rise / RISER_M));
    const tread = run / n, step = rise / n;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(tread, (i + 1) * step, stair.width), material);
      const along = (i + 0.5) * tread;
      mesh.position.set(fx + Math.cos(yaw) * along, ((i + 1) * step) / 2, fz - Math.sin(yaw) * along);
      mesh.rotation.y = yaw;
      group.add(mesh);
    }
  } else if (stair.kind === 'spiral') {
    const r = stair.width;
    const turns = rise / (SPIRAL_STEPS_PER_TURN * RISER_M);
    const n = Math.round(turns * SPIRAL_STEPS_PER_TURN);
    const step = rise / n;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(POST_R, POST_R, rise, 12), matFor('timber', levelInfo.id));
    post.position.set(fx, rise / 2, fz);
    group.add(post);
    const treadDepth = (2 * Math.PI * r) / SPIRAL_STEPS_PER_TURN;
    const start = Math.atan2(-(tz - fz), tx - fx);
    for (let i = 0; i < n; i++) {
      const angle = start + (i / SPIRAL_STEPS_PER_TURN) * 2 * Math.PI;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(r - POST_R, 0.08, treadDepth), material);
      const mid = POST_R + (r - POST_R) / 2;
      mesh.position.set(fx + Math.cos(angle) * mid, (i + 1) * step, fz - Math.sin(angle) * mid);
      mesh.rotation.y = angle;
      group.add(mesh);
    }
  } else {
    const slope = Math.hypot(run, rise);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(slope, 0.1, stair.width), material);
    mesh.position.set((fx + tx) / 2, rise / 2, (fz + tz) / 2);
    mesh.rotation.y = yaw;
    mesh.rotateZ(Math.atan2(rise, run));
    group.add(mesh);
  }
  return group;
}
