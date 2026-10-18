# Auberge de l'Épée en 3D — design

## Intent

A webapp that shows the Auberge de l'Épée (the players' inn in *Pax Elfica*, Brenhaven) as a
3D dollhouse the DM drives on a single screen at the table. The players watch while the DM orbits,
zooms and peels floors away, room by room, to show where they are. The geometry follows the
official plans exactly; the look is stylised low-poly, lit as a tavern at dusk.

The model is a presentation tool, not a game board: no tokens, no fog, no rules.

## Goals

- Every wall, door, stair and piece of furniture sits where the official plans put it, at true
  scale (1 grid cell = 1.5 m).
- All levels: silo -2, silo -1, ground floor with courtyard, 1st floor, 2nd floor, 3rd floor,
  4th floor (tower top) and the roofs.
- Floors peel off one at a time, top-down, like a dollhouse, so any level can be shown with the
  levels above removed.
- Furnished: beds, tables, benches, barrels, vats, hearths, the well/cistern, the forge, the hay,
  the carts. Low-poly CC0 pieces, consistent palette.
- Evening mood: cool blue-grey exterior light, warm light from hearths, lanterns and windows.
  Peeled interiors stay readable thanks to their own warm fill.
- Surroundings as low-detail context: the enclosure wall (4 m, stone), the neighbouring roofs,
  the cobbled street and the river edge visible on the plans.
- French room names as floating labels, toggleable, off by default.
- Runs locally from a static build on the DM's laptop, smoothly (60 fps target on integrated
  graphics), nothing to install beyond Node.

## Non-goals

- Fog of war or per-room reveal. The whole inn is always visible.
- First-person walk-through. The camera orbits from outside.
- Mobile support or hosting. One screen, driven by the DM.
- Matching the fan Foundry scenes' furniture. They are a trace source, not the reference.
- Official branding. Nothing from `Officiel/PackVisuels` with the XII Singes logo ships in the app
  (see `Officiel/PackVisuels/Droits d'utilisation.txt`). The inn's own sign (a silver sword
  pointing down on a gold field, per the rulebook) is modelled, not copied from the pack.

## Anti-goals (what would make it a failure even if it runs)

- A model that "looks about right" but has a room a cell off, a missing door or a stair in the
  wrong place. The players know this inn from the 2D maps; drift is immediately visible.
- A photoreal or mixed-style scene: one realistic barrel among low-poly tables breaks it.
- Heavy loading or stutter when peeling floors in front of players.

## Sources and fidelity rules

Reference, in order of authority:

1. **Official plans** — `Officiel/Plans_batiments/Auberge de l_Epée 1-RDC.jpg`,
   `… 2-1er étage.jpg`, `… 3-étages et toits.jpg` (the last one stacks 2nd, 3rd and 4th floor
   plus the silo cross-sections and roofs). 5176×4000 px, 1.5 m grid drawn on the art.
   When any other source disagrees with these, the plans win.
2. **Rulebook legend** — `Officiel/paxfl01_paxelfica_livredebase_v12.pdf` pp. 40–42 ("Les plans
   de l'auberge"), room numbers 1–40 and the prose that names them. This is the source for
   labels and for anything the drawing leaves implicit (the enclosure is 4 m high; the main body
   is stone for ground and 1st floor, timber and cob above; roofs are clay tile; the silo is 10 m
   deep and 6 m wide, split into two levels by a timber floor; the tower carries the sign).
3. **Fan Foundry scenes** — `Fanmade/3d-models/AubergeEpee/ADE/fvtt-Scene-*.json`. Each level
   carries wall segments with door flags and light sources in the pixel space of the matching
   `Auberge de l'épée N.png` render (10240×5760 px; 180 px = 1.5 m for the inn levels, 600 px =
   1.5 m for the silo levels). Use them as the starting trace for walls, doors and light
   positions, then register and correct against the official plans. The silo levels are absent
   from the official drawings beyond the cross-section, so for them the fan scenes and the
   rulebook prose are the reference.
4. **Fan dungeondraft maps** — `Fanmade/Cartes PAX Elfica/Cartes/Auberge de l_Epée/` (with the
   numbered variants in `Avec numéros/`). Secondary cross-check only.

Room legend (from the rulebook), used for labels and for checking that every numbered room exists
in the model:

| Level | Numbers | Rooms |
|---|---|---|
| RdC | 1–3 | Chambres de Sigmund, Ulrich, Bvorn (tour) |
| RdC | 4, 5, 6 | Brasserie : fermentation, cuves de brassage, séchage et grillage de l'orge / labo de Sigmund |
| RdC | 7 | Atelier du maréchal-ferrant (Morrigan) |
| RdC | 8 | Cellier |
| RdC | 9 | Citerne |
| RdC | 10 | Boutique d'Eudes (crineur-coiffeur) |
| RdC | 11 | Écurie |
| RdC | 12 | Latrines |
| 1er | 13, 14, 15 | Chambres de Morrigan, Rosa, Johanna (tour) |
| 1er | 16 | Salle commune |
| 1er | 17 | Mur des épées |
| 1er | 18 | Salle privée / bureau de Rosa / école |
| 1er | 19 | Cuisine |
| 1er | 20 | Logement d'Eudes |
| 1er | 21 | Germoir (étage de l'écurie, palan) |
| 2e | 22, 23, 24 | Chambres de Gisila et Guilherm, des enfants (tour) |
| 2e | 25–29 | Chambres des clients (27 = chambre de luxe, cheminée) |
| 2e | 30 | Balcon-galerie sur la cour |
| 2e | 31 | Salle de bain |
| 3e | 32, 33, 34 | Chambres de Lilibeth et Marinette, Camille, Albert (tour) |
| 3e | 35 | Dortoir (combles) |
| Silo | 36 | Silo niveau supérieur (cellier) |
| Silo | 37 | Silo niveau inférieur (bric-à-brac) |
| 4e | 38, 39, 40 | Appartements de Klaus, Rikke, Tanorivel (tour) |

Fidelity rules the builder applies:

- The plans are flat top-down orthographic drawings with the 1.5 m grid printed on them; the
  calque is therefore an exact overlay, and any residual drift is a modelling error, not an art
  one.
- Walls, doors, windows, stairs and room outlines are traced to the plan grid, not approximated.
  Tolerance: a wall's centreline sits within 0.25 m (one sixth of a cell) of the centreline of
  the painted wall; openings within 0.25 m along the wall; props within 0.5 m of their drawn
  centre and in the drawn orientation. Wall thickness is not read off the painting but fixed by
  material: enclosure 0.6 m, stone 0.5 m, timber-and-cob 0.3 m, interior partitions 0.2 m.
- Furniture is placed piece for piece where the plan draws it, with the plan's orientation. When
  the asset packs lack an exact piece, the closest low-poly stand-in of the same footprint is
  used (a brewing vat may be a large barrel, a forge a hearth with an anvil). Decorative clutter
  on the plan (scattered bottles, papers) may be omitted.
- Heights come from the rulebook and from ordinary medieval proportions: enclosure 4 m,
  ground and 1st floor 3 m each, upper floors 2.6 m, silo 10 m total split 5/5, roofs pitched
  with the ridge direction the plans and the fan renders show.
- Stairs connect: every stair drawn on one level has its landing on the next.

Vertical structure (my call, so that peeling has one meaning everywhere):

- All blocks share the same floor elevations: RdC 0 m, 1er +3.0, 2e +6.0, 3e +8.6, 4e +11.2,
  silo -1 at −5.0, silo -2 at −10.0. A "level" in the app is every block's storey at that
  elevation: the 1st floor level holds the tavern, the tower's 1st-floor rooms, Eudes's lodging
  and the stable's germoir together.
- Block heights: main body RdC–3e (the 3e dormitory is the attic under the main roof); tower
  RdC–4e with its own roof above the 4e; stable and Eudes's shop RdC–1er; kitchen annex and
  latrines RdC only. Where the plans show a roof over a block on a given sheet, that block stops
  below that sheet.
- Each roof is tagged with the storey it covers and is shown only while the selected level is
  above that storey. `Toits` shows everything. Selecting `1er` therefore shows the stable's
  germoir open to the sky and the main body cut at the 1st-floor ceiling.
- The silo is buried under the cellier (room 8), centred on the spiral stair drawn there, 6 m
  across, invisible from outside. Selecting `RdC` shows the cellier floor with the stair hole;
  selecting `Silo -1` or `Silo -2` removes the ground slab and every storey above, leaving the
  open cylinder and its surroundings cut away to the silo's rim. Its position in the fan silo
  scenes (600 px per 1.5 m, centred on the stair) is registered onto the RdC stair, not taken
  from the scene's own origin.
- Surroundings extend exactly as far as the RdC plan's canvas: neighbouring roofs, street,
  cobbles and river are modelled as drawn, cut at the plan edge, over a flat ground that runs to
  the horizon. Nothing beyond the plan edge is invented.

## What the DM sees

A full-window 3D view, dark UI chrome in French, nothing else on screen by default.

- **Orbit**: drag to rotate, wheel to zoom, right-drag to pan (Three.js OrbitControls). A "Vue
  d'ensemble" button resets the camera.
- **Peeling**: a vertical level selector on the right edge listing, top to bottom, `Toits`, `4e`,
  `3e`, `2e`, `1er`, `RdC`, `Silo -1`, `Silo -2`. Selecting a level hides everything above it.
  Keyboard: `↑`/`↓` move one level. Hidden levels fade out over ~300 ms rather than popping.
- **Labels**: toggle `Noms des pièces` (key `N`). Labels are the French names from the legend,
  rendered as screen-space text pinned to each room's centre on the currently selected level
  only, so they never clutter other floors.
- **Calque**: toggle `Calque du plan` (key `C`) projects the matching official plan image at ~50 %
  opacity onto the selected level's floor. This is the DM's alignment check and the build's
  acceptance test; it is off by default and not meant for players, which is why it lives behind
  a key rather than a prominent button.
- **Lighting**: fixed evening mood. No day toggle.

## How it is made

My calls, as builder:

- **Stack**: Vite + Three.js, plain JavaScript modules, no framework. `npm run dev` for work,
  `npm run build` for the static bundle in `dist/`, opened locally. Node 26 is already on the
  machine; nothing else to install.
- **Location**: `Creations/auberge-epee-3d/`, with a `README.md` in the style of the other
  `Creations/` projects (what it is, how to run, where the data comes from).
- **Data, not code, describes the inn.** `src/data/levels/<level>.json` holds, per level, in
  metres with a shared origin and Y up:
  - `walls`: segments `{a, b, h, thickness, material}` (stone, timber, cob, enclosure);
  - `openings`: `{wall, at, width, kind: door|window|arch|trapdoor}`;
  - `stairs`: `{kind: straight|spiral|ramp, from, to, dir}` linking levels;
  - `floors`: polygons with `material` (dirt, planks, flagstone, cobbles, water);
  - `rooms`: `{number, name, polygon}` for labels and the legend check;
  - `props`: `{asset, x, z, rot, scale?}`;
  - `lights`: `{x, y, z, kind: hearth|lantern|candle|window}`;
  - `roofs`: `{polygon, ridge, pitch, material}`.
  A conversion script (`tools/`) turns the fan Foundry wall data into a first draft of these
  files after registering the fan render to the official plan; the builder then edits the JSON
  by hand against the plans. The calque toggle is the feedback loop for that editing.
- **Assets**: CC0 low-poly packs only. Candidates checked at design time: KayKit Furniture Bits
  and KayKit Dungeon Remastered (CC0, glTF, on GitHub under `KayKit-Game-Assets`), Quaternius
  Medieval Village MegaKit (CC0, glTF, free tier on itch.io), Kenney kits (CC0, direct zips on
  kenney.nl). Keep the
  downloaded packs out of the repo; a `tools/fetch-assets.sh` downloads them, and only the glTF
  pieces actually used are copied into `public/assets/` with a `LICENSES.md` listing each pack
  and its licence. Textures for walls, roofs and floors are flat colours or small CC0 tiles in
  the same palette. If a needed piece exists in no CC0 pack, model it as primitives in code.
- **Scene construction**: walls are extruded boxes with openings cut by splitting the segment
  (no CSG); doors are separate meshes slightly ajar; floors are extruded polygons; roofs are
  procedural gables from the roof polygons; the silo is a cylinder with a timber mid-floor and a
  central spiral stair. Props are instanced glTF meshes.
- **Lighting**: a dim cool hemisphere light plus a low directional "moon" for shape, warm point
  lights at hearths and lanterns (positions from the Foundry light data, corrected to the plans),
  emissive amber window panes on the main building. Shadows from the point lights only where
  cheap; the budget is 60 fps on an integrated GPU.
- **Verification**: a Playwright script in `tools/` loads the dev server, selects each level with
  the calque on, and saves a top-down screenshot per level to `verification/`. The builder looks
  at every one before calling a level done. A unit test checks every legend number appears in
  exactly one level's `rooms`.

## Left to the builder

- Which packs, and which piece stands in for which plan symbol.
- Exact UI layout and typography, as long as it is dark, French and unobtrusive.
- How the fan render is registered to the official plan (scale and offset per level).
- Whether the neighbouring buildings are boxes with roofs or roofs alone.
