#!/usr/bin/env node
// Third floor, read off the middle sub-plan of "Auberge de l_Epée 3-étages et toits.jpg" in grid cells.
// Run: node tools/levels/e3.mjs → src/data/levels/e3.json

import { Level } from '../lib/author.mjs';

const L = new Level('e3');
const S = 'stone', T = 'timber', P = 'partition';
const glow = { glow: true };

// ---- Tower (rooms 32–34) -------------------------------------------------------------------------
const tNorth = L.wall([2.55, 1.6], [5.1, 1.6], S);
L.wall([5.1, 1.6], [5.8, 2.95], S);
const tNW = L.wall([2.55, 1.6], [1.25, 2.85], S);
const tWest = L.wall([1.25, 2.85], [1.25, 4.6], S);
const tSW = L.wall([1.25, 4.6], [3.5, 6.9], S);
L.wall([3.5, 6.9], [3.9, 8.0], S);
L.wall([3.6, 1.6], [3.6, 6.1], T);
L.wall([5.85, 2.95], [5.85, 6.0], T);
L.wall([7.45, 3.0], [7.45, 6.0], T);
const s32 = L.wall([2.85, 6.1], [3.6, 6.1], T);
L.door(s32, [3.25, 6.1], 0.9);
const s33 = L.wall([3.6, 6.1], [5.85, 6.1], T);
L.door(s33, [4.5, 6.1], 0.9);
const s34 = L.wall([5.85, 6.0], [7.45, 6.0], T);
L.door(s34, [6.5, 6.0], 0.9);
L.window(tNorth, [3.0, 1.6], 0.8, glow);
L.window(tNW, [1.9, 2.22], 0.8, glow);
L.window(tWest, [1.25, 3.7], 0.8, glow);
L.window(tSW, [2.2, 5.57], 0.8, glow);
L.wall([5.0, 6.9], [5.0, 8.0], S);
L.wall([5.0, 6.9], [8.0, 6.9], S);

// ---- Dormitory 35: the attic of the main body, timber walls under the roof ---------------------
L.wall([5.8, 2.95], [8.0, 3.0], S);
const north = L.wall([8.0, 3.0], [18.5, 3.0], T);
for (const c of [8.6, 10.2, 12.1, 14.9, 16.6]) L.window(north, [c, 3.0], 0.9, glow);
L.wall([18.5, 3.0], [19.8, 4.0], T);
L.wall([19.8, 4.0], [21.6, 4.0], T);
L.wall([21.6, 4.0], [21.6, 5.2], T);
L.wall([21.6, 5.2], [20.9, 6.6], T);
L.wall([20.9, 6.6], [20.5, 7.95], T);
const south = L.wall([3.9, 8.0], [20.5, 7.95], T);
for (const c of [8.9, 10.5, 12.5, 14.5, 16.4, 18.6]) L.window(south, [c, 7.97], 0.9, glow);
const privy = L.wall([19.8, 4.0], [20.6, 5.5], T);
L.door(privy, [20.2, 4.75], 0.8);
L.wall([20.6, 5.5], [21.6, 5.2], T);
const dormWest = L.wall([7.45, 6.0], [7.45, 6.9], P);
void dormWest;
const dormDoor = L.wall([8.0, 6.9], [8.0, 8.0], P);
L.door(dormDoor, [8.0, 7.45], 1.0);

// ---- Floors ---------------------------------------------------------------------------------
const planks = 'planks';
L.floor([[2.55, 1.6], [3.6, 1.6], [3.6, 6.1], [2.85, 6.1], [1.25, 4.6], [1.25, 2.85]], planks);
L.floor([[3.6, 1.6], [5.1, 1.6], [5.8, 2.95], [5.85, 2.95], [5.85, 6.1], [3.6, 6.1]], planks);
L.floor([[5.85, 2.95], [7.45, 3.0], [7.45, 6.0], [5.85, 6.0]], planks);
L.floor([[2.85, 6.1], [7.45, 6.1], [7.45, 6.9], [8.0, 6.9], [8.0, 8.0], [3.9, 8.0], [3.5, 6.9]], planks);
L.floor([[7.45, 3.0], [18.5, 3.0], [19.8, 4.0], [21.6, 4.0], [21.6, 5.2], [20.9, 6.6], [20.5, 7.95], [8.0, 7.95], [8.0, 6.9], [7.45, 6.9]], planks);

// ---- Rooms ----------------------------------------------------------------------------------
L.room(32, [[2.55, 1.6], [3.6, 1.6], [3.6, 6.1], [2.85, 6.1], [1.25, 4.6], [1.25, 2.85]]);
L.room(33, [[3.6, 1.6], [5.1, 1.6], [5.8, 2.95], [5.85, 2.95], [5.85, 6.1], [3.6, 6.1]]);
L.room(34, [[5.85, 2.95], [7.45, 3.0], [7.45, 6.0], [5.85, 6.0]]);
L.room(35, [[7.45, 3.0], [18.5, 3.0], [19.8, 4.0], [20.5, 6.2], [20.5, 7.95], [8.0, 7.95], [8.0, 6.9], [7.45, 6.9]]);

// ---- Stairs ---------------------------------------------------------------------------------
L.stair('spiral', [7.3, 7.2], [7.75, 7.2], 0.7, 'e4');

// ---- Roofs over second-floor-only blocks -------------------------------------------------------
L.roof([2.5, 8.0, 7.0, 3.0], 'x', 35, 'tile', 'e2'); // bath, over the kitchen
L.roof([19.0, 8.2, 3.66, 3.9], 'z', 35, 'tile', 'e1'); // private room 18 (drawn again on this sheet)

// ---- Lights ---------------------------------------------------------------------------------
L.light([13.5, 3.3], 1.0, 'hearth'); // dormitory fireplace
L.light([3.9, 7.4], 1.0, 'hearth'); // vestibule chimney
L.light([9.0, 5.4], 2.0, 'lantern');
L.light([15.0, 5.4], 2.0, 'lantern');
L.light([19.5, 5.5], 2.0, 'candle');
L.light([2.5, 3.8], 1.6, 'candle');
L.light([4.7, 3.3], 1.6, 'candle');
L.light([6.6, 4.2], 1.6, 'candle');

// ---- Props ----------------------------------------------------------------------------------
// Room 32
L.prop('bed_single', [2.9, 2.6], 0);
L.prop('bed_single', [2.4, 4.9], -35);
L.prop('shelf', [1.75, 3.5], 90);
L.prop('chest', [3.3, 5.6], 0);
// Room 33
L.prop('bed_single', [4.35, 2.7], 0);
L.prop('desk', [4.4, 4.35], 0);
L.prop('stool', [4.9, 4.4], 0);
L.prop('chest', [5.4, 5.6], 0);
// Room 34
L.prop('bed_single', [6.6, 3.6], 90);
L.prop('desk', [6.7, 4.65], 0);
L.prop('stool', [6.5, 5.2], 0);
L.prop('chest', [6.6, 5.7], 0);
// Dormitory 35: two rows of straw beds, a fireplace, chests
L.prop('hearth', [13.5, 3.25], 0);
for (const c of [7.95, 9.5, 11.0, 12.4, 14.9, 16.7]) L.prop('bed_single', [c, 3.9], 0);
for (const c of [8.1, 9.8, 11.4, 13.7, 15.5, 17.3]) L.prop('bed_single', [c, 6.9], 0);
L.prop('bed_single', [19.0, 4.9], -40);
L.prop('chest', [18.5, 6.5], 0);
L.prop('chest', [20.1, 7.4], 0);
L.prop('trunk', [12.0, 5.3], 0);
L.prop('stool', [13.3, 5.0], 0);
L.prop('stool', [16.0, 5.3], 0);
L.prop('table_small', [19.3, 6.8], 0);

L.write();
