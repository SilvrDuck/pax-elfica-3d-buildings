#!/usr/bin/env node
// Ground floor, courtyard and surroundings, read off "Auberge de l_Epée 1-RDC.jpg" in grid cells.
// Run: node tools/levels/rdc.mjs → src/data/levels/rdc.json

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Level, PROJECT } from '../lib/author.mjs';

const calibration = JSON.parse(readFileSync(path.join(PROJECT, 'src', 'data', 'calibration.json'), 'utf8'));

const L = new Level('rdc');
const S = 'stone', E = 'enclosure', P = 'partition';

// ---- Tower (rooms 1–3) ------------------------------------------------------------------------
const tNorth = L.wall([2.55, 1.6], [5.1, 1.6], S);
L.wall([5.1, 1.6], [5.8, 2.95], S); // NE diagonal
L.wall([2.55, 1.6], [1.25, 2.85], S); // NW diagonal
const tWest = L.wall([1.25, 2.85], [1.25, 4.6], S);
L.wall([1.25, 4.6], [3.5, 6.9], S); // SW diagonal
L.wall([3.5, 6.9], [3.9, 8.2], S); // down to the cellar wall
L.wall([3.9, 8.2], [2.45, 9.3], S); // cellar NW diagonal
L.wall([4.1, 1.6], [4.1, 5.95], S); // partition between rooms 1 and 2
L.wall([6.1, 2.95], [6.1, 6.0], S); // partition between rooms 2 and 3
const tSouth2 = L.wall([4.1, 6.0], [6.1, 6.0], S);
L.door(tSouth2, [4.55, 6.0], 1.2);
const tSouth3 = L.wall([6.1, 6.0], [8.15, 6.0], S);
L.door(tSouth3, [6.7, 6.0], 1.0);
L.wall([5.0, 7.0], [7.0, 7.0], S); // corridor south side
L.wall([7.0, 7.0], [7.0, 8.2], S);
L.wall([5.0, 7.0], [5.0, 8.2], S);
L.window(tNorth, [3.8, 1.6], 0.8);
L.window(tWest, [1.25, 3.7], 0.8);

// ---- Main body shell ------------------------------------------------------------------------
const north1 = L.wall([5.8, 2.95], [8.15, 3.0], S);
const north2 = L.wall([8.15, 3.0], [20.1, 3.05], S);
L.door(north2, [9.65, 3.0], 1.0);
L.door(north2, [12.85, 3.0], 1.0);
L.door(north2, [19.2, 3.05], 1.0);
L.window(north2, [10.5, 3.0]);
L.window(north2, [15.5, 3.0]);
L.window(north2, [17.5, 3.0]);
L.wall([20.1, 3.05], [20.5, 3.9], S);
L.wall([20.5, 3.9], [22.75, 3.9], S);
L.wall([22.75, 3.9], [22.75, 6.0], S);
L.wall([22.75, 6.0], [21.96, 7.6], S);
L.wall([21.96, 7.6], [21.96, 8.4], S);
const west = L.wall([8.15, 3.0], [8.15, 8.2], S); // main body west wall
L.door(west, [8.15, 6.5], 1.1);
const south4 = L.wall([8.15, 8.2], [10.0, 8.2], S);
L.door(south4, [9.4, 8.2], 1.0);
const south5 = L.wall([10.0, 8.2], [13.6, 8.2], S);
L.door(south5, [12.7, 8.2], 1.0);
const south6 = L.wall([13.6, 8.2], [17.75, 8.2], S);
L.door(south6, [14.5, 8.2], 1.2);
const south7 = L.wall([17.75, 8.2], [19.0, 8.2], S);
L.door(south7, [18.5, 8.2], 1.0);

// ---- Main body partitions -------------------------------------------------------------------
L.wall([11.0, 3.0], [11.0, 5.1], S);
const r4south = L.wall([8.15, 5.0], [11.0, 5.0], S);
L.door(r4south, [9.55, 5.0], 1.0);
L.wall([11.0, 6.05], [11.0, 8.2], S);
L.wall([14.0, 3.0], [14.0, 6.1], S);
L.wall([14.0, 7.0], [14.0, 8.2], S);
L.wall([14.0, 7.0], [14.4, 7.0], S);
L.wall([17.15, 3.0], [17.15, 6.0], S);
L.wall([17.15, 6.0], [17.75, 6.75], S);
L.wall([17.75, 6.75], [17.75, 8.2], S);

// ---- Cellar (room 8) and cistern (9) ---------------------------------------------------------
L.wall([3.9, 8.2], [8.15, 8.2], S);
L.wall([8.15, 8.2], [9.0, 9.6], S); // nook around the silo stair
const cellarEast = L.wall([10.0, 8.2], [10.0, 11.05], S);
L.door(cellarEast, [10.0, 10.3], 1.1);
L.wall([2.45, 9.3], [2.45, 11.05], S);
L.wall([2.45, 11.05], [10.0, 11.05], S);
L.wall([4.0, 11.05], [5.0, 14.9], E); // enclosure, west side of the cistern yard

// ---- Eudes's shop (10), stable (11), latrines (12) -------------------------------------------
const yardWestN = L.wall([4.9, 14.9], [7.0, 14.9], S);
L.window(yardWestN, [5.6, 14.9], 0.7);
const shopDoorWall = L.wall([7.0, 14.9], [8.0, 14.9], S);
L.door(shopDoorWall, [7.5, 14.9], 1.1);
L.wall([5.0, 14.9], [6.0, 17.9], E);
const shopEast = L.wall([8.0, 14.9], [8.0, 17.9], S);
L.door(shopEast, [8.0, 15.4], 1.0);
const stableN1 = L.wall([8.0, 14.9], [10.7, 14.9], S);
const stableN2 = L.wall([10.7, 14.9], [16.1, 14.9], S);
L.door(stableN2, [11.1, 14.9], 1.2);
L.door(stableN2, [14.6, 14.9], 1.6);
L.wall([14.0, 16.0], [14.0, 17.9], S);
for (const c of [9, 10, 11, 12, 13]) L.wall([c, 15.9], [c, 17.3], P, { h: 1.2 });
const latrN = L.wall([16.0, 16.85], [18.0, 16.85], P);
L.door(latrN, [16.5, 16.85], 0.8);
L.door(latrN, [17.5, 16.85], 0.8);
L.wall([16.0, 16.85], [16.0, 17.9], S);
L.wall([17.0, 16.85], [17.0, 17.9], S);
L.wall([18.0, 16.85], [18.0, 17.9], S);
void stableN1;

// ---- Enclosure: south, gate, river side ------------------------------------------------------
L.wall([6.0, 17.9], [19.6, 17.9], E);
L.wall([19.6, 17.9], [20.6, 16.5], E);
const gate = L.wall([20.6, 16.5], [21.56, 14.7], E);
L.arch(gate, [21.08, 15.6], 2.6);
L.wall([21.56, 14.7], [22.66, 11.96], E);
L.wall([22.66, 11.96], [21.96, 8.4], E);

// ---- Store by the river, under the private room ----------------------------------------------
L.wall([19.0, 8.2], [19.0, 11.3], S);
const storeSouth = L.wall([19.0, 12.1], [22.66, 12.1], S);
L.door(storeSouth, [19.45, 12.1], 1.2);

// ---- Floors ---------------------------------------------------------------------------------
const flag = 'flagstone', dirt = 'dirt', planks = 'planks';
L.floor([[2.55, 1.6], [4.1, 1.6], [4.1, 6.0], [2.55, 6.0], [1.25, 4.6], [1.25, 2.85]], flag);
L.floor([[4.1, 1.6], [5.1, 1.6], [5.8, 2.95], [6.1, 2.95], [6.1, 6.0], [4.1, 6.0]], flag);
L.floor([[6.1, 3.0], [8.15, 3.0], [8.15, 6.0], [6.1, 6.0]], flag);
L.floor([[2.55, 6.0], [4.1, 6.0], [8.15, 6.0], [8.15, 8.2], [3.9, 8.2], [3.5, 6.9]], flag); // vestibule and corridor
L.floor([[8.15, 3.0], [22.75, 3.0], [22.75, 6.0], [21.96, 7.6], [21.96, 8.2], [8.15, 8.2]], dirt);
L.floor([[3.9, 8.2], [10.0, 8.2], [10.0, 11.05], [2.45, 11.05], [2.45, 9.3]], dirt);
L.floor([[5.0, 14.9], [8.0, 14.9], [8.0, 17.9], [6.0, 17.9]], planks);
L.floor([[8.0, 14.9], [14.0, 14.9], [14.0, 17.9], [8.0, 17.9]], 'thatch');
L.floor([[16.0, 16.85], [18.0, 16.85], [18.0, 17.9], [16.0, 17.9]], dirt);
L.floor([[4.0, 11.05], [10.0, 11.05], [10.0, 8.2], [19.0, 8.2], [19.0, 12.1], [22.66, 12.1], [21.56, 14.7], [20.6, 16.5], [19.6, 17.9], [14.0, 17.9], [14.0, 14.9], [5.0, 14.9]], dirt); // courtyard
L.floor([[22.9, -0.9], [28.0, -0.9], [28.0, 21.6], [22.9, 21.6]], 'cobbles'); // river bank
L.floor([[-1.0, -0.9], [22.9, -0.9], [22.9, 21.6], [-1.0, 21.6]], dirt); // street and ground

// ---- Rooms ----------------------------------------------------------------------------------
L.room(1, [[2.55, 1.6], [4.1, 1.6], [4.1, 6.0], [2.55, 6.0], [1.25, 4.6], [1.25, 2.85]]);
L.room(2, [[4.1, 1.6], [5.1, 1.6], [5.8, 2.95], [6.1, 2.95], [6.1, 6.0], [4.1, 6.0]]);
L.room(3, [[6.1, 3.0], [8.15, 3.0], [8.15, 6.0], [6.1, 6.0]]);
L.room(4, [[8.15, 3.0], [11.0, 3.0], [11.0, 8.2], [8.15, 8.2]]);
L.room(5, [[11.0, 3.0], [14.0, 3.0], [14.0, 8.2], [11.0, 8.2]]);
L.room(6, [[14.0, 3.0], [17.15, 3.0], [17.15, 6.0], [17.75, 6.75], [17.75, 8.2], [14.0, 8.2]]);
L.room(7, [[17.15, 3.0], [20.1, 3.05], [20.5, 3.9], [22.75, 3.9], [22.75, 6.0], [21.96, 7.6], [21.96, 8.2], [17.75, 8.2], [17.75, 6.75], [17.15, 6.0]]);
L.room(8, [[3.9, 8.2], [10.0, 8.2], [10.0, 11.05], [2.45, 11.05], [2.45, 9.3]]);
L.room(9, [[4.1, 11.05], [7.8, 11.05], [6.0, 14.9], [5.0, 14.9]]);
L.room(10, [[5.0, 14.9], [8.0, 14.9], [8.0, 17.9], [6.0, 17.9]]);
L.room(11, [[8.0, 14.9], [14.0, 14.9], [14.0, 17.9], [8.0, 17.9]]);
L.room(12, [[16.0, 16.85], [18.0, 16.85], [18.0, 17.9], [16.0, 17.9]]);

// ---- Stairs ---------------------------------------------------------------------------------
L.stair('spiral', [7.3, 7.2], [7.75, 7.2], 0.7, 'e1'); // tower
L.stair('spiral', [8.6, 8.9], [9.3, 8.9], 1.1, 'silo1'); // down the silo shaft
L.stair('ramp', [8.65, 5.0], [8.65, 3.2], 1.2, 'e1'); // barrel ramp from the fermentation room up to the common room's west alcove
L.stair('straight', [13.2, 9.9], [13.2, 8.3], 1.4, 'e1'); // courtyard steps up to the common room door
L.stair('straight', [8.5, 12.6], [8.5, 11.15], 1.0, 'e1'); // courtyard up to the kitchen door
L.stair('straight', [9.9, 14.3], [8.6, 14.3], 0.9, 'e1'); // up to the germoir, west door
L.stair('straight', [11.7, 14.3], [13.0, 14.3], 0.9, 'e1'); // up to the germoir, east door

// ---- Lights ---------------------------------------------------------------------------------
L.light([4.3, 7.4], 1.8, 'lantern'); // tower vestibule
L.light([13.55, 3.4], 1.0, 'hearth'); // ovens
L.light([14.45, 3.4], 1.0, 'hearth');
L.light([22.1, 4.6], 1.2, 'hearth'); // forge
L.light([12.2, 7.0], 1.9, 'candle');
L.light([9.5, 6.5], 1.9, 'candle');
L.light([3.0, 3.8], 1.6, 'candle');
L.light([5.0, 4.0], 1.6, 'candle');
L.light([7.2, 4.5], 1.6, 'candle');
L.light([6.0, 9.6], 1.9, 'candle');
L.light([6.8, 16.4], 1.8, 'candle');
L.light([11.0, 16.6], 2.2, 'lantern'); // stable
L.light([18.0, 12.5], 2.4, 'lantern'); // courtyard
L.light([12.0, 12.0], 2.4, 'lantern');

// ---- Props ----------------------------------------------------------------------------------
// Room 1
L.prop('bed_single', [3.45, 2.75], 0);
L.prop('desk', [1.9, 3.3], 90);
L.prop('stool', [2.4, 3.4], 0);
L.prop('chest', [3.0, 5.0], 0);
// Room 2
L.prop('desk', [4.7, 2.85], 90);
L.prop('stool', [5.2, 2.5], 0);
L.prop('bed_single', [5.4, 4.6], 0);
L.prop('table_small', [5.5, 3.45], 0);
// Room 3
L.prop('bed_single', [7.4, 4.0], 0);
L.prop('desk', [7.3, 5.55], 0);
L.prop('stool', [6.5, 3.6], 0);
// Room 4: fermentation
for (const [c, r] of [[9.25, 3.35], [9.7, 3.25], [10.15, 3.45], [10.6, 3.3], [9.35, 3.95], [9.85, 3.85], [10.35, 4.05], [9.25, 4.55], [9.75, 4.5], [10.3, 4.65]]) L.prop('barrel', [c, r], 0);
L.prop('barrel_large', [10.65, 4.2], 0);
L.prop('vat', [8.75, 6.0], 0);
L.prop('vat', [8.75, 7.25], 0);
// Room 5: brewing kettles on brick hearths
for (const [c, r] of [[11.65, 3.45], [11.65, 4.3], [11.65, 6.3], [11.65, 7.2]]) L.prop('vat', [c, r], 0);
L.prop('stove', [13.55, 3.45], 90);
// Room 6: drying and roasting
L.prop('stove', [14.45, 3.45], 90);
L.prop('table_long', [16.5, 4.2], 0);
L.prop('table_long', [16.5, 6.6], 0);
L.prop('table_long', [15.1, 7.15], 90);
L.prop('shelves', [15.0, 3.2], 0);
L.prop('sack', [15.6, 5.5], 20);
L.prop('sack', [16.0, 5.3], 0);
// Room 7: smithy
L.prop('table_long', [17.6, 4.5], 0);
L.prop('table_long', [19.5, 5.6], 0, { scale: 0.85 });
L.prop('anvil', [21.0, 7.0], 30);
L.prop('forge', [22.1, 4.5], 90);
L.prop('barrel', [18.3, 3.6], 0);
L.prop('bucket', [20.0, 7.2], 0);
L.prop('crates_stacked', [19.5, 9.4], 0);
L.prop('crate', [19.5, 10.6], 15);
L.prop('table_long', [21.8, 10.4], 0, { scale: 1.15 });
// Room 8: cellar
for (const [c, r] of [[4.3, 8.6], [5.0, 8.7], [5.6, 8.5]]) L.prop('crate_small', [c, r], 10);
for (const [c, r] of [[6.4, 8.6], [6.9, 8.8], [7.5, 8.5], [6.6, 9.1]]) L.prop('sack', [c, r], 30);
for (const [c, r] of [[3.0, 10.3], [3.6, 10.5], [4.2, 10.3], [3.4, 9.9], [8.0, 10.3], [8.5, 10.5], [8.3, 9.85]]) L.prop('barrel', [c, r], 0);
L.prop('barrel_large', [4.1, 9.55], 0);
for (const [c, r] of [[5.5, 10.4], [6.2, 10.2], [6.8, 10.5], [5.9, 9.7], [6.5, 9.9], [7.2, 10.0]]) L.prop('crate', [c, r], 20);
// Room 9: cistern
L.prop('cistern_lid', [5.95, 12.6], 0);
// Room 10: Eudes
L.prop('chest', [6.3, 15.4], 0);
L.prop('table_small', [6.6, 16.6], 0);
L.prop('stool', [7.2, 16.6], 0);
L.prop('bucket', [7.5, 17.5], 0);
// Room 11: stable
for (const c of [8.5, 9.5, 10.5, 11.5, 12.5, 13.5]) L.prop('hay_bale', [c, 16.6], 0);
L.prop('trough', [11.0, 15.3], 0);
L.prop('cart', [15.4, 16.4], 30);
// Courtyard
L.prop('lantern_post', [18.0, 12.5], 0);
L.prop('lantern_post', [12.0, 12.0], 0);
L.prop('bench', [21.0, 14.9], 60);
L.prop('bench', [20.3, 15.9], 60);

// ---- Neighbouring buildings and street furniture (context only) ------------------------------
const sheds = [
  [4.9, -0.9, 5.4, 1.9], // north-west roof
  [12.0, -0.9, 7.0, 1.9], // north-east roof
  [-1.0, 12.6, 2.4, 6.0], // west roofs
  [9.0, 19.9, 10.0, 1.7], // south roofs
  [25.7, 10.5, 2.3, 9.5], // beyond the river
];
for (const [c, r, cw, rh] of sheds) {
  L.chain([[c, r], [c + cw, r], [c + cw, r + rh], [c, r + rh], [c, r]], E, { h: 3.0 });
  L.roof([c, r, cw, rh], cw >= rh ? 'x' : 'z', 35, 'tile', 'rdc');
}

// The buried silo opens under the cellar's spiral stair; the stack builds its shaft from here.
L.json.silo = calibration.silo;

L.write();
