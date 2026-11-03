import { describe, expect, it } from 'vitest';
import { Group, MeshBasicMaterial } from 'three';
import { buildSurfacePixels } from '../src/surfaces.js';
import { buildWall } from '../src/build/walls.js';
import { buildRoof } from '../src/build/roofs.js';
import { naturalTransform, PropLibrary } from '../src/props.js';
import { buildHorizonForest } from '../src/atmosphere.js';

const matFor = () => new MeshBasicMaterial();

describe('direction artistique procédurale', () => {
  it('produit des surfaces de pierre, bois et tuile réellement variées', () => {
    for (const kind of ['stone', 'planks', 'tile']) {
      const pixels = buildSurfacePixels(kind, 64);
      const values = new Set();
      for (let i = 0; i < pixels.length; i += 4) values.add(pixels[i]);
      expect(values.size, kind).toBeGreaterThan(12);
    }
  });

  it('donne du relief au mur et encadre une fenêtre sans déplacer le plan', () => {
    const wall = { id: 'mur-test', a: [0, 0], b: [6, 0], material: 'stone' };
    const group = buildWall(wall, [{ wall: 'mur-test', at: 3, width: 1.2, kind: 'window' }], { id: 'rdc', height: 3 }, matFor);
    const meshes = [];
    group.traverse((object) => { if (object.isMesh) meshes.push(object); });
    expect(meshes.length).toBeGreaterThan(8);
    const rough = meshes.find((mesh) => mesh.name === 'maçonnerie irrégulière');
    expect(rough).toBeDefined();
    expect(rough.geometry.parameters.widthSegments).toBeGreaterThan(1);
    expect(group.position.x).toBe(0);
    expect(group.position.z).toBe(0);
  });

  it('pose un faîtage sur les toits à deux pans', () => {
    const roof = buildRoof({ rect: [0, 0, 8, 6], ridge: 'x', pitch: 40, material: 'tile', covers: 'e1' }, matFor);
    expect(roof.getObjectByName('faîtage')).toBeDefined();
  });

  it('casse la grille du mobilier par une variation stable et très contenue', () => {
    const prop = { asset: 'bed_single', x: 10, z: 8, rot: 90 };
    const a = naturalTransform(prop, 'e2');
    const b = naturalTransform(prop, 'e2');
    expect(a).toEqual(b);
    expect(Math.hypot(a.x - prop.x, a.z - prop.z)).toBeLessThan(0.15);
    expect(a.rot).not.toBe(prop.rot);
    expect(a.scale).toBeGreaterThanOrEqual(0.97);
    expect(a.scale).toBeLessThanOrEqual(1.04);
  });

  it('fabrique la lisière en un seul objet de rendu', () => {
    const forest = buildHorizonForest(36);
    expect(forest.isMesh).toBe(true);
    expect(forest.geometry.getAttribute('position').count).toBeGreaterThan(300);
    expect(forest.castShadow).toBe(false);
  });

  it('remplace les primitives héroïques par de vrais assemblages', async () => {
    const library = new PropLibrary({ hearth: { pack: 'primitive', footprint: [1.8, 0.7], height: 1.6, material: 'stone' } }, { matFor });
    await library.ready;
    const level = new Group();
    const hearth = library.place(level, { asset: 'hearth', x: 2, z: 3, rot: 0 }, { id: 'rdc' });
    const meshes = [];
    hearth.traverse((object) => { if (object.isMesh) meshes.push(object); });
    expect(hearth.isGroup).toBe(true);
    expect(meshes.length).toBeGreaterThanOrEqual(5);
  });
});
