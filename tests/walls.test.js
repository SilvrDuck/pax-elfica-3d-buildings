import { describe, it, expect } from 'vitest';
import { splitWall, THICKNESS } from '../src/build/geometry.js';

const wall = { id: 'w1', a: [0, 0], b: [6, 0], material: 'stone' };

describe('splitWall', () => {
  it('leaves a solid wall as one piece the full storey high', () => {
    const { pieces, warnings } = splitWall(wall, [], 3);
    expect(pieces).toEqual([{ x0: 0, x1: 6, y0: 0, y1: 3 }]);
    expect(warnings).toEqual([]);
  });

  it('cuts a door into two jambs and a lintel', () => {
    const { pieces } = splitWall(wall, [{ at: 2.6, width: 1.2, kind: 'door' }], 3);
    expect(pieces).toEqual([
      { x0: 0, x1: 2, y0: 0, y1: 3 },
      { x0: 3.2, x1: 6, y0: 0, y1: 3 },
      { x0: 2, x1: 3.2, y0: 2.1, y1: 3 },
    ]);
  });

  it('cuts a window with a sill and a lintel', () => {
    const { pieces } = splitWall(wall, [{ at: 3, width: 1, kind: 'window' }], 3);
    expect(pieces).toContainEqual({ x0: 2.5, x1: 3.5, y0: 0, y1: 0.9 });
    expect(pieces).toContainEqual({ x0: 2.5, x1: 3.5, y0: 2, y1: 3 });
  });

  it('clamps an opening that runs past the wall end and warns', () => {
    const { pieces, warnings } = splitWall(wall, [{ at: 5.6, width: 1.2, kind: 'door' }], 3);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('w1');
    expect(pieces).toEqual([
      { x0: 0, x1: 5, y0: 0, y1: 3 },
      { x0: 5, x1: 6, y0: 2.1, y1: 3 },
    ]);
  });

  it('merges overlapping openings', () => {
    const { pieces } = splitWall(wall, [{ at: 2, width: 1, kind: 'door' }, { at: 2.6, width: 1, kind: 'door' }], 3);
    expect(pieces).toEqual([
      { x0: 0, x1: 1.5, y0: 0, y1: 3 },
      { x0: 3.1, x1: 6, y0: 0, y1: 3 },
      { x0: 1.5, x1: 3.1, y0: 2.1, y1: 3 },
    ]);
  });

  it('keeps a trapdoor out of the wall and warns', () => {
    const { pieces, warnings } = splitWall(wall, [{ at: 3, width: 1, kind: 'trapdoor' }], 3);
    expect(pieces).toEqual([{ x0: 0, x1: 6, y0: 0, y1: 3 }]);
    expect(warnings).toHaveLength(1);
  });

  it('fixes wall thickness by material', () => {
    expect(THICKNESS).toEqual({ enclosure: 0.6, stone: 0.5, timber: 0.3, cob: 0.3, partition: 0.2 });
  });
});
