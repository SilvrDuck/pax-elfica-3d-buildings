#!/usr/bin/env node
// Roofs: the tower top, the chimneys and the inn's sign. Everything else roofs itself from the
// level it covers. Run: node tools/levels/toits.mjs → src/data/levels/toits.json

import { Level } from '../lib/author.mjs';

const L = new Level('toits');
const S = 'stone';

// Tower roof: a pyramid over the octagon's bounding square, covering the 4e.
L.roof([1.25, 1.6, 6.25, 6.3], 'point', 45, 'tile', 'e4');

// Chimneys: stone stacks from where they pierce their roof up to about a metre above it. The
// level sits at 13.8 m; `base` is where each stack meets its roof.
L.chimney([14.0, 3.35], -2.2, 1.5, 0.7); // common room, luxury room and dormitory flue, north slope of the body
L.chimney([21.2, 4.4], -2.4, 1.0, 0.6); // east privy flue, over the annex roof
L.chimney([4.4, 7.4], 0.6, 2.2, 0.6); // tower vestibule hearths, through the tower roof
L.chimney([3.9, 8.5], -4.7, -2.3, 0.6); // kitchen and bath hearths, through the bath roof

// The sign: a silver sword on a gold board, hung on the tower's street face.
L.prop('sign_board', [3.8, 1.4], 0);
L.prop('sign_sword', [3.8, 1.37], 0);

L.write();
