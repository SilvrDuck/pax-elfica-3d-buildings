#!/usr/bin/env node
// First floor, read off "Auberge de l_Epée 2-1er étage.jpg" in grid cells.
// Run: node tools/levels/e1.mjs → src/data/levels/e1.json

import { Level } from '../lib/author.mjs';

const L = new Level('e1');
const S = 'stone', P = 'partition', T = 'timber';
const glow = { glow: true };

// ---- Tower (rooms 13–15) ----------------------------------------------------------------------
const tNorth = L.wall([2.55, 1.6], [5.1, 1.6], S);
L.wall([5.1, 1.6], [5.8, 2.95], S);
const tNW = L.wall([2.55, 1.6], [1.25, 2.85], S);
const tWest = L.wall([1.25, 2.85], [1.25, 4.6], S);
const tSW = L.wall([1.25, 4.6], [3.5, 6.9], S);
L.wall([3.5, 6.9], [3.9, 8.2], S);
L.wall([4.1, 1.6], [4.1, 5.95], S);
L.wall([6.1, 2.95], [6.1, 5.95], S);
const s13 = L.wall([3.15, 5.95], [4.1, 5.95], S);
L.door(s13, [3.65, 5.95], 0.9);
const s14 = L.wall([4.1, 5.95], [6.1, 5.95], S);
L.door(s14, [4.9, 5.95], 1.0);
const s15 = L.wall([6.1, 5.95], [8.15, 5.95], S);
L.door(s15, [6.7, 5.95], 1.0);
L.wall([5.0, 6.95], [7.0, 6.95], S); // corridor south side
L.wall([7.0, 6.95], [7.0, 8.2], S);
L.wall([5.0, 6.95], [5.0, 8.2], S);
L.window(tNorth, [3.3, 1.6], 0.8);
L.window(tNW, [1.9, 2.22], 0.8);
L.window(tWest, [1.25, 3.7], 0.8);
L.window(tSW, [2.4, 5.77], 0.8);

// ---- Main body shell (common room 16) ----------------------------------------------------------
L.wall([5.8, 2.95], [8.15, 3.0], S);
const north = L.wall([8.15, 3.0], [20.1, 3.05], S);
L.window(north, [9.9, 3.0], 0.9, glow);
L.window(north, [12.2, 3.0], 0.9, glow);
L.window(north, [15.8, 3.0], 0.9, glow);
L.window(north, [17.3, 3.0], 0.9, glow);
L.window(north, [19.6, 3.05], 0.9, glow);
L.wall([20.1, 3.05], [20.5, 3.9], S);
L.wall([20.5, 3.9], [22.75, 3.9], S);
L.wall([22.75, 3.9], [22.75, 6.0], S);
L.wall([22.75, 6.0], [21.96, 7.6], S);
L.wall([21.96, 7.6], [21.96, 8.4], S);
const west = L.wall([8.15, 3.0], [8.15, 8.2], S);
L.window(west, [8.15, 7.0], 0.8, glow);
const south1 = L.wall([8.15, 8.2], [10.0, 8.2], S);
L.door(south1, [9.3, 8.2], 1.0); // kitchen
const south2 = L.wall([10.0, 8.2], [19.0, 8.2], S);
L.window(south2, [10.7, 8.2], 0.9, glow);
L.door(south2, [13.2, 8.2], 1.4); // main door from the courtyard steps
L.window(south2, [15.6, 8.2], 0.9, glow);
L.window(south2, [17.1, 8.2], 0.9, glow);
const south3 = L.wall([19.0, 8.2], [21.96, 8.2], S);
L.door(south3, [21.2, 8.2], 1.0); // private room
// Privy closet in the north-east corner.
const privy = L.wall([20.5, 3.9], [21.7, 5.4], S);
L.door(privy, [21.1, 4.65], 0.9);
L.wall([21.7, 5.4], [22.75, 5.4], S);

// ---- Private room 18 (above the lean-to store) ------------------------------------------------
const r18west = L.wall([19.0, 8.2], [19.0, 12.1], S);
L.window(r18west, [19.0, 9.2], 0.8, glow);
L.wall([19.0, 12.1], [22.66, 12.1], S);
const r18east = L.wall([22.66, 12.1], [21.96, 8.4], S);
L.window(r18east, [22.3, 10.1], 0.8, glow);

// ---- Kitchen 19 (above the cellar) ------------------------------------------------------------
L.wall([3.9, 8.2], [8.15, 8.2], S);
L.wall([3.9, 8.2], [2.45, 9.3], S);
const kWest = L.wall([2.45, 9.3], [2.45, 11.05], S);
L.window(kWest, [2.45, 10.1], 0.8, glow);
const kSouth = L.wall([2.45, 11.05], [10.0, 11.05], S);
L.door(kSouth, [8.5, 11.05], 1.1);
const kEast = L.wall([10.0, 8.2], [10.0, 11.05], S);
L.window(kEast, [10.0, 9.6], 0.8, glow);

// ---- Eudes's lodging 20 and the germoir 21 (above shop and stable) -----------------------------
L.wall([5.0, 14.9], [8.0, 14.9], S);
const wSW = L.wall([5.0, 14.9], [6.0, 17.9], S);
L.window(wSW, [5.4, 16.1], 0.8, glow);
L.wall([6.0, 17.9], [13.5, 17.9], S);
const w20_21 = L.wall([8.0, 14.9], [8.0, 17.9], P);
L.door(w20_21, [8.0, 15.4], 0.9);
const gNorth = L.wall([8.0, 14.9], [13.5, 14.9], S);
L.door(gNorth, [8.6, 14.9], 1.0);
L.door(gNorth, [13.0, 14.9], 1.0);
L.wall([13.5, 14.9], [13.5, 17.9], T);

// ---- Floors ---------------------------------------------------------------------------------
const planks = 'planks';
L.floor([[2.55, 1.6], [4.1, 1.6], [4.1, 5.95], [3.15, 5.95], [1.25, 4.6], [1.25, 2.85]], planks);
L.floor([[4.1, 1.6], [5.1, 1.6], [5.8, 2.95], [6.1, 2.95], [6.1, 5.95], [4.1, 5.95]], planks);
L.floor([[6.1, 2.95], [8.15, 3.0], [8.15, 5.95], [6.1, 5.95]], planks);
L.floor([[3.15, 5.95], [8.15, 5.95], [8.15, 8.2], [3.9, 8.2], [3.5, 6.9]], planks);
L.floor([[8.15, 3.0], [20.1, 3.05], [20.5, 3.9], [22.75, 3.9], [22.75, 6.0], [21.96, 7.6], [21.96, 8.2], [8.15, 8.2]], planks);
L.floor([[19.0, 8.2], [21.96, 8.2], [21.96, 8.4], [22.66, 11.96], [22.66, 12.1], [19.0, 12.1]], planks);
L.floor([[3.9, 8.2], [10.0, 8.2], [10.0, 11.05], [2.45, 11.05], [2.45, 9.3]], planks);
L.floor([[5.0, 14.9], [8.0, 14.9], [8.0, 17.9], [6.0, 17.9]], planks);
L.floor([[8.0, 14.9], [13.5, 14.9], [13.5, 17.9], [8.0, 17.9]], planks);

// ---- Rooms ----------------------------------------------------------------------------------
L.room(13, [[2.55, 1.6], [4.1, 1.6], [4.1, 5.95], [3.15, 5.95], [1.25, 4.6], [1.25, 2.85]]);
L.room(14, [[4.1, 1.6], [5.1, 1.6], [5.8, 2.95], [6.1, 2.95], [6.1, 5.95], [4.1, 5.95]]);
L.room(15, [[6.1, 2.95], [8.15, 3.0], [8.15, 5.95], [6.1, 5.95]]);
L.room(16, [[8.15, 3.0], [20.1, 3.05], [20.5, 3.9], [21.96, 7.6], [21.96, 8.2], [8.15, 8.2]]);
L.room(18, [[19.0, 8.2], [21.96, 8.2], [21.96, 8.4], [22.66, 11.96], [22.66, 12.1], [19.0, 12.1]]);
L.room(19, [[3.9, 8.2], [10.0, 8.2], [10.0, 11.05], [2.45, 11.05], [2.45, 9.3]]);
L.room(20, [[5.0, 14.9], [8.0, 14.9], [8.0, 17.9], [6.0, 17.9]]);
L.room(21, [[8.0, 14.9], [13.5, 14.9], [13.5, 17.9], [8.0, 17.9]]);

// ---- Stairs ---------------------------------------------------------------------------------
L.stair('spiral', [7.3, 7.2], [7.75, 7.2], 0.7, 'e2');
L.stair('straight', [9.0, 8.0], [9.0, 6.3], 1.3, 'e2'); // guest stair along the west wall of the common room

// ---- Roofs over ground-floor-only blocks ------------------------------------------------------
L.roof([13.5, 14.9, 2.6, 3.0], 'x', 35, 'tile', 'rdc'); // east bay of the stable
L.roof([16.0, 16.85, 2.0, 1.05], 'x', 30, 'thatch', 'rdc'); // latrines
L.roof([4.0, 11.05, 3.9, 3.85], 'z', 25, 'tile', 'rdc'); // lean-to over the cistern yard

// ---- Lights ---------------------------------------------------------------------------------
L.light([14.0, 3.3], 1.0, 'hearth'); // common room fireplace
L.light([3.9, 8.5], 1.0, 'hearth'); // kitchen hearth
L.light([4.4, 7.3], 1.4, 'hearth'); // tower vestibule chimney
L.light([11.5, 5.0], 2.4, 'lantern');
L.light([17.5, 5.5], 2.4, 'lantern');
L.light([20.8, 10.2], 2.0, 'candle');
L.light([6.0, 9.6], 2.0, 'lantern');
L.light([2.6, 3.6], 1.6, 'candle');
L.light([5.0, 3.2], 1.6, 'candle');
L.light([7.3, 4.3], 1.6, 'candle');
L.light([6.5, 16.3], 1.8, 'candle');
L.light([10.8, 16.4], 2.2, 'lantern');

// ---- Props ----------------------------------------------------------------------------------
// Room 13
L.prop('bed_single', [2.65, 2.9], -40);
L.prop('chest', [1.9, 3.8], -40);
L.prop('desk', [3.0, 4.9], 30);
L.prop('stool', [3.6, 4.6], 0);
L.prop('chair', [3.7, 3.4], 90);
// Room 14
L.prop('desk', [4.85, 2.55], -30);
L.prop('stool', [5.3, 2.9], 0);
L.prop('bed_single', [5.2, 4.5], 0);
L.prop('chair', [4.4, 3.3], 90);
// Room 15
L.prop('bed_single', [7.0, 3.3], 90);
L.prop('desk', [7.45, 4.75], 20);
L.prop('stool', [7.6, 4.2], 0);
L.prop('chair', [6.5, 4.1], 0);
// Common room 16
for (const [c, r] of [[9.3, 3.5], [9.8, 3.4], [10.3, 3.5], [9.4, 4.0], [9.9, 4.1], [10.4, 4.0], [9.6, 4.6]]) L.prop('barrel', [c, r], 0);
L.prop('counter', [10.6, 4.9], 0, { scale: 1.1 });
L.prop('shelves', [11.5, 3.25], 0);
L.prop('sword_rack', [12.6, 3.2], 0);
L.prop('sword_rack', [16.6, 3.2], 0);
L.prop('hearth', [14.0, 3.25], 0);
L.prop('table_round', [13.4, 4.1], 0);
L.prop('table_round', [15.3, 4.1], 0);
L.prop('table_round', [17.45, 7.05], 0);
L.prop('table_round', [19.3, 3.5], 0);
L.prop('table_round', [21.6, 6.25], 0);
L.prop('table_long', [13.75, 6.2], 90, { scale: 1.4 });
L.prop('bench', [12.6, 5.65], 0, { scale: 1.3 });
L.prop('bench', [14.9, 5.65], 0, { scale: 1.3 });
L.prop('bench', [12.6, 6.8], 0, { scale: 1.3 });
L.prop('bench', [14.9, 6.8], 0, { scale: 1.3 });
L.prop('table_long', [17.4, 4.9], 0);
L.prop('bench', [16.9, 4.9], 90);
L.prop('bench', [17.9, 4.9], 90);
L.prop('table_long', [19.3, 5.4], 0);
L.prop('bench', [18.8, 5.4], 90);
L.prop('bench', [19.8, 5.4], 90);
for (const [c, r] of [[12.9, 3.4], [13.2, 4.8], [14.6, 3.4], [15.9, 4.1], [15.3, 5.0], [16.6, 7.5], [18.2, 3.5], [18.8, 4.2], [19.8, 4.2], [19.3, 6.5], [20.6, 5.5], [21.0, 7.2], [20.9, 6.0], [17.1, 6.3], [18.4, 7.0]]) L.prop('stool', [c, r], 0);
L.prop('candle', [13.4, 4.1], 0);
L.prop('candle', [17.4, 4.9], 0);
L.prop('plate_stack', [10.6, 4.3], 0);
// Private room 18
L.prop('rug', [20.6, 10.4], 90, { scale: 0.9 });
L.prop('table_long', [20.6, 10.4], 90);
L.prop('chair', [19.9, 11.2], 0);
L.prop('chair', [20.6, 11.2], 0);
L.prop('chair', [21.3, 11.2], 0);
L.prop('shelves', [19.5, 8.9], 90);
// Kitchen 19
L.prop('stove', [3.95, 8.55], 0);
L.prop('shelf', [6.3, 8.4], 0);
L.prop('plate_stack', [5.9, 8.45], 0);
L.prop('plate_stack', [6.8, 8.45], 0);
L.prop('table_small', [4.7, 8.85], 25);
L.prop('counter', [4.5, 10.65], 90, { scale: 1.6 });
L.prop('table_long', [8.5, 10.5], 90);
L.prop('cabinet', [2.95, 9.6], 90);
L.prop('bucket', [3.3, 10.5], 0);
L.prop('barrel', [9.5, 8.7], 0);
// Room 20
L.prop('bed_single', [6.6, 17.1], 90);
L.prop('chest', [5.8, 15.5], 20);
L.prop('table_small', [7.3, 15.6], 0);
L.prop('stool', [7.5, 16.2], 0);
// Germoir 21
L.prop('pulley', [11.3, 15.2], 0);
L.prop('sack', [10.2, 15.2], 10);
L.prop('sack', [13.0, 15.2], -10);
L.prop('sack', [9.0, 15.4], 25);
for (const [c, r] of [[10.0, 17.1], [11.0, 17.1], [12.0, 17.1], [13.0, 17.1], [13.0, 16.1]]) L.prop('table_round', [c, r], 0, { scale: 0.85 });

L.write();
