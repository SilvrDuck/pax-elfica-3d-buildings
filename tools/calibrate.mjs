#!/usr/bin/env node
// Calibrates the official plan sheets to world metres and cuts the calque crops.
//
// World frame: metres, origin at the top-left pixel of the RdC sheet, x east, z south.
// Every other sheet (or sub-plan on the stacked sheet) is registered onto that frame by matching
// the tower octagon, which is drawn identically on every level.
//
// Writes src/data/calibration.json and public/plans/<level>.jpg.

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { loadSheet, PLANS_DIR, SHEET_FILES, CELL_M } from './lib/sheets.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const OUT_JSON = path.join(PROJECT, 'src', 'data', 'calibration.json');
const OUT_PLANS = path.join(PROJECT, 'public', 'plans');

// Tower octagon on the RdC sheet, in sheet px: the registration template.
const TOWER_BOX = [330, 330, 1300, 1200];
// Sheet 3 stacks three sub-plans top to bottom; each level's tower must land in its band (fraction of sheet height).
const LEVELS = [
  { id: 'rdc', sheet: 'rdc', band: [0, 1], crop: 'sheet' },
  { id: 'e1', sheet: 'e1', band: [0, 1], crop: 'sheet' },
  { id: 'e2', sheet: 'e3', band: [0, 0.36], crop: 'building' },
  { id: 'e3', sheet: 'e3', band: [0.3, 0.68], crop: 'building' },
  { id: 'e4', sheet: 'e3', band: [0.62, 1], crop: 'building' },
];
// Extent of the inn around the tower template's top-left corner, in cells, used to frame the sub-plan crops.
const BUILDING_FROM_TOWER = { left: -1, top: -1, width: 25, height: 12 };
// The grid phase-lock assumes every sub-plan's grid is drawn in step with its walls; the 4e
// sub-plan's grid is drawn half a cell off, so its lock lands half a cell away. The correction
// (in cells, x then z) is the one that puts the drawn tower on the lower floors' tower.
const PERIOD_NUDGE = { e4: [-0.5, 0.5] };
// The buried silo: the rulebook gives 6 m across and 10 m deep, centred on the cellar's spiral stair.
const SILO_CENTRE_CELL = [8.6, 8.9];
const SILO = { radius: 3, depth: 10 };
// Silo cross-sections drawn on sheet 3, in that sheet's e3 sub-plan cells: centre and radius.
const SILO_DRAWINGS = { silo1: { centre: [12.1, 10.1], radius: 2.3 }, silo2: { centre: [16.6, 10.1], radius: 2.3 } };

// Phase of the grid lines along one axis within a region [x, y, w, h] of the sheet: the offset in
// [0, pitch), in sheet px, where the light grid lines sit.
function gridPhase(sheet, pitch, axis, region = [0, 100, sheet.width, 300]) {
  const { data, width } = sheet.grey;
  const [rx, ry, rw, rh] = region.map(Math.round);
  const n = axis === 'x' ? rw : rh;
  const across = axis === 'x' ? rh : rw;
  const signal = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < across; j++) s += axis === 'x' ? data[(ry + j) * width + rx + i] : data[(ry + i) * width + rx + j];
    signal[i] = s / across;
  }
  const base = axis === 'x' ? rx : ry;
  const w = 31;
  let best = [0, -Infinity];
  for (let phase = 0; phase < pitch; phase++) {
    let s = 0, c = 0;
    for (let i = phase; i < n; i += pitch) {
      let m = 0, k = 0;
      for (let j = -w; j <= w; j++) if (i + j >= 0 && i + j < n) { m += signal[i + j]; k++; }
      s += signal[i] - m / k; c++;
    }
    if (s / c > best[1]) best = [phase, s / c];
  }
  return (best[0] + base) % pitch;
}

// Wraps v into (-pitch/2, pitch/2].
const wrap = (v, pitch) => ((((v + pitch / 2) % pitch) + pitch) % pitch) - pitch / 2;

function measureGrid(sheet) {
  const results = [];
  for (const axis of ['x', 'y']) {
    const { data, width, height } = sheet.grey;
    const n = axis === 'x' ? width : height;
    const band = 300;
    const signal = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 100; j < 100 + band; j++) s += axis === 'x' ? data[j * width + i] : data[i * width + j];
      signal[i] = s / band;
    }
    const w = 31;
    const hp = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0, c = 0;
      for (let j = -w; j <= w; j++) if (i + j >= 0 && i + j < n) { s += signal[i + j]; c++; }
      hp[i] = signal[i] - s / c;
    }
    let best = [0, -Infinity];
    for (let lag = 120; lag <= 220; lag++) {
      let s = 0;
      for (let i = 0; i + lag < n; i++) s += hp[i] * hp[i + lag];
      s /= n - lag;
      if (s > best[1]) best = [lag, s];
    }
    results.push(best[0]);
  }
  return results;
}

// Ink pixels of the template as a sparse list at quarter scale.
function towerTemplate(sheet) {
  const q = sheet.quarter;
  const [x, y, w, h] = TOWER_BOX.map((v) => Math.round(v / 4));
  const pts = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = q.data[(y + j) * q.width + x + i];
    if (v > 30) pts.push(i, j, v);
  }
  return { pts, w, h };
}

// Normalised correlation of the sparse template over the quarter-scale ink, restricted to a band.
function matchTower(sheet, tpl, band) {
  const q = sheet.quarter;
  const W = q.width + 1;
  const sq = new Float64Array(W * (q.height + 1));
  for (let y = 0; y < q.height; y++) {
    let row = 0;
    for (let x = 0; x < q.width; x++) {
      const v = q.data[y * q.width + x];
      row += v * v;
      sq[(y + 1) * W + x + 1] = sq[y * W + x + 1] + row;
    }
  }
  const energy = (x, y) => {
    const x1 = Math.min(q.width, x + tpl.w), y1 = Math.min(q.height, y + tpl.h);
    return sq[y1 * W + x1] - sq[y * W + x1] - sq[y1 * W + x] + sq[y * W + x];
  };
  const score = (x, y) => {
    let s = 0;
    for (let i = 0; i < tpl.pts.length; i += 3) {
      const px = x + tpl.pts[i], py = y + tpl.pts[i + 1];
      if (px >= q.width || py >= q.height) continue;
      s += tpl.pts[i + 2] * q.data[py * q.width + px];
    }
    return s / Math.sqrt(energy(x, y) + 1);
  };
  const yLo = Math.max(0, Math.floor(band[0] * q.height - tpl.h / 2));
  const yHi = Math.min(q.height - tpl.h, Math.ceil(band[1] * q.height - tpl.h / 2));
  let best = { s: -1 };
  for (let y = yLo; y <= yHi; y += 3) for (let x = 0; x <= q.width - tpl.w; x += 3) {
    const s = score(x, y);
    if (s > best.s) best = { s, x, y };
  }
  for (let y = best.y - 3; y <= best.y + 3; y++) for (let x = best.x - 3; x <= best.x + 3; x++) {
    if (x < 0 || y < 0) continue;
    const s = score(x, y);
    if (s > best.s) best = { s, x, y };
  }
  return { x: best.x * 4, y: best.y * 4, score: best.s };
}

async function writeCrop(sheet, crop, outFile) {
  const [left, top, width, height] = crop.map(Math.round);
  await sharp(path.join(PLANS_DIR, sheet.fileName))
    .extract({ left, top, width, height })
    .resize({ width: Math.min(2048, width), height: Math.min(2048, height), fit: 'inside' })
    .jpeg({ quality: 80 })
    .toFile(outFile);
}

async function main() {
  mkdirSync(OUT_PLANS, { recursive: true });
  const rdc = await loadSheet('rdc');
  const [gx, gy] = measureGrid(rdc);
  const pxPerCell = (gx + gy) / 2;
  if (pxPerCell < 177 || pxPerCell > 181) throw new Error(`grid pitch ${gx}/${gy} px out of range`);
  const k = pxPerCell / CELL_M;
  const phase = [gridPhase(rdc, Math.round(pxPerCell), 'x'), gridPhase(rdc, Math.round(pxPerCell), 'y')];
  console.log(`grid: ${gx} px (x), ${gy} px (y) → ${pxPerCell} px per ${CELL_M} m cell, phase (${phase}) px`);

  const tpl = towerTemplate(rdc);
  const towerRdc = matchTower(rdc, tpl, [0, 1]);
  console.log(`tower on rdc: (${towerRdc.x}, ${towerRdc.y}) self-score ${towerRdc.score.toFixed(1)}`);

  const sheets = {};
  for (const level of LEVELS) {
    const sheet = await loadSheet(level.sheet);
    const tower = level.id === 'rdc' ? towerRdc : matchTower(sheet, tpl, level.band);
    let offsetPx = [towerRdc.x - tower.x, towerRdc.y - tower.y];
    let crop;
    if (level.crop === 'sheet') {
      crop = [0, 0, sheet.width, sheet.height];
    } else {
      const b = BUILDING_FROM_TOWER;
      const x0 = Math.max(0, tower.x + b.left * pxPerCell);
      const y0 = Math.max(0, tower.y + b.top * pxPerCell);
      const x1 = Math.min(sheet.width, x0 + b.width * pxPerCell);
      const y1 = Math.min(sheet.height, y0 + b.height * pxPerCell);
      crop = [x0, y0, x1 - x0, y1 - y0];
    }
    // The tower match settles the whole-cell part of the offset; the drawn grid, identical on every
    // sheet, settles the fraction: shift so this crop's grid lines land on the RdC grid lines.
    if (level.id !== 'rdc') {
      const P = Math.round(pxPerCell);
      const ph = [gridPhase(sheet, P, 'x', crop), gridPhase(sheet, P, 'y', crop)];
      const nudge = PERIOD_NUDGE[level.id] ?? [0, 0];
      const refined = offsetPx.map((o, i) => o + wrap(phase[i] - ph[i] - o, P) + nudge[i] * P);
      console.log(`${level.id}: grid phase (${ph}) → offset refined by (${refined.map((v, i) => v - offsetPx[i])}) px`);
      offsetPx = refined;
    }
    const image = `plans/${level.id}.jpg`;
    await writeCrop(sheet, crop, path.join(OUT_PLANS, `${level.id}.jpg`));
    sheets[level.id] = {
      file: SHEET_FILES[level.sheet],
      crop: crop.map(Math.round),
      offsetPx,
      worldRect: [(crop[0] + offsetPx[0]) / k, (crop[1] + offsetPx[1]) / k, crop[2] / k, crop[3] / k].map((v) => +v.toFixed(3)),
      image,
      towerScore: +tower.score.toFixed(1),
    };
    console.log(`${level.id}: tower at (${tower.x}, ${tower.y}) score ${tower.score.toFixed(1)} offsetPx (${offsetPx}) worldRect ${sheets[level.id].worldRect}`);
  }

  // World position of grid line 0 on each axis: cell (C, R) has its top-left corner at
  // gridOrigin + 1.5 * (C, R).
  const gridOrigin = phase.map((v) => +(v / k).toFixed(3));
  const cellToWorld = ([c, r]) => [gridOrigin[0] + CELL_M * c, gridOrigin[1] + CELL_M * r];
  const siloCentre = cellToWorld(SILO_CENTRE_CELL).map((v) => +v.toFixed(3));
  // Silo calques: the circles drawn on sheet 3, framed to land centred on the silo in world space.
  const e3 = sheets.e3;
  const e3Sheet = await loadSheet('e3');
  for (const [id, d] of Object.entries(SILO_DRAWINGS)) {
    const [wx, wz] = cellToWorld(d.centre);
    const rPx = d.radius * pxPerCell;
    const cx = wx * k - e3.offsetPx[0], cy = wz * k - e3.offsetPx[1];
    const crop = [cx - rPx, cy - rPx, 2 * rPx, 2 * rPx].map(Math.round);
    const image = `plans/${id}.jpg`;
    await writeCrop(e3Sheet, crop, path.join(OUT_PLANS, `${id}.jpg`));
    const rM = d.radius * CELL_M;
    sheets[id] = { file: SHEET_FILES.e3, crop, offsetPx: null, worldRect: [siloCentre[0] - rM, siloCentre[1] - rM, 2 * rM, 2 * rM].map((v) => +v.toFixed(3)), image };
    console.log(`${id}: circle crop ${crop} → worldRect ${sheets[id].worldRect}`);
  }
  const calibration = { pxPerCell, cellM: CELL_M, sheetPxPerM: k, gridOrigin, silo: { centre: siloCentre, ...SILO }, sheets };
  writeFileSync(OUT_JSON, JSON.stringify(calibration, null, 2) + '\n');
  console.log(`wrote ${path.relative(PROJECT, OUT_JSON)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
