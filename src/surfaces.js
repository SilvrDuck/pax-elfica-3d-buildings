import * as THREE from 'three';

const KIND = {
  enclosure: 'stone',
  stone: 'stone',
  cob: 'plaster',
  partition: 'plaster',
  timber: 'timber',
  planks: 'planks',
  dirt: 'dirt',
  flagstone: 'flagstone',
  cobbles: 'cobbles',
  tile: 'tile',
  thatch: 'thatch',
  slate: 'slate',
};

export const SURFACE_STYLE = {
  enclosure: { metres: 1.8, bump: 0.07 },
  stone: { metres: 1.55, bump: 0.065 },
  cob: { metres: 2.4, bump: 0.025 },
  partition: { metres: 2.2, bump: 0.018 },
  timber: { metres: 1.25, bump: 0.035 },
  planks: { metres: 1.3, bump: 0.035 },
  dirt: { metres: 2.2, bump: 0.045 },
  flagstone: { metres: 1.75, bump: 0.055 },
  cobbles: { metres: 1.25, bump: 0.065 },
  tile: { metres: 1.15, bump: 0.05 },
  thatch: { metres: 1.3, bump: 0.06 },
  slate: { metres: 1.2, bump: 0.035 },
};

const fract = (n) => n - Math.floor(n);
const hash = (x, y, seed = 0) => fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453);

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function stoneTone(x, y, seed, { cellW = 18, cellH = 12 } = {}) {
  const row = Math.floor(y / cellH);
  const sx = x + (row % 2) * Math.floor(cellW / 2);
  const mortar = y % cellH < 1.5 || sx % cellW < 1.5;
  const cellX = Math.floor(sx / cellW), cellY = Math.floor(y / cellH);
  const grain = hash(x, y, seed) * 18 - 9;
  const block = hash(cellX, cellY, seed + 3) * 24 - 12;
  return mortar ? 86 + grain * 0.4 : 204 + block + grain;
}

function surfaceTone(kind, x, y, size) {
  const noise = hash(x, y, size) * 20 - 10;
  if (kind === 'stone') return stoneTone(x, y, 1);
  if (kind === 'flagstone') return stoneTone(x, y, 5, { cellW: 25, cellH: 21 });
  if (kind === 'cobbles') {
    const row = Math.floor(y / 10), sx = x + (row % 2) * 7;
    const cx = (sx % 14) - 7, cy = (y % 10) - 5;
    const edge = (cx * cx) / 49 + (cy * cy) / 25 > 0.78;
    return edge ? 78 + noise : 192 + noise + hash(Math.floor(sx / 14), row, 4) * 25;
  }
  if (kind === 'plaster') {
    const cloud = Math.sin(x * 0.18) * 6 + Math.sin(y * 0.13 + x * 0.04) * 8;
    const hairline = (x + y * 2) % 53 < 0.45 && y % 31 > 13;
    return hairline ? 145 : 224 + cloud + noise * 0.55;
  }
  if (kind === 'timber' || kind === 'planks') {
    const board = kind === 'planks' ? 11 : 16;
    const seam = x % board < 1.2;
    const grain = Math.sin(y * 0.63 + Math.sin(x * 0.4) * 2.2) * 13;
    const knot = Math.hypot((x % 31) - 15, (y % 37) - 18) < 3.1;
    return seam ? 72 : 205 + grain + noise * 0.55 - (knot ? 42 : 0);
  }
  if (kind === 'tile' || kind === 'slate') {
    const rowH = kind === 'tile' ? 11 : 13;
    const row = Math.floor(y / rowH), sx = x + (row % 2) * 7;
    const seam = y % rowH < 1.5 || sx % 14 < 1.25;
    const roundEdge = kind === 'tile' && y % rowH > rowH - 2 && Math.abs((sx % 14) - 7) > 5.7;
    return seam || roundEdge ? 68 + noise : 202 + noise + hash(Math.floor(sx / 14), row, 9) * 20;
  }
  if (kind === 'thatch') {
    const strand = x % 4 < 1 ? -30 : 0;
    return 205 + strand + Math.sin(y * 0.9 + x) * 12 + noise;
  }
  if (kind === 'dirt') {
    const pebble = hash(Math.floor(x / 3), Math.floor(y / 3), 8) > 0.91 ? -45 : 0;
    return 203 + noise * 1.6 + pebble;
  }
  return 220 + noise;
}

/** Neutral, deterministic albedo pixels; the material colour supplies the final hue. */
export function buildSurfacePixels(name, size = 64) {
  const kind = KIND[name] ?? name;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const tone = clampByte(surfaceTone(kind, x, y, size));
      pixels[i] = tone;
      pixels[i + 1] = tone;
      pixels[i + 2] = tone;
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

const maps = new Map();

function dataTexture(pixels, size, colorSpace) {
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Shared procedural albedo and height maps. No source artwork is embedded or fetched. */
export function surfaceMaps(name, size = 64) {
  const kind = KIND[name];
  if (!kind) return null;
  if (maps.has(kind)) return maps.get(kind);
  const pixels = buildSurfacePixels(kind, size);
  const value = {
    map: dataTexture(pixels, size, THREE.SRGBColorSpace),
    bumpMap: dataTexture(pixels.slice(), size, THREE.NoColorSpace),
  };
  maps.set(kind, value);
  return value;
}

/** Triplanar-style UV projection in object space, expressed in real-world metres. */
export function projectUV(geometry, metres = 1.5) {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position || !normal) return geometry;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i)), nz = Math.abs(normal.getZ(i));
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; }
    else if (nx >= nz) { u = z; v = y; }
    else { u = x; v = y; }
    uv[i * 2] = u / metres;
    uv[i * 2 + 1] = v / metres;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}
