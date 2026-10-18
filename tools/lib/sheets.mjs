// Shared access to the official plan sheets: raw pixels plus the wall-ink likeness map.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { open } from './morph.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..', '..', '..');
export const PLANS_DIR = process.env.PLANS_DIR || path.join(REPO, 'Officiel', 'Plans_batiments');
export const CELL_M = 1.5;
export const SHEET_FILES = {
  rdc: 'Auberge de l_Epée 1-RDC.jpg',
  e1: 'Auberge de l_Epée 2-1er étage.jpg',
  e3: 'Auberge de l_Epée 3-étages et toits.jpg',
};
// Lower sheets draw stone walls in mauve grey; the stacked upper-floor sheet draws timber walls in
// dark red-brown.
export const SHEET_INK = { rdc: 'stone', e1: 'stone', e3: 'timber' };

// Widest ink that still counts as a wall, in metres. Anything wider (roofs, shadows) is dropped.
const MAX_WALL_M = 1.4;

// Stone ink is about rgb(100,68,68): darker than the ground and the courtyard, lighter than the
// neighbours' roofs, redder than the river stones and with much less red-blue spread than any
// floor. Ink-likeness is a soft band-pass on luma gated by those tints, scaled 0–80.
export function stoneInk(r, g, b) {
  const luma = 0.3 * r + 0.59 * g + 0.11 * b;
  const tint = r - b;
  // Roof tiles are as dark as wall shadows but far more saturated.
  if (luma <= 40 || luma >= 110 || tint >= 60 || r < g + 10 || tint > 0.5 * r) return 0;
  const lumaW = luma < 50 ? (luma - 40) / 10 : luma > 100 ? (110 - luma) / 10 : 1;
  const tintW = tint > 45 ? (60 - tint) / 15 : 1;
  return 80 * lumaW * tintW;
}

// Timber ink is about rgb(90,42,18): a saturated dark red-brown. Roof tiles share the colour and
// are removed afterwards by the thickness filter.
export function timberInk(r, g, b) {
  const luma = 0.3 * r + 0.59 * g + 0.11 * b;
  if (luma <= 30 || luma >= 85 || r - g < 25 || r - b < 45) return 0;
  const lumaW = luma < 40 ? (luma - 30) / 10 : luma > 75 ? (85 - luma) / 10 : 1;
  return 80 * lumaW;
}

export function toInk({ data, info }, model) {
  const fn = model === 'timber' ? timberInk : stoneInk;
  const ink = new Uint8Array(info.width * info.height);
  const ch = info.channels;
  for (let i = 0; i < ink.length; i++) {
    ink[i] = fn(data[i * ch], data[i * ch + 1], data[i * ch + 2]);
  }
  return { data: ink, width: info.width, height: info.height };
}

// Zeroes ink that survives a morphological opening with a (2r+1) square: regions wider than a wall.
export function dropThickInk(ink, r) {
  const { data, width, height } = ink;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i] > 30 ? 1 : 0;
  const thick = open(mask, width, height, r);
  const out = new Uint8Array(data);
  for (let i = 0; i < out.length; i++) if (thick[i]) out[i] = 0;
  return { data: out, width, height };
}

const cache = new Map();

/** Loads a sheet once: `full` and `quarter` are wall-ink maps, `grey` is the luminance at full size. */
export async function loadSheet(key) {
  if (cache.has(key)) return cache.get(key);
  const fileName = SHEET_FILES[key];
  const img = sharp(path.join(PLANS_DIR, fileName));
  const { width, height } = await img.metadata();
  const rgb = (s) => s.toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [quarter, full, grey] = await Promise.all([
    rgb(img.clone().resize(Math.round(width / 4), Math.round(height / 4))),
    rgb(img.clone()),
    img.clone().greyscale().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const model = SHEET_INK[key];
  const pxPerM = 179 / CELL_M;
  const rFull = Math.round((MAX_WALL_M / 2) * pxPerM);
  const sheet = {
    key,
    fileName,
    width,
    height,
    quarter: dropThickInk(toInk(quarter, model), Math.round(rFull / 4)),
    full: dropThickInk(toInk(full, model), rFull),
    grey: { data: grey.data, width: grey.info.width, height: grey.info.height },
  };
  cache.set(key, sheet);
  return sheet;
}
