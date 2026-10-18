import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { adoptMaterial } from '../materials.js';

/** One geometry per material group of an indexed geometry (BoxGeometry and friends). */
export function splitByGroups(geometry) {
  if (!geometry.index || !geometry.groups.length) return [{ materialIndex: 0, geometry }];
  const index = geometry.index.array;
  return geometry.groups.map((g) => {
    const part = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(geometry.attributes)) part.setAttribute(name, attr);
    part.setIndex(Array.from(index.slice(g.start, g.start + g.count)));
    return { materialIndex: g.materialIndex ?? 0, geometry: part.toNonIndexed() };
  });
}

/**
 * Fuses every mesh of a level group that shares a material (and attribute layout) into one mesh in
 * the group's own frame, so a furnished floor costs a handful of draw calls instead of hundreds.
 * Lights and non-mesh objects stay where they are. Materials that came in from glTF models are
 * copied per level so the level can fade on its own.
 */
export function mergeLevelGroup(group, levelId) {
  group.updateMatrixWorld(true);
  const toGroup = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const doomed = [];
  const add = (obj, local, sourceMaterial, geometry) => {
    const layout = Object.keys(geometry.attributes).sort().join(',') + (geometry.index ? '|i' : '');
    const material = adoptMaterial(sourceMaterial, levelId);
    const key = `${material.uuid}|${layout}`;
    if (!buckets.has(key)) buckets.set(key, { material, geometries: [], sources: [] });
    const g = geometry.clone().applyMatrix4(local);
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
    g.morphAttributes = {};
    buckets.get(key).geometries.push(g);
    buckets.get(key).sources.push({ obj, local });
  };
  group.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh || obj.isSkinnedMesh) return;
    const local = new THREE.Matrix4().multiplyMatrices(toGroup, obj.matrixWorld);
    if (Array.isArray(obj.material)) {
      for (const part of splitByGroups(obj.geometry)) add(obj, local, obj.material[part.materialIndex] ?? obj.material[0], part.geometry);
    } else {
      add(obj, local, obj.material, obj.geometry);
    }
    doomed.push(obj);
  });
  for (const obj of doomed) obj.removeFromParent();
  for (const { material, geometries, sources } of buckets.values()) {
    const key = (g) => Object.keys(g.attributes).sort().join(',') + (g.index ? '|i' : '');
    const byLayout = new Map();
    for (const g of geometries) byLayout.set(key(g), [...(byLayout.get(key(g)) ?? []), g]);
    for (const list of byLayout.values()) {
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!merged) {
        // Nothing is lost on a failed merge: the originals come back, placed in the group's frame.
        for (const { obj, local } of sources) {
          obj.matrix.copy(local);
          obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
          obj.material = material;
          group.add(obj);
        }
        continue;
      }
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  pruneEmpty(group);
}

function pruneEmpty(group) {
  for (const child of [...group.children]) {
    if (child.isGroup || child.type === 'Object3D') {
      pruneEmpty(child);
      if (child.children.length === 0) child.removeFromParent();
    }
  }
}
