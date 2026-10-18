#!/usr/bin/env node
// Bundles the props listed in src/data/props.json from vendor/ into public/assets/<pack>/<id>.glb
// (self-contained, textures embedded), records the bundled file name in props.json, fills in a
// footprint and height from the model's own size only where the entry leaves them unset, and
// writes public/assets/LICENSES.md. Pack models are not drawn to a common scale, so entries fix
// real-world sizes in metres and the app scales each model to fit them.
//
//   node tools/pick-assets.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NodeIO, getBounds } from '@gltf-transform/core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.resolve(HERE, '..');
const PROPS = path.join(PROJECT, 'src', 'data', 'props.json');
const VENDOR = path.join(PROJECT, 'vendor');
const OUT = path.join(PROJECT, 'public', 'assets');

// Where each pack keeps its glTF files, relative to vendor/<pack>/.
const PACKS = {
  'kaykit-furniture': { dir: 'addons/kaykit_furniture_bits/Assets/gltf', name: 'KayKit Furniture Bits 1.0', by: 'Kay Lousberg', url: 'https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0', licence: 'CC0 1.0' },
  'kaykit-dungeon': { dir: 'addons/kaykit_dungeon_remastered/Assets/gltf', name: 'KayKit Dungeon Remastered 1.0', by: 'Kay Lousberg', url: 'https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0', licence: 'CC0 1.0' },
  'kenney-furniture-kit': { dir: 'Models/GLTF format', name: 'Kenney Furniture Kit', by: 'Kenney', url: 'https://kenney.nl/assets/furniture-kit', licence: 'CC0 1.0' },
  'kenney-fantasy-town-kit': { dir: 'Models/GLB format', name: 'Kenney Fantasy Town Kit', by: 'Kenney', url: 'https://kenney.nl/assets/fantasy-town-kit', licence: 'CC0 1.0' },
  'kenney-castle-kit': { dir: 'Models/GLB format', name: 'Kenney Castle Kit', by: 'Kenney', url: 'https://kenney.nl/assets/castle-kit', licence: 'CC0 1.0' },
  'kenney-survival-kit': { dir: 'Models/GLB format', name: 'Kenney Survival Kit', by: 'Kenney', url: 'https://kenney.nl/assets/survival-kit', licence: 'CC0 1.0' },
  'kenney-graveyard-kit': { dir: 'Models/GLB format', name: 'Kenney Graveyard Kit', by: 'Kenney', url: 'https://kenney.nl/assets/graveyard-kit', licence: 'CC0 1.0' },
};

function findSource(pack, source) {
  const base = path.join(VENDOR, pack, PACKS[pack].dir);
  const direct = path.join(base, source);
  if (existsSync(direct)) return direct;
  // Some kits nest the glTF folder one level deeper (e.g. a top-level folder named after the kit).
  const nested = path.join(VENDOR, pack);
  const stack = [nested];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSafe(dir)) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.name === source) return p;
    }
  }
  return null;
}

import { readdirSync } from 'node:fs';
function readdirSafe(dir) {
  try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

const props = JSON.parse(readFileSync(PROPS, 'utf8'));
const io = new NodeIO();
const used = new Set();
let bundled = 0, missing = 0;
for (const [id, entry] of Object.entries(props)) {
  if (entry.pack === 'primitive') continue;
  if (!PACKS[entry.pack]) { console.error(`${id}: unknown pack ${entry.pack}`); missing++; continue; }
  const src = findSource(entry.pack, entry.source);
  if (!src) { console.error(`${id}: ${entry.pack}/${entry.source} not found in vendor/`); missing++; continue; }
  const document = await io.read(src);
  const scene = document.getRoot().getDefaultScene() ?? document.getRoot().listScenes()[0];
  const { min, max } = getBounds(scene);
  const native = { footprint: [+(max[0] - min[0]).toFixed(3), +(max[2] - min[2]).toFixed(3)], height: +(max[1] - min[1]).toFixed(3) };
  if (!entry.footprint) entry.footprint = native.footprint;
  if (!entry.height) entry.height = native.height;
  entry.file = `${id}.glb`;
  console.log(`${id}: native ${native.footprint.join('×')} × ${native.height} m → ${entry.footprint.join('×')} × ${entry.height} m`);
  const dest = path.join(OUT, entry.pack, entry.file);
  mkdirSync(path.dirname(dest), { recursive: true });
  await io.write(dest, document);
  used.add(entry.pack);
  bundled++;
}
writeFileSync(PROPS, '{\n' + Object.entries(props).map(([id, e]) => `  ${JSON.stringify(id)}: ${JSON.stringify(e)}`).join(',\n') + '\n}\n');

const lines = ['# Licences des modèles 3D', '', 'Tous les modèles de ce dossier proviennent de packs placés dans le domaine public (CC0 1.0) par leurs auteurs. Seules les pièces utilisées par l\'application sont copiées ici.', ''];
for (const pack of [...used].sort()) {
  const p = PACKS[pack];
  lines.push(`- **${p.name}** — ${p.by}, ${p.licence}, ${p.url}`);
}
lines.push('', 'Licence CC0 1.0 : https://creativecommons.org/publicdomain/zero/1.0/', '');
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'LICENSES.md'), lines.join('\n'));
console.log(`${bundled} models bundled into public/assets/, ${missing} missing`);
if (missing) process.exit(1);
