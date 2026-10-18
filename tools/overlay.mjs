#!/usr/bin/env node
// Draws a level's walls and openings over its plan crop, for checking a trace without the app.
//
//   node tools/overlay.mjs rdc [out.png]   → verification/overlay-rdc.png by default
//
// Walls are cyan, doors green, windows yellow; wall ids are printed at each wall's middle.

import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const [levelId, outArg] = process.argv.slice(2);
const calibration = JSON.parse(readFileSync(path.join(PROJECT, 'src', 'data', 'calibration.json'), 'utf8'));
const sheet = calibration.sheets[levelId];
const level = JSON.parse(readFileSync(path.join(PROJECT, 'src', 'data', 'levels', `${levelId}.json`), 'utf8'));
const image = path.join(PROJECT, 'public', sheet.image);
const { width, height } = await sharp(image).metadata();

// Crop image px per world metre, and world → crop image px.
const s = width / sheet.worldRect[2];
const toPx = ([x, z]) => [(x - sheet.worldRect[0]) * s, (z - sheet.worldRect[1]) * s];
const parts = [];
for (const w of level.walls) {
  const [x1, y1] = toPx(w.a), [x2, y2] = toPx(w.b);
  parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#00e5ff" stroke-width="3" stroke-opacity="0.85"/>`);
  parts.push(`<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 4}" font-size="14" fill="#ffffff" stroke="#000" stroke-width="0.6" text-anchor="middle">${w.id}</text>`);
}
const byId = new Map(level.walls.map((w) => [w.id, w]));
for (const o of level.openings) {
  const w = byId.get(o.wall);
  if (!w) continue;
  const l = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) || 1;
  const d = [(w.b[0] - w.a[0]) / l, (w.b[1] - w.a[1]) / l];
  const p = toPx([w.a[0] + d[0] * (o.at - o.width / 2), w.a[1] + d[1] * (o.at - o.width / 2)]);
  const q = toPx([w.a[0] + d[0] * (o.at + o.width / 2), w.a[1] + d[1] * (o.at + o.width / 2)]);
  const color = o.kind === 'door' || o.kind === 'arch' ? '#39ff14' : '#ffe14d';
  parts.push(`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${color}" stroke-width="7"/>`);
}
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${parts.join('')}</svg>`);
const out = outArg || path.join(PROJECT, 'verification', `overlay-${levelId}.png`);
mkdirSync(path.dirname(out), { recursive: true });
await sharp(image).composite([{ input: svg }]).png().toFile(out);
console.log(`wrote ${path.relative(PROJECT, out)} (${level.walls.length} walls, ${level.openings.length} openings)`);
