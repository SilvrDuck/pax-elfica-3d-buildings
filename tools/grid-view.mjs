#!/usr/bin/env node
// Renders a range of plan cells with the 1.5 m grid drawn and numbered, for authoring level data
// in cell coordinates. Columns count from the sheet's grid origin along x, rows along z.
//
//   node tools/grid-view.mjs <levelId> <col0> <row0> <cols> <rows> [out.png] [--walls] [--px=110]
//
// Cell (C, R) spans world x ∈ [gx + 1.5C, gx + 1.5(C+1)), z ∈ [gz + 1.5R, gz + 1.5(R+1)).
// --walls also draws the level's current walls (cyan) and openings (green).

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const [levelId, c0s, r0s, ncs, nrs, outArg] = args;
if (!levelId || ncs === undefined) {
  console.error('usage: grid-view.mjs <levelId> <col0> <row0> <cols> <rows> [out.png] [--walls]');
  process.exit(2);
}
const [c0, r0, nc, nr] = [c0s, r0s, ncs, nrs].map(Number);
const PX_PER_CELL = Number((flags.find((f) => f.startsWith('--px=')) ?? '--px=110').slice(5));

const cal = JSON.parse(readFileSync(path.join(PROJECT, 'src', 'data', 'calibration.json'), 'utf8'));
const sheet = cal.sheets[levelId];
const [gx, gz] = cal.gridOrigin;
const image = path.join(PROJECT, 'public', sheet.image);
const meta = await sharp(image).metadata();
const s = meta.width / sheet.worldRect[2]; // crop px per metre
const worldToPx = ([x, z]) => [(x - sheet.worldRect[0]) * s, (z - sheet.worldRect[1]) * s];

const x0 = gx + 1.5 * c0, z0 = gz + 1.5 * r0;
const [px0, py0] = worldToPx([x0, z0]).map(Math.round);
const w = Math.round(nc * 1.5 * s), h = Math.round(nr * 1.5 * s);
const left = Math.max(0, px0), top = Math.max(0, py0);
const width = Math.min(meta.width - left, w - (left - px0)), height = Math.min(meta.height - top, h - (top - py0));

const scale = PX_PER_CELL / (1.5 * s);
const W = Math.round(width * scale), H = Math.round(height * scale);
const margin = 36;
const parts = [];
const toView = ([x, z]) => [(x - x0) * s * scale - (left - px0) * scale + margin, (z - z0) * s * scale - (top - py0) * scale + margin];
for (let c = 0; c <= nc; c++) {
  const [vx] = toView([x0 + 1.5 * c, z0]);
  parts.push(`<line x1="${vx}" y1="${margin}" x2="${vx}" y2="${margin + H}" stroke="#fff" stroke-width="1" stroke-opacity="0.7"/>`);
  if (c < nc) parts.push(`<text x="${vx + PX_PER_CELL / 2}" y="${margin - 10}" font-size="20" fill="#fff" text-anchor="middle">${c0 + c}</text>`, `<text x="${vx + PX_PER_CELL / 2}" y="${margin + H + 26}" font-size="20" fill="#fff" text-anchor="middle">${c0 + c}</text>`);
}
for (let r = 0; r <= nr; r++) {
  const [, vy] = toView([x0, z0 + 1.5 * r]);
  parts.push(`<line x1="${margin}" y1="${vy}" x2="${margin + W}" y2="${vy}" stroke="#fff" stroke-width="1" stroke-opacity="0.7"/>`);
  if (r < nr) parts.push(`<text x="${margin - 8}" y="${vy + PX_PER_CELL / 2 + 7}" font-size="20" fill="#fff" text-anchor="end">${r0 + r}</text>`, `<text x="${margin + W + 8}" y="${vy + PX_PER_CELL / 2 + 7}" font-size="20" fill="#fff" text-anchor="start">${r0 + r}</text>`);
}
if (flags.includes('--walls')) {
  const file = path.join(PROJECT, 'src', 'data', 'levels', `${levelId}.json`);
  if (existsSync(file)) {
    const level = JSON.parse(readFileSync(file, 'utf8'));
    const byId = new Map(level.walls.map((wl) => [wl.id, wl]));
    for (const wl of level.walls) {
      const [ax, ay] = toView(wl.a), [bx, by] = toView(wl.b);
      parts.push(`<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#00e5ff" stroke-width="4" stroke-opacity="0.8"/>`);
      parts.push(`<text x="${(ax + bx) / 2}" y="${(ay + by) / 2 - 5}" font-size="13" fill="#fff" stroke="#000" stroke-width="0.5" text-anchor="middle">${wl.id}</text>`);
    }
    for (const o of level.openings) {
      const wl = byId.get(o.wall);
      if (!wl) continue;
      const l = Math.hypot(wl.b[0] - wl.a[0], wl.b[1] - wl.a[1]) || 1;
      const d = [(wl.b[0] - wl.a[0]) / l, (wl.b[1] - wl.a[1]) / l];
      const p = toView([wl.a[0] + d[0] * (o.at - o.width / 2), wl.a[1] + d[1] * (o.at - o.width / 2)]);
      const q = toView([wl.a[0] + d[0] * (o.at + o.width / 2), wl.a[1] + d[1] * (o.at + o.width / 2)]);
      parts.push(`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${o.kind === 'window' ? '#ffe14d' : '#39ff14'}" stroke-width="8"/>`);
    }
  }
}
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W + 2 * margin}" height="${H + 2 * margin}">${parts.join('')}</svg>`);
const crop = await sharp(image).extract({ left, top, width, height }).resize(W, H).toBuffer();
const out = outArg || path.join(PROJECT, 'verification', `grid-${levelId}-${c0}-${r0}.png`);
mkdirSync(path.dirname(out), { recursive: true });
await sharp({ create: { width: W + 2 * margin, height: H + 2 * margin, channels: 3, background: '#202020' } })
  .composite([{ input: crop, left: margin, top: margin }, { input: svg }])
  .png()
  .toFile(out);
console.log(`wrote ${path.relative(PROJECT, out)} (cells ${c0}..${c0 + nc - 1} × ${r0}..${r0 + nr - 1})`);
