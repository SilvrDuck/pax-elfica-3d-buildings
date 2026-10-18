#!/usr/bin/env node
// Second floor, read off the top sub-plan of "Auberge de l_Epée 3-étages et toits.jpg" in grid cells.
// Run: node tools/levels/e2.mjs → src/data/levels/e2.json

import { Level } from '../lib/author.mjs';

const L = new Level('e2');
const S = 'stone', T = 'timber', P = 'partition';
const glow = { glow: true };

// ---- Tower (rooms 22–24): stone shell, timber partitions ----------------------------------------
const tNorth = L.wall([2.55, 1.6], [5.1, 1.6], S);
L.wall([5.1, 1.6], [5.8, 2.95], S);
const tNW = L.wall([2.55, 1.6], [1.25, 2.85], S);
const tWest = L.wall([1.25, 2.85], [1.25, 4.6], S);
const tSW = L.wall([1.25, 4.6], [3.5, 6.9], S);
L.wall([3.5, 6.9], [3.9, 8.0], S);
L.wall([3.7, 1.6], [3.7, 6.2], T);
L.wall([5.9, 2.95], [5.9, 6.2], T);
const s22 = L.wall([2.9, 6.2], [3.7, 6.2], T);
L.door(s22, [3.3, 6.2], 0.9);
const s23 = L.wall([3.7, 6.2], [5.9, 6.2], T);
L.door(s23, [4.5, 6.2], 0.9);
const s24 = L.wall([5.9, 6.2], [8.0, 6.2], T);
L.door(s24, [6.6, 6.2], 0.9);
L.window(tNorth, [3.1, 1.6], 0.8, glow);
L.window(tNW, [1.9, 2.22], 0.8, glow);
L.window(tWest, [1.25, 3.7], 0.8, glow);
L.window(tSW, [2.2, 5.57], 0.8, glow);
// Stair enclosure south of the corridor.
L.wall([5.0, 6.9], [5.0, 8.0], S);
L.wall([5.0, 6.9], [8.0, 6.9], S);

// ---- Main body: timber and cob over the stone base --------------------------------------------
L.wall([5.8, 2.95], [8.0, 3.0], S);
const north = L.wall([8.0, 3.0], [18.5, 3.0], T);
for (const c of [9.1, 11.0, 12.6, 14.0, 15.9, 17.6]) L.window(north, [c, 3.0], 0.9, glow);
L.wall([18.5, 3.0], [19.8, 4.0], T);
L.wall([19.8, 4.0], [21.6, 4.0], T);
L.wall([21.6, 4.0], [21.6, 5.2], T);
const eastDoors = L.wall([21.6, 5.2], [20.9, 6.6], T);
L.door(eastDoors, [21.25, 5.9], 1.0);
const eastLow = L.wall([20.9, 6.6], [20.5, 7.95], T);
L.door(eastLow, [20.7, 7.3], 1.0);
const south = L.wall([3.9, 8.0], [20.5, 7.95], T);
L.door(south, [4.5, 8.0], 1.0); // vestibule to the bath
L.door(south, [13.0, 7.97], 1.2); // onto the balcony
for (const c of [10.2, 11.4, 15.3, 16.9, 18.6]) L.window(south, [c, 7.97], 0.9, glow);
// Privy in the north-east corner.
const privy = L.wall([19.8, 4.0], [20.6, 5.5], T);
L.door(privy, [20.2, 4.75], 0.8);
L.wall([20.6, 5.5], [21.6, 5.2], T);

// ---- Guest rooms 25–29 along the north side ----------------------------------------------------
L.wall([8.0, 3.0], [8.0, 6.2], T);
for (const c of [10.0, 11.7, 14.8, 16.4]) L.wall([c, 3.0], [c, 6.2], P);
L.wall([18.0, 4.0], [19.3, 6.1], P);
const guestSouth = L.wall([8.0, 6.2], [18.0, 6.2], P);
for (const c of [9.0, 10.85, 12.8, 15.6, 17.1]) L.door(guestSouth, [c, 6.2], 0.9);
L.wall([18.0, 6.2], [18.0, 4.0], P);

// ---- Bath 31, over the kitchen -----------------------------------------------------------------
L.wall([3.9, 8.0], [2.5, 9.0], S);
const bWest = L.wall([2.5, 9.0], [2.5, 11.0], S);
L.window(bWest, [2.5, 10.0], 0.8, glow);
const bSouth = L.wall([2.5, 11.0], [9.3, 11.0], S);
L.window(bSouth, [4.3, 11.0], 0.8, glow);
L.window(bSouth, [7.2, 11.0], 0.8, glow);
L.wall([9.3, 11.0], [9.3, 8.0], S);

// ---- Balcony-gallery 30 over the courtyard -----------------------------------------------------
L.chain([[11.8, 8.0], [11.8, 9.3], [14.7, 9.3], [14.7, 8.0]], P, { h: 1.0 });

// ---- Floors ---------------------------------------------------------------------------------
const planks = 'planks';
L.floor([[2.55, 1.6], [3.7, 1.6], [3.7, 6.2], [2.9, 6.2], [1.25, 4.6], [1.25, 2.85]], planks);
L.floor([[3.7, 1.6], [5.1, 1.6], [5.8, 2.95], [5.9, 2.95], [5.9, 6.2], [3.7, 6.2]], planks);
L.floor([[5.9, 2.95], [8.0, 3.0], [8.0, 6.2], [5.9, 6.2]], planks);
L.floor([[2.9, 6.2], [20.5, 6.2], [20.9, 6.6], [20.5, 7.95], [3.9, 8.0], [3.5, 6.9]], planks); // corridor and landings
L.floor([[8.0, 3.0], [18.5, 3.0], [19.8, 4.0], [21.6, 4.0], [21.6, 5.2], [20.5, 6.2], [8.0, 6.2]], planks);
L.floor([[3.9, 8.0], [9.3, 8.0], [9.3, 11.0], [2.5, 11.0], [2.5, 9.0]], planks);
L.floor([[11.8, 8.0], [14.7, 8.0], [14.7, 9.3], [11.8, 9.3]], planks);

// ---- Rooms ----------------------------------------------------------------------------------
L.room(22, [[2.55, 1.6], [3.7, 1.6], [3.7, 6.2], [2.9, 6.2], [1.25, 4.6], [1.25, 2.85]]);
L.room(23, [[3.7, 1.6], [5.1, 1.6], [5.8, 2.95], [5.9, 2.95], [5.9, 6.2], [3.7, 6.2]]);
L.room(24, [[5.9, 2.95], [8.0, 3.0], [8.0, 6.2], [5.9, 6.2]]);
L.room(25, [[8.0, 3.0], [10.0, 3.0], [10.0, 6.2], [8.0, 6.2]]);
L.room(26, [[10.0, 3.0], [11.7, 3.0], [11.7, 6.2], [10.0, 6.2]]);
L.room(27, [[11.7, 3.0], [14.8, 3.0], [14.8, 6.2], [11.7, 6.2]]);
L.room(28, [[14.8, 3.0], [16.4, 3.0], [16.4, 6.2], [14.8, 6.2]]);
L.room(29, [[16.4, 3.0], [18.5, 3.0], [19.3, 3.6], [18.0, 4.0], [18.0, 6.2], [16.4, 6.2]]);
L.room(30, [[11.8, 8.0], [14.7, 8.0], [14.7, 9.3], [11.8, 9.3]]);
L.room(31, [[3.9, 8.0], [9.3, 8.0], [9.3, 11.0], [2.5, 11.0], [2.5, 9.0]]);

// ---- Stairs ---------------------------------------------------------------------------------
L.stair('spiral', [7.3, 7.2], [7.75, 7.2], 0.7, 'e3');

// ---- Roofs over first-floor-only blocks ---------------------------------------------------------
L.roof([19.0, 8.2, 3.66, 3.9], 'z', 35, 'tile', 'e1'); // private room 18
L.roof([21.6, 3.9, 1.15, 3.7], 'z', 30, 'tile', 'e1'); // east annex beyond the timber shell
L.roof([5.0, 14.9, 8.5, 3.0], 'x', 35, 'tile', 'e1'); // Eudes's lodging and the germoir
L.roof([9.3, 8.2, 0.7, 2.85], 'z', 30, 'tile', 'e1'); // kitchen strip east of the bath

// ---- Lights ---------------------------------------------------------------------------------
L.light([13.0, 3.3], 1.0, 'hearth'); // luxury room fireplace
L.light([3.9, 7.4], 1.0, 'hearth'); // vestibule chimney
L.light([3.9, 8.4], 1.0, 'hearth'); // bath hearth
L.light([9.5, 7.0], 2.2, 'lantern');
L.light([16.0, 7.0], 2.2, 'lantern');
L.light([19.8, 6.3], 2.2, 'lantern');
L.light([2.6, 3.8], 1.6, 'candle');
L.light([4.8, 3.5], 1.6, 'candle');
L.light([7.0, 4.2], 1.6, 'candle');
L.light([9.0, 4.5], 1.6, 'candle');
L.light([10.8, 4.5], 1.6, 'candle');
L.light([15.6, 4.5], 1.6, 'candle');
L.light([17.4, 4.5], 1.6, 'candle');
L.light([6.0, 9.5], 1.8, 'candle');

// ---- Props ----------------------------------------------------------------------------------
// Room 22
L.prop('bed_double', [2.5, 3.95], 90);
L.prop('shelf', [3.0, 1.85], 0);
L.prop('chest', [2.75, 5.5], -30);
// Room 23
L.prop('bed_single', [4.55, 2.6], -45);
L.prop('bed_single', [5.0, 4.9], 0);
L.prop('stool', [4.2, 4.3], 0);
// Room 24
L.prop('bed_single', [6.6, 3.4], 90);
L.prop('bed_single', [6.9, 4.95], 0);
L.prop('table_small', [7.5, 5.7], 0);
L.prop('stool', [7.5, 4.2], 0);
// Room 25
L.prop('bed_double', [8.85, 3.95], 90);
L.prop('table_small', [9.6, 3.4], 0);
L.prop('stool', [9.6, 3.95], 0);
L.prop('chest', [8.4, 5.6], 0);
// Room 26
L.prop('desk', [10.6, 3.45], 0);
L.prop('stool', [10.9, 3.95], 0);
L.prop('bed_single', [11.3, 5.5], 0);
// Room 27, the luxury room
L.prop('rug', [13.5, 4.95], 90, { scale: 1.4 });
L.prop('bed_double', [13.7, 4.95], 90);
L.prop('hearth', [13.0, 3.3], 0);
L.prop('desk', [12.2, 3.45], 0);
L.prop('stool', [12.3, 3.95], 0);
L.prop('table_small', [14.3, 3.45], 0);
L.prop('chest', [12.2, 5.9], 0);
// Room 28
L.prop('bed_double', [15.55, 4.25], 0, { scale: 1.15 });
L.prop('table_small', [15.4, 5.8], 0);
// Room 29
L.prop('bed_single', [17.0, 4.05], 0);
L.prop('desk', [17.9, 3.45], 0);
L.prop('stool', [17.9, 3.95], 0);
L.prop('chair', [16.8, 5.6], 0);
// Corridor
L.prop('table_long', [12.6, 6.6], 90, { scale: 0.8 });
L.prop('desk', [15.1, 6.55], 0);
L.prop('shelves', [19.0, 6.9], 0);
// Bath 31
L.prop('hearth', [3.9, 8.3], 180);
L.prop('vat', [6.0, 8.95], 0, { scale: 0.8 });
L.prop('vat', [3.35, 10.3], 0, { scale: 0.8 });
L.prop('vat', [8.4, 10.3], 0, { scale: 0.8 });
L.prop('table_long', [5.6, 10.45], 90, { scale: 0.8 });
L.prop('bucket', [4.8, 9.5], 0);
L.prop('bucket', [7.3, 9.9], 0);
// Balcony 30
L.prop('bench', [13.25, 9.0], 0, { scale: 1.3 });

L.write();
