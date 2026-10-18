#!/usr/bin/env node
// The two silo levels, read off the cross-sections drawn on sheet 3 and the rulebook (6 m across,
// 10 m deep, timber mid-floor, central spiral stair). Run: node tools/levels/silo.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Level, PROJECT } from '../lib/author.mjs';

const { silo } = JSON.parse(readFileSync(path.join(PROJECT, 'src', 'data', 'calibration.json'), 'utf8'));
const [cx, cz] = silo.centre;
const r = silo.radius;

// The author helpers work in cells; the silo is placed in metres, so convert back to cells here.
const calibration = JSON.parse(readFileSync(path.join(PROJECT, 'src', 'data', 'calibration.json'), 'utf8'));
const [gx, gz] = calibration.gridOrigin;
const cell = ([x, z]) => [(x - gx) / 1.5, (z - gz) / 1.5];
const around = (angleDeg, dist) => cell([cx + Math.cos((angleDeg * Math.PI) / 180) * dist, cz + Math.sin((angleDeg * Math.PI) / 180) * dist]);
const disc = (radius, n = 24) => Array.from({ length: n }, (_, i) => around((i * 360) / n, radius));

function siloLevel(id, number, floorMaterial, toLevel, props) {
  const L = new Level(id);
  L.floor(disc(r - 0.05), floorMaterial);
  L.room(number, disc(r - 0.3, 12));
  L.stair('spiral', cell([cx, cz]), cell([cx + 1.1, cz]), 1.1, toLevel);
  for (const [asset, angle, dist, rot, extra] of props) L.prop(asset, around(angle, dist), rot, extra);
  L.light(around(45, 1.8), 1.6, 'candle');
  L.light(around(225, 1.8), 1.6, 'candle');
  L.write();
}

// Upper level: the working cellar — barrels, crates, sacks, jars along the wall.
siloLevel('silo1', 36, 'planks', 'rdc', [
  ['barrel', 20, 2.3, 0], ['barrel', 45, 2.4, 0], ['barrel_large', 70, 2.1, 0], ['barrel', 100, 2.4, 0],
  ['crate', 135, 2.2, 15], ['crate_small', 160, 2.4, 0], ['crates_stacked', 200, 2.0, 30],
  ['sack', 235, 2.3, 10], ['sack', 250, 2.4, -20], ['sack', 265, 2.2, 40],
  ['keg', 300, 2.1, 0], ['crate', 330, 2.3, -10], ['barrel_stack', 355, 2.0, 90],
  ['bottle', 120, 1.6, 0], ['bucket', 280, 1.6, 0],
]);

// Lower level: the bric-à-brac — broken furniture, planks, cracked pots.
siloLevel('silo2', 37, 'dirt', 'silo1', [
  ['crate', 10, 2.2, 35], ['crate_small', 40, 2.4, 10], ['table_long', 75, 2.0, 60, { scale: 0.8 }],
  ['chair', 110, 2.3, 200], ['stool', 125, 1.8, 0], ['barrel', 150, 2.3, 0], ['trunk', 185, 2.2, 20],
  ['table_small', 215, 2.1, 30], ['crate', 245, 2.3, -25], ['sack', 270, 2.2, 0], ['sack', 285, 2.4, 50],
  ['shelf', 320, 2.3, 230], ['barrel', 345, 2.2, 0], ['bucket', 60, 1.5, 0], ['bottle', 200, 1.4, 0],
]);
