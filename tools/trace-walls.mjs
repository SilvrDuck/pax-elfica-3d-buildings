#!/usr/bin/env node
// Drafts src/data/levels/<levelId>.json from the official sheet's wall ink.
//
//   node tools/trace-walls.mjs rdc [--force] [--keep-noise]
//
// The draft holds walls and openings only; floors, rooms, stairs, props, lights and roofs are
// added by hand against the calque. An existing file is left alone unless --force is given.
// --keep-noise skips the filter that drops disconnected groups of walls under 6 m.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadSheet, SHEET_INK } from './lib/sheets.mjs';
import { traceInk } from './lib/trace.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const LEVELS_DIR = path.join(PROJECT, 'src', 'data', 'levels');
const SHEET_OF = { rdc: 'rdc', e1: 'e1', e2: 'e3', e3: 'e3', e4: 'e3' };

const [levelId, ...flags] = process.argv.slice(2);
if (!SHEET_OF[levelId]) {
  console.error(`usage: trace-walls.mjs <${Object.keys(SHEET_OF).join('|')}> [--force] [--keep-noise]`);
  process.exit(2);
}
const out = path.join(LEVELS_DIR, `${levelId}.json`);
if (existsSync(out) && !flags.includes('--force')) {
  console.error(`${path.relative(PROJECT, out)} exists; pass --force to overwrite it`);
  process.exit(1);
}

const calibration = JSON.parse(readFileSync(path.join(PROJECT, 'src', 'data', 'calibration.json'), 'utf8'));
const sheetInfo = calibration.sheets[levelId];
const sheet = await loadSheet(SHEET_OF[levelId]);
const k = calibration.sheetPxPerM;

// Half resolution keeps thinning fast; walls are still ~30 px wide there.
const [cx, cy, cw, chh] = sheetInfo.crop;
const w = Math.floor(cw / 2), h = Math.floor(chh / 2);
const data = new Uint8Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const sx = cx + 2 * x, sy = cy + 2 * y;
  let m = 0;
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) m = Math.max(m, sheet.full.data[(sy + dy) * sheet.width + sx + dx]);
  data[y * w + x] = m;
}
// World = (sheet px + offsetPx) / k, so the crop origin in world-px terms is -(crop + offset).
const originPx = [-(cx + sheetInfo.offsetPx[0]) / 2, -(cy + sheetInfo.offsetPx[1]) / 2];
const material = SHEET_INK[SHEET_OF[levelId]] === 'timber' ? 'timber' : 'stone';
const { walls, openings } = traceInk({ data, width: w, height: h }, { pxPerM: k / 2, originPx, material, keepNoise: flags.includes('--keep-noise'), log: (m) => console.error(m) });

mkdirSync(LEVELS_DIR, { recursive: true });
const level = { id: levelId, walls, openings, floors: [], stairs: [], rooms: [], props: [], lights: [], roofs: [] };
writeFileSync(out, JSON.stringify(level, null, 1) + '\n');
console.log(`${path.relative(PROJECT, out)}: ${walls.length} walls, ${openings.length} openings`);
