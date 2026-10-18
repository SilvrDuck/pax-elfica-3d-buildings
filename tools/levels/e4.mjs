#!/usr/bin/env node
// Fourth floor: the top of the tower, read off the bottom sub-plan of
// "Auberge de l_Epée 3-étages et toits.jpg" in grid cells. The main body ends below with its roof.
// Run: node tools/levels/e4.mjs → src/data/levels/e4.json

import { Level } from '../lib/author.mjs';

const L = new Level('e4');
const S = 'stone', T = 'timber';
const glow = { glow: true };

// ---- Tower shell: the octagon plus its east bay ----------------------------------------------
const tNorth = L.wall([2.55, 1.6], [5.1, 1.6], S);
L.wall([5.1, 1.6], [5.8, 2.95], S);
const tNW = L.wall([2.55, 1.6], [1.25, 2.85], S);
const tWest = L.wall([1.25, 2.85], [1.25, 4.6], S);
const tSW = L.wall([1.25, 4.6], [3.5, 6.9], S);
L.wall([3.5, 6.9], [3.9, 7.9], S);
L.wall([5.8, 2.95], [7.5, 3.0], S);
const tEast = L.wall([7.5, 3.0], [7.5, 7.9], S);
L.window(tEast, [7.5, 4.5], 0.8, glow);
L.wall([3.9, 7.9], [7.5, 7.9], S);
L.window(tNorth, [3.1, 1.6], 0.8, glow);
L.window(tNW, [1.9, 2.22], 0.8, glow);
L.window(tWest, [1.25, 3.7], 0.8, glow);
L.window(tSW, [2.2, 5.57], 0.8, glow);

// ---- Apartments 38–40 ------------------------------------------------------------------------
L.wall([3.7, 1.6], [3.7, 5.9], T);
L.wall([5.9, 2.95], [5.9, 5.9], T);
const s38 = L.wall([2.75, 5.9], [3.7, 5.9], T);
L.door(s38, [3.25, 5.9], 0.9);
const s39 = L.wall([3.7, 5.9], [5.9, 5.9], T);
L.door(s39, [4.6, 5.9], 0.9);
const s40 = L.wall([5.9, 5.9], [7.5, 5.9], T);
L.door(s40, [6.6, 5.9], 0.9);
L.wall([5.0, 6.7], [5.0, 7.9], S); // chimney and stair block
L.wall([5.0, 6.7], [7.5, 6.7], S);

// ---- Floors and rooms --------------------------------------------------------------------------
const planks = 'planks';
L.floor([[2.55, 1.6], [3.7, 1.6], [3.7, 5.9], [2.75, 5.9], [1.25, 4.6], [1.25, 2.85]], planks);
L.floor([[3.7, 1.6], [5.1, 1.6], [5.8, 2.95], [5.9, 2.95], [5.9, 5.9], [3.7, 5.9]], planks);
L.floor([[5.9, 2.95], [7.5, 3.0], [7.5, 5.9], [5.9, 5.9]], planks);
L.floor([[2.75, 5.9], [7.5, 5.9], [7.5, 7.9], [3.9, 7.9], [3.5, 6.9]], planks);
L.room(38, [[2.55, 1.6], [3.7, 1.6], [3.7, 5.9], [2.75, 5.9], [1.25, 4.6], [1.25, 2.85]]);
L.room(39, [[3.7, 1.6], [5.1, 1.6], [5.8, 2.95], [5.9, 2.95], [5.9, 5.9], [3.7, 5.9]]);
L.room(40, [[5.9, 2.95], [7.5, 3.0], [7.5, 5.9], [5.9, 5.9]]);

// ---- Roof of the main body, which stops below this level ---------------------------------------
L.roof([8.0, 3.0, 13.6, 5.0], 'x', 40, 'tile', 'e3');
L.roof([19.8, 4.0, 1.8, 1.5], 'x', 30, 'tile', 'e3'); // privy annex

// ---- Lights ---------------------------------------------------------------------------------
L.light([3.9, 7.3], 1.0, 'hearth');
L.light([2.4, 3.7], 1.6, 'candle');
L.light([4.8, 3.6], 1.6, 'candle');
L.light([6.7, 4.0], 1.6, 'candle');
L.light([4.6, 6.3], 1.8, 'lantern');

// ---- Props ----------------------------------------------------------------------------------
// Klaus (38)
L.prop('bed_single', [2.4, 3.9], 0);
L.prop('desk', [3.1, 2.25], 0);
L.prop('stool', [3.3, 2.75], 0);
L.prop('chest', [3.45, 4.25], 90);
L.prop('rug', [2.6, 5.0], 0, { scale: 0.5 });
// Rikke (39)
L.prop('bed_single', [4.7, 2.8], 0);
L.prop('desk', [4.65, 4.05], 0);
L.prop('chest', [5.45, 3.55], 90);
L.prop('table_small', [4.4, 5.0], 0);
L.prop('stool', [5.0, 4.9], 0);
// Tanorivel (40)
L.prop('bed_single', [6.7, 3.45], 90);
L.prop('desk', [7.0, 4.65], 0);
L.prop('stool', [6.4, 4.6], 0);
L.prop('shelf', [6.4, 5.6], 0);

L.write();
