import { describe, it, expect } from 'vitest';
import { Box3 } from 'three';
import { buildWall } from '../src/build/walls.js';
import { materialFor } from '../src/materials.js';
import { framingFor, POST_SPACING } from '../src/build/geometry.js';

const matFor = (name, level) => materialFor(name, level);
const named = (g, name) => { const out = []; g.traverse((o) => { if (o.name === name) out.push(o); }); return out; };

describe('framingFor', () => {
  it('lays a sill, a plate and posts along a timber wall, around its openings', () => {
    const beams = framingFor({ L: 6, h: 2.6, t: 0.3 }, [{ x0: 2, x1: 3, y0: 0.9, y1: 2.0 }]);
    const names = beams.map((b) => b.name);
    expect(names).toContain('sill');
    expect(names).toContain('plate');
    const posts = beams.filter((b) => b.name === 'post');
    expect(posts.length).toBeGreaterThanOrEqual(Math.floor(6 / POST_SPACING));
    for (const p of posts) expect(p.x < 2 || p.x > 3).toBe(true); // no post through the window
    expect(beams.some((b) => b.name === 'brace')).toBe(true);
  });
});

describe('timber walls', () => {
  it('render as cob panels with timber beams, on both faces', () => {
    const g = buildWall({ id: 'w1', a: [0, 0], b: [6, 0], material: 'timber' }, [], { id: 'e2', height: 2.6 }, matFor);
    const panel = g.children.find((c) => c.isMesh && Array.isArray(c.material));
    expect(panel.material[0]).toBe(materialFor('cob', 'e2'));
    const posts = named(g, 'post');
    expect(posts.length).toBeGreaterThan(2);
    expect(posts[0].material).toBe(materialFor('timber', 'e2'));
    const box = new Box3().setFromObject(posts[0]);
    expect(box.max.z - box.min.z).toBeGreaterThan(0.3); // stands proud of the panel on both faces
  });
  it('leaves stone walls without framing', () => {
    const g = buildWall({ id: 'w1', a: [0, 0], b: [6, 0], material: 'stone' }, [], { id: 'e1', height: 3 }, matFor);
    expect(named(g, 'post')).toHaveLength(0);
  });
});
