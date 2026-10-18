import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

import nodePath from 'node:path';
const path = nodePath.resolve(process.cwd(), 'src/data/calibration.json');
const INN_LEVELS = ['rdc', 'e1', 'e2', 'e3', 'e4'];
// The crops are cut from the copyrighted plans and never committed; they exist only where the
// plans do.
const cropsPresent = existsSync(nodePath.resolve(process.cwd(), 'public/plans'));

describe('plan calibration', () => {
  it('exists with a grid pitch close to the measured 179 px per cell', () => {
    expect(existsSync(path)).toBe(true);
    const cal = JSON.parse(readFileSync(path, 'utf8'));
    expect(cal.pxPerCell).toBeGreaterThanOrEqual(177);
    expect(cal.pxPerCell).toBeLessThanOrEqual(181);
    expect(cal.cellM).toBe(1.5);
  });

  it('has a sheet and a calque crop for every inn level', () => {
    const cal = JSON.parse(readFileSync(path, 'utf8'));
    for (const id of INN_LEVELS) {
      const sheet = cal.sheets[id];
      expect(sheet, id).toBeDefined();
      expect(sheet.image).toBe(`plans/${id}.jpg`);
      const [, , w, h] = sheet.worldRect;
      expect(w, `${id} width`).toBeGreaterThan(20);
      expect(w, `${id} width`).toBeLessThan(50);
      expect(h, `${id} height`).toBeGreaterThan(10);
      if (cropsPresent) expect(existsSync(nodePath.resolve(process.cwd(), 'public', sheet.image)), sheet.image).toBe(true);
    }
  });

  it('registers every sheet onto the RdC frame through the tower octagon', () => {
    const cal = JSON.parse(readFileSync(path, 'utf8'));
    expect(cal.sheets.rdc.offsetPx).toEqual([0, 0]);
    // The 1er sheet is framed like the RdC sheet: a few pixels of drift at most.
    expect(Math.abs(cal.sheets.e1.offsetPx[0])).toBeLessThan(40);
    expect(Math.abs(cal.sheets.e1.offsetPx[1])).toBeLessThan(40);
    // Sub-plans stack downwards on sheet 3.
    expect(cal.sheets.e3.offsetPx[1]).toBeLessThan(cal.sheets.e2.offsetPx[1]);
    expect(cal.sheets.e4.offsetPx[1]).toBeLessThan(cal.sheets.e3.offsetPx[1]);
  });
});
