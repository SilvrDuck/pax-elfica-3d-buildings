// Anything the DM may read in the console is in French.
import { describe, it, expect } from 'vitest';
import { splitWall } from '../src/build/geometry.js';
import { validateLevel } from '../src/data/schema.js';

describe('console messages', () => {
  it('describes a clamped opening in French, keeping the wall id', () => {
    const { warnings } = splitWall({ id: 'w7', a: [0, 0], b: [6, 0], material: 'stone' }, [{ at: 5.6, width: 1.2, kind: 'door' }], 3);
    expect(warnings[0]).toMatch(/^w7 : .*dépasse.*/);
    expect(warnings[0]).not.toMatch(/runs past|clamped/);
  });

  it('reports schema problems in French', () => {
    const empty = { walls: [], openings: [], floors: [], stairs: [], rooms: [], props: [], lights: [], roofs: [] };
    expect(validateLevel({ ...empty, id: 'nulle-part' }).join('\n')).toMatch(/niveau inconnu/);
    const errors = validateLevel({ ...empty, id: 'rdc', openings: [{ wall: 'w99', at: 1, width: 1, kind: 'door' }] });
    expect(errors.join('\n')).toMatch(/mur inconnu « w99 »/);
    expect(errors.join('\n')).not.toMatch(/unknown|must be/);
  });
});
