import { describe, it, expect } from 'vitest';
import { Texture } from 'three';
import { loadTextureCatalog } from '../src/textures.js';
import { MATERIAL_MAPS } from '../src/materials.js';

describe('texture catalogue', () => {
  it('declares maps for every entry, loading each file once', async () => {
    const loaded = [];
    const load = (url) => { loaded.push(url); return Promise.resolve(new Texture()); };
    await loadTextureCatalog({ stone: { map: 'textures/stone.jpg', normalMap: 'textures/stone_n.jpg', metres: 2 }, planks: { map: 'textures/planks.jpg', metres: 1.5 } }, { load, baseUrl: '/x/' });
    expect(loaded.sort()).toEqual(['/x/textures/planks.jpg', '/x/textures/stone.jpg', '/x/textures/stone_n.jpg']);
    expect(MATERIAL_MAPS.stone.metres).toBe(2);
    expect(MATERIAL_MAPS.planks.normalMap).toBeNull();
  });
  it('keeps going when a file is missing and says so in French', async () => {
    const warn = [];
    const orig = console.warn; console.warn = (m) => warn.push(m);
    const load = (url) => (url.includes('bad') ? Promise.reject(new Error('404')) : Promise.resolve(new Texture()));
    await loadTextureCatalog({ cob: { map: 'bad.jpg', metres: 1 }, dirt: { map: 'ok.jpg', metres: 1 } }, { load, baseUrl: '' });
    console.warn = orig;
    expect(MATERIAL_MAPS.dirt.map).toBeInstanceOf(Texture);
    expect(MATERIAL_MAPS.cob).toBeUndefined();
    expect(warn.join(' ')).toMatch(/introuvable/);
  });
});
