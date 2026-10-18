# Auberge de l'Épée 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local Vite + Three.js webapp that shows the Auberge de l'Épée as a peelable, furnished, low-poly dollhouse traced exactly from the official plans.

**Architecture:** Per-level JSON files (metres, shared origin) describe walls, openings, floors, stairs, rooms, props, lights and roofs; pure builder modules turn them into Three.js meshes; a `LevelStack` owns one group per level and implements peeling. Tooling scripts calibrate the official plan images to world units, draft the level JSON from the fan Foundry wall data, copy the glTF props actually used, and screenshot every level with the plan calque for acceptance.

**Tech Stack:** Node 26, Vite, Three.js (OrbitControls, GLTFLoader, CSS2DRenderer), Vitest, sharp (tooling only), playwright-core driving the system `/usr/bin/chromium` (tooling only). No framework, no CSS library.

**Spec:** `Creations/auberge-epee-3d/docs/superpowers/specs/2026-10-18-auberge-epee-3d-design.md`

This directory is not a git repository and the user has not asked for one, so tasks end at their verification step; there are no commit steps.

## Global Constraints

- World units are metres, Y up, X east, Z south. Origin = top-left pixel of the official RdC sheet. 1 grid cell = 1.5 m.
- Floor elevations: silo -2 −10.0, silo -1 −5.0, RdC 0, 1er 3.0, 2e 6.0, 3e 8.6, 4e 11.2. Storey heights: 3.0, 3.0, 2.6, 2.6, 2.6; silo levels 5.0.
- Wall thickness by material: `enclosure` 0.6, `stone` 0.5, `timber` 0.3, `partition` 0.2.
- Tolerance: wall centrelines and openings within 0.25 m of the plan, props within 0.5 m.
- Level ids and labels, bottom to top: `silo2` "Silo -2", `silo1` "Silo -1", `rdc` "RdC", `e1` "1er", `e2` "2e", `e3` "3e", `e4` "4e", `toits` "Toits".
- UI copy is French: `Vue d'ensemble`, `Noms des pièces`, `Calque du plan`. Keys: `↑`/`↓` level, `N` labels, `C` calque, `F` stats.
- Lighting is fixed evening: no day toggle.
- Assets CC0 only, downloaded packs stay in `vendor/` (ignored by nothing, but never copied wholesale); only used glTF files go to `public/assets/` with `public/assets/LICENSES.md`.
- Nothing from `Officiel/PackVisuels` ships. Plan crops in `public/plans/` are the DM's calque only.
- Official plans win over fan data on any disagreement.

## Review Focus

1. WebGL unavailable or context lost: the page shows a French message instead of a blank canvas. Test in Task 1.
2. A level JSON opening that extends past its wall's end: geometry clamps to the wall and warns, no NaN vertices. Test in Task 5.
3. A prop whose glTF fails to load: a placeholder box of the declared footprint appears, the rest of the level still builds. Test in Task 9.
4. `↑` on `toits` or `↓` on `silo2`: selection stays, no exception. Test in Task 7.
5. Window resize or fullscreen on a TV: canvas, camera aspect and CSS2D labels all follow. Test in Task 8.

---

### Task 1: Scaffold and empty scene

**Files:**
- Create: `Creations/auberge-epee-3d/package.json`, `index.html`, `vite.config.js`, `src/main.js`, `src/scene.js`, `src/style.css`, `.gitignore`
- Test: `tests/scene.test.js`

**Interfaces:**
- Produces: `createScene(container: HTMLElement) → { scene, camera, renderer, controls, resize() }` in `src/scene.js`; camera is a PerspectiveCamera(45) positioned at (60, 45, 70) looking at (22, 0, 17); `webglSupported() → boolean` in `src/scene.js`.

- [ ] **Step 1: Write `package.json`** with scripts `dev`, `build`, `preview`, `test` (vitest run), `test:legend` (vitest run tests/legend.test.js), `shots` (node tools/shots.mjs); dependencies `three`; devDependencies `vite`, `vitest`, `jsdom`, `sharp`, `playwright-core`. Run `npm install`.
- [ ] **Step 2: Write the failing test** `tests/scene.test.js`: `webglSupported()` returns `false` under jsdom (no WebGL context), and `main.js`'s `mount(container)` puts the text `WebGL n'est pas disponible` into the container when it is false.
- [ ] **Step 3: Run `npx vitest run tests/scene.test.js`**, expected FAIL (module not found).
- [ ] **Step 4: Implement `src/scene.js` and `src/main.js`.** `main.js` exports `mount(container)` and self-mounts on `#app` when `document` exists. The scene gets a 200×200 m ground plane (dirt colour `#8a6b45`), a HemisphereLight placeholder, OrbitControls with damping, and a resize handler on `window`. `index.html` loads `src/main.js` as a module and has `<div id="app">` filling the viewport; `style.css` sets dark background `#0e1116` and system sans-serif.
- [ ] **Step 5: Run the test**, expected PASS. Run `npm run dev` and open the page with the Playwright MCP tools (`browser_navigate` on the printed URL, `browser_take_screenshot`): a lit brown plane you can orbit.

### Task 2: Calibrate the official plans and cut the calque crops

**Files:**
- Create: `tools/calibrate.mjs`, `tools/correspondences.json`, `src/data/calibration.json`, `public/plans/*.jpg`
- Test: `tests/calibration.test.js`

**Interfaces:**
- Produces: `src/data/calibration.json`:
  ```json
  { "pxPerCell": 179, "cellM": 1.5,
    "sheets": { "<levelId>": { "file": "...jpg", "crop": [x, y, w, h], "worldRect": [x0, z0, w, h], "image": "plans/<levelId>.jpg" } },
    "fan": { "<levelId>": { "scale": 0.9944, "offsetPx": [dx, dy] } } }
  ```
  `worldRect` is metres (x east, z south). `fan[level]` maps a fan-render pixel `p` to RdC-sheet pixel `p * scale + offsetPx`.
- Produces: `tools/correspondences.json`: for each level, 4+ pairs `{ fan: [x, y], plan: [x, y] }` of matching wall corners, measured by hand on zoomed crops (tower octagon vertices, main-body NE corner, latrine SW corner).

- [ ] **Step 1: Measure the grid.** In `tools/calibrate.mjs`, high-pass (31 px moving average removed) and autocorrelate a 300 px band of the RdC sheet in both axes over lags 120–220; take the best lag. Assert it is within 177–181 and write it as `pxPerCell` (the design-time measurement is 179).
- [ ] **Step 2: Locate the sub-plans on sheet 3.** Sheet `3-étages et toits.jpg` (4000×5176) stacks 2e, 3e, 4e plus the two silo circles. Find each sub-plan's offset by template-matching the tower octagon (cropped from the RdC sheet, downscaled 4×) with sharp raw pixels and a normalised cross-correlation over a coarse grid, then refine ±8 px at full resolution. Write `crop` for `e2`, `e3`, `e4`, `silo1`, `silo2` (silos: the two circles, bounding square each) and for `rdc`, `e1` (whole sheet). Derive `worldRect` = `crop / pxPerCell * cellM` for the inn sheets; for silo crops the `worldRect` is centred on the RdC cellier stair (filled in Task 15 once the stair is traced; write `null` now).
- [ ] **Step 3: Solve the fan → plan transform.** For each level in `tools/correspondences.json`, least-squares similarity (scale + translation, no rotation) from fan px to plan px. Write `fan[level]`. Fail if any residual exceeds 0.15 m (18 px).
- [ ] **Step 4: Cut the crops** to `public/plans/<levelId>.jpg`, long side 2048 px, JPEG quality 80, via sharp.
- [ ] **Step 5: Write the failing test** `tests/calibration.test.js`: calibration.json exists, `pxPerCell` in 177–181, every level id from the Global Constraints except `toits` has a sheet, `worldRect` widths are between 20 and 50 m for inn levels.
- [ ] **Step 6: Fill `tools/correspondences.json` by hand.** Crop 600 px squares around each chosen corner in both the fan render and the plan with `magick`, view them, record pixel coordinates. At least the `rdc`, `e1`, `e2`, `e3`, `e4` levels; silos are registered in Task 15.
- [ ] **Step 7: Run `node tools/calibrate.mjs` then the test**, expected PASS. Look at `public/plans/e2.jpg` and `e4.jpg` to confirm the crops frame one sub-plan each.

### Task 3: Draft level JSON by tracing the plan ink

(Replaces the Foundry conversion: the fan scenes turned out to be a loose reinterpretation, see the ledger's Task 2 rulings. Walls are extracted from the official sheets' wall-ink map built in Task 2.)

**Files:**
- Create: `tools/trace-walls.mjs`, `tools/lib/trace.mjs`
- Test: `tests/trace.test.js`

**Interfaces:**
- Consumes: `src/data/calibration.json` (`sheets`, `pxPerCell`, `cellM`) and `loadSheet()` from `tools/lib/sheets.mjs`.
- Produces: `traceInk(ink, { pxPerM, originPx, material }) → { walls, openings }` in `tools/lib/trace.mjs`, pure: binarise, drop small components, thin to a skeleton, walk it into polylines between junctions and endpoints, simplify, axis-snap near-axis segments, prune spurs under 0.6 m, bridge gaps between facing collinear ends (0.3–0.7 m → `window`, 0.7–2.0 m → `door`) into one wall with an opening. CLI `node tools/trace-walls.mjs <levelId>` writes `src/data/levels/<levelId>.json` only when absent (`--force` overwrites) with `{ id, walls, openings, floors: [], stairs: [], rooms: [], props: [], lights: [], roofs: [] }`.
- Level JSON shapes (used by Tasks 4–9):
  - wall `{ id, a: [x, z], b: [x, z], h, material }` (`h` defaults to the storey height)
  - opening `{ wall, at, width, kind }` where `at` is metres from `a`, kind ∈ `door|window|arch|trapdoor`
  - floor `{ polygon: [[x, z], …], material }`
  - stair `{ kind: straight|spiral|ramp, from: [x, z], to: [x, z], width, toLevel }`
  - room `{ number, name, polygon }`
  - prop `{ asset, x, z, rot, scale? }` (rot in degrees, clockwise seen from above)
  - light `{ x, y, z, kind }` kind ∈ `hearth|lantern|candle|window`
  - roof `{ rect: [x, z, w, d], ridge: "x"|"z", pitch, material, covers: levelId }`

- [ ] **Step 1: Write the failing test** `tests/trace.test.js`: a synthetic ink raster at 60 px/m with a 6 m × 4 m rectangle of 0.5 m walls, a 1.2 m gap in the south wall and a 0.9 m interior partition stub; `traceInk` returns four outer walls whose lengths match within 0.2 m, one `door` opening of width 1.2 ± 0.15 at 3.0 ± 0.2 m along the south wall, and no wall shorter than 0.6 m.
- [ ] **Step 2: Run the test**, expected FAIL.
- [ ] **Step 3: Implement** `tools/lib/trace.mjs` (Zhang-Suen thinning, Douglas-Peucker ε = 5 cm, axis snap under 5°, spur prune 0.6 m) and the CLI, which runs on the level's sheet crop at half resolution.
- [ ] **Step 4: Run the test**, expected PASS. Run the CLI for `rdc`; render the draft over the sheet (`tools/overlay.mjs`, kept from the calibration work) and check the walls follow the ink.

### Task 4: Level registry, loader and legend test

**Files:**
- Create: `src/data/levels.js`, `src/data/schema.js`, `src/data/legend.js`
- Test: `tests/schema.test.js`, `tests/legend.test.js`

**Interfaces:**
- Produces: `LEVELS` (array, bottom to top) of `{ id, label, elevation, height }` with the Global Constraints values (`toits` has `elevation: 11.2 + 2.6`, `height: 0`); `levelIndex(id) → number`; `loadLevels() → Promise<Map<id, LevelJson>>` using `import.meta.glob('./levels/*.json', { eager: true })`; `validateLevel(json) → string[]` (empty when valid); `LEGEND` = `{ 1: "Chambre de Sigmund", … 40: "Appartement de Tanorivel" }` with the French names from the spec's table (room 17 "Mur des épées" is a feature, not a room; it is a prop label, so `LEGEND` covers 1–40 minus 17 and the legend test expects 17 nowhere).

- [ ] **Step 1: Write the failing tests.** `schema.test.js`: a wall without `b` yields an error mentioning its id; an opening referencing an unknown wall yields an error; a valid minimal level yields `[]`. `legend.test.js`: after `loadLevels()`, every key of `LEGEND` appears as `room.number` in exactly one level, and no level has a number outside `LEGEND`.
- [ ] **Step 2: Run both**, expected FAIL.
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run `npx vitest run tests/schema.test.js`**, expected PASS. `npm run test:legend` is expected to FAIL until Task 15 completes; it is the acceptance gate, kept out of `npm test`.

### Task 5: Geometry builders

**Files:**
- Create: `src/build/walls.js`, `src/build/floors.js`, `src/build/roofs.js`, `src/build/stairs.js`, `src/build/silo.js`, `src/build/geometry.js`
- Test: `tests/walls.test.js`, `tests/floors.test.js`, `tests/roofs.test.js`

**Interfaces:**
- Consumes: level JSON shapes from Task 3; `materialFor(name, levelId)` from Task 6 (pass a factory so tests use plain `MeshBasicMaterial`).
- Produces:
  - `splitWall(wall, openings, storeyH) → Piece[]` in `geometry.js`, pure; `Piece = { x0, x1, y0, y1 }` along the wall (x from `a`, y from the floor). Doors: height 2.1, pieces beside plus a lintel above. Windows: sill 0.9, height 1.1. Arch: like door, height 2.4. Trapdoor: no wall piece removed (it is a floor feature) and a warning is returned via `warnings` array.
  - `buildWall(wall, openings, levelInfo, matFor) → THREE.Group` (BoxGeometry per piece, thickness by material, door leaves as 0.05 m planks rotated 15° open).
  - `buildFloor(floor, levelInfo, matFor) → THREE.Mesh` (ShapeGeometry from polygon, rotated flat, 0.15 m slab for `planks`, flush plane for `dirt|flagstone|cobbles|water`).
  - `buildRoof(roof, matFor) → THREE.Mesh`: gable over `rect`, ridge height `pitch` is in degrees, `ridgeH = (span/2) * tan(pitch)`; eaves overhang 0.4 m; `material` `tile|thatch|slate`.
  - `buildStair(stair, levelInfo, matFor) → THREE.Group`: straight = 0.25 m risers from `from` to `to` rising `levelInfo.height`; spiral = 16 steps per turn around a 0.15 m post, radius `width`; ramp = a tilted box.
  - `buildSilo({ centre, radius, depth }, matFor) → THREE.Group`: open cylinder wall (stone, inner radius 3), ring floors at −5 and −10, central spiral post.
- [ ] **Step 1: Write the failing tests.** `walls.test.js`: a 6 m wall with a door at 2 m (width 1.2) over storey 3.0 yields pieces `[0,2]×[0,3]`, `[3.2,6]×[0,3]`, `[2,3.2]×[2.1,3]`; a door at 5.6 m width 1.2 is clamped to end at 6 and produces one warning (Review Focus 2); overlapping openings merge. `floors.test.js`: polygon area helper gives 9 for a 3×3 square and the mesh's bounding box spans it. `roofs.test.js`: a 6 m span at pitch 45° has a ridge 3 m above eaves; vertex count 14 (two gables, two slopes with overhang).
- [ ] **Step 2: Run**, expected FAIL.
- [ ] **Step 3: Implement** the modules. Keep `geometry.js` free of Three.js imports.
- [ ] **Step 4: Run `npm test`**, expected PASS.

### Task 6: Materials palette and evening lighting

**Files:**
- Create: `src/materials.js`, `src/lighting.js`
- Test: `tests/lighting.test.js`

**Interfaces:**
- Produces: `PALETTE` = `{ enclosure: '#6e6a66', stone: '#7a7f85', timber: '#6b4a2b', cob: '#d9c6a3', partition: '#c9b48e', planks: '#a9783f', dirt: '#8a6b45', flagstone: '#7d7b74', cobbles: '#6f7f78', water: '#3d6b74', tile: '#8e4a34', thatch: '#b89b5a', slate: '#4e5560', windowGlow: '#ffb347' }`; `materialFor(name, levelId) → MeshStandardMaterial` cached per `(name, levelId)`, `flatShading: true`, `transparent: true`, `opacity: 1`; `levelMaterials(levelId) → Material[]` for the fade in Task 7; `windowGlow` has `emissive` set and `emissiveIntensity 1.6`.
- Produces: `setupLighting(scene)` adds HemisphereLight(`#2b3a5c`, `#3a2a1e`, 0.55) and a DirectionalLight(`#9fb4d8`, 0.35) from (−30, 50, −20); `LIGHT_KINDS` = `{ hearth: { color: '#ff8c3a', intensity: 25, distance: 9 }, lantern: { color: '#ffb35c', intensity: 8, distance: 6 }, candle: { color: '#ffc98a', intensity: 3, distance: 3.5 }, window: { color: '#ffb347', intensity: 6, distance: 5 } }`; `buildLight(light, levelInfo) → PointLight` at `(x, elevation + y, z)`, `decay 2`, shadows off.
- [ ] **Step 1: Write the failing test**: `buildLight({x:1,y:1.2,z:2,kind:'hearth'}, {elevation:3})` has position y 4.2, colour `#ff8c3a`, intensity 25; `materialFor('stone','rdc') === materialFor('stone','rdc')` and `!== materialFor('stone','e1')`.
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement.** **Step 4: Run**, PASS.

### Task 7: Level stack, peeling and selector UI

**Files:**
- Create: `src/stack.js`, `src/ui/levelSelector.js`, `src/ui/controls.js`
- Modify: `src/main.js`
- Test: `tests/stack.test.js`

**Interfaces:**
- Consumes: `LEVELS`, `levelIndex`, builders from Task 5, `buildLight` from Task 6, `levelMaterials`.
- Produces:
  - `visibleSet(selectedId) → { levels: Set<id>, roofsCovering: Set<id> }` pure: levels with index ≤ selected; a roof with `covers: L` is visible iff `levelIndex(L) < levelIndex(selected)`; `toits` shows all.
  - `stepLevel(id, delta: ±1) → id` pure, clamped to the ends of `LEVELS`.
  - `class LevelStack { constructor(scene, levelsMap, { matFor, propLibrary }); select(id, { animate = true }); get selected; group(id) → THREE.Group }`. Fade: tween each hidden level's `levelMaterials` opacity to 0 over 300 ms then set `group.visible = false`; shown levels do the reverse. Each level group is translated by `elevation`.
  - `mountLevelSelector(container, stack)` renders a vertical list of buttons, top to bottom `Toits … Silo -2`, current one highlighted, and a `Vue d'ensemble` button that calls `controls.reset()`.
  - `bindKeys(stack, { labels, calque, stats })`: `ArrowUp`/`ArrowDown` move one level and stop at the ends; `n`, `c`, `f` toggle.
- [ ] **Step 1: Write the failing test**: `visibleSet('e1').levels` = `{silo2, silo1, rdc, e1}`; a roof covering `rdc` is in `roofsCovering` for `e1` but not for `rdc`; `visibleSet('toits')` includes every level; `stepLevel('toits', +1) === 'toits'` and `stepLevel('silo2', -1) === 'silo2'` (Review Focus 4).
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement**, wiring `main.js` to load levels, build the stack, mount the selector (right edge, dark translucent panel), default selection `toits`. **Step 4: Run tests**, PASS; in the browser the drafted RdC walls from Task 3 appear and the selector hides levels.

### Task 8: Calque overlay and room labels

**Files:**
- Create: `src/calque.js`, `src/labels.js`
- Modify: `src/scene.js` (CSS2DRenderer in `resize()`), `src/main.js`
- Test: `tests/labels.test.js`

**Interfaces:**
- Consumes: `calibration.json` sheets, `LevelStack.selected`, rooms from level JSON.
- Produces: `class Calque { constructor(scene, calibration); setLevel(id); set visible(v) }`: one `PlaneGeometry` per sheet at `worldRect`, `y = elevation + 0.03`, `MeshBasicMaterial { map, transparent, opacity 0.5, depthWrite false }`, texture loaded lazily on first show. `class Labels { constructor(scene, levelsMap); setLevel(id); set visible(v) }`: CSS2DObject per room at `centroid(polygon)`, `y = elevation + 1.4`, class `room-label`. `centroid(polygon) → [x, z]` pure (area-weighted).
- [ ] **Step 1: Write the failing test**: `centroid` of a 4×2 rectangle at (1,1) is (3, 2); of an L-shape is the area-weighted point (give the exact numbers in the test); `resize()` sets both renderers' size and the camera aspect to `innerWidth/innerHeight` (Review Focus 5, run under jsdom with a stubbed renderer).
- [ ] **Step 2: Run**, FAIL. **Step 3: Implement**; label style: 13 px, `#f2e6c9` on `rgba(14,17,22,.7)`, 2 px 6 px padding, radius 3. **Step 4: Run**, PASS; press `C` on `rdc` in the browser and confirm the plan appears on the floor with the drafted walls on top.

### Task 9: Asset pipeline and prop library

**Files:**
- Create: `tools/fetch-assets.sh`, `tools/pick-assets.mjs`, `src/data/props.json`, `src/props.js`, `public/assets/LICENSES.md`
- Test: `tests/props.test.js`

**Interfaces:**
- Produces: `src/data/props.json`: `{ "<assetId>": { "pack": "kaykit-furniture|kaykit-dungeon|kenney-<kit>|quaternius-village|primitive", "file": "relative/in/pack.gltf", "footprint": [w, d], "height": h, "yaw": 0 } }`. Required ids (the plan symbols): `bed_single`, `bed_double`, `table_round`, `table_long`, `bench`, `stool`, `chair`, `barrel`, `barrel_large`, `vat`, `crate`, `sack`, `shelf`, `counter`, `hearth`, `stove`, `anvil`, `forge`, `cart`, `hay_bale`, `trough`, `well_ring`, `cistern_lid`, `chest`, `bathtub`, `rug`, `desk`, `lantern_post`, `sword_rack`, `pulley`.
- Produces: `class PropLibrary { static async load(renderer) → PropLibrary; place(levelGroup, prop, levelInfo) }`: loads each unique glTF once, scales the model so its XZ bounding box equals `footprint` and its base sits at y 0, builds one `InstancedMesh` per (asset, mesh) per level; a failed load logs `Prop <id> introuvable` and uses a `BoxGeometry(w, h, d)` in material `timber` (Review Focus 3). `fitTransform(bbox, footprint) → { scale, offsetY }` pure.
- [ ] **Step 1: Write `tools/fetch-assets.sh`**: shallow-clone `https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0` and `…/KayKit-Dungeon-Remastered-1.0` into `vendor/`; `curl` the Kenney kits whose zips are directly linkable (try `furniture-kit`, `castle-kit`, `graveyard-kit`, `nature-kit` from `https://kenney.nl/media/pages/assets/<kit>/...`; the script prints the ones that failed). Quaternius Medieval Village MegaKit is a manual itch.io download: print the URL and the expected `vendor/quaternius-village/` path. Run it.
- [ ] **Step 2: Inventory.** List the glTF files in `vendor/` (`find vendor -iname '*.gltf' -o -iname '*.glb'`) and map each required id to a file in `props.json`, measuring footprints by loading the glTF bounding box in a small node script using `three` (`GLTFLoader` needs a DOM; use `@gltf-transform/core` as a devDependency instead to read accessors' min/max). Ids with no match use `"pack": "primitive"`.
- [ ] **Step 3: Write the failing test**: `fitTransform({min:[-1,0,-0.5], max:[1,1,0.5]}, [1,0.5])` returns scale 0.5 and offsetY 0; `props.json` has every required id; `place()` with a missing asset leaves a Mesh of the footprint in the group (jsdom, loader stubbed to reject).
- [ ] **Step 4: Run**, FAIL. **Step 5: Implement `pick-assets.mjs`** (copies the referenced files and their `.bin`/textures into `public/assets/<pack>/`, writes `LICENSES.md` naming each pack, URL, licence CC0) and `src/props.js`. **Step 6: Run**, PASS; drop a `barrel` at (5,5) in `rdc.json` and see it in the browser.

### Task 10: Screenshot harness

**Files:**
- Create: `tools/shots.mjs`, `verification/.gitkeep`
- Modify: `src/main.js` (URL params)

**Interfaces:**
- Produces: URL params `?level=<id>&calque=1&labels=1&view=top|iso`. `top` = OrthographicCamera straight down framing the selected level's sheet `worldRect`; `iso` = the default perspective. `node tools/shots.mjs [levelId…]` starts `vite preview` on a free port, launches `/usr/bin/chromium` headless via playwright-core, saves `verification/<id>-top.png`, `<id>-top-calque.png`, `<id>-iso.png` at 1920×1080, and exits non-zero if any page logs a console error.
- [ ] **Step 1: Implement** params and the script.
- [ ] **Step 2: Run `npm run shots rdc`** and open the three PNGs with the Read tool: the calque one must show plan and model superimposed.

### Task 11: Trace the ground floor, courtyard and surroundings

**Files:**
- Modify: `src/data/levels/rdc.json`

Reference sheet: `Auberge de l_Epée 1-RDC.jpg`; legend rooms 1–12; also the enclosure wall (material `enclosure`, h 4.0), the courtyard floor (`dirt`), the street (`cobbles`), the river strip (`water`), the neighbouring roofs on the sheet as `roofs` with `covers: "rdc"` and `material: tile` on short `enclosure` walls, cut at the sheet edge.

- [ ] **Step 1: Walls.** With `?level=rdc&calque=1&view=top`, compare every drafted wall to the painted one; move endpoints to the painted centreline, split where the draft merged two materials, delete walls the plan does not have, add the ones it has. Tolerance 0.25 m. Doors and windows: every painted door becomes an opening of kind `door` (gate: `arch`, width 3.0), each painted window a `window`.
- [ ] **Step 2: Floors and rooms.** One `floors` polygon per room and for the courtyard, street, river; `rooms` 1–12 with legend names; the silo stair hole is left as a `stairs` entry `{ kind: 'spiral', toLevel: 'silo1' }` on the cellier's spiral stair.
- [ ] **Step 3: Stairs.** The courtyard flight up to the common room, the tower's spiral, the cellier ramp (`ramp`) and the stable ladder.
- [ ] **Step 4: Props and lights.** Place every furniture symbol with its orientation; hearths and the forge get `hearth` lights, lanterns on the courtyard posts `lantern`.
- [ ] **Step 5: Verify.** `npm run shots rdc`; inspect the three images; repeat Steps 1–4 until walls coincide with the painting at 2048 px and every legend number 1–12 is present. Run `npx vitest run tests/schema.test.js` against the file (add a test case loading `rdc.json` through `validateLevel` and expecting `[]`).

### Task 12: Trace the first floor

**Files:**
- Modify: `src/data/levels/e1.json`

Reference sheet: `… 2-1er étage.jpg`; rooms 13–16, 18–21; the sword wall (17) is a `sword_rack` prop in room 16. Amber windows of the common room use `window` lights and the `windowGlow` material on their panes (opening kind `window` with `"glow": true`). Roofs for the kitchen annex and latrines (`covers: "rdc"`) go here if the sheet paints them.

- [ ] Steps 1–5 as in Task 11, with `npm run shots e1`.

### Task 13: Trace the second floor

**Files:**
- Modify: `src/data/levels/e2.json`

Reference: sheet 3, top sub-plan; rooms 22–31; the balcony-gallery (30) is a `floors` polygon of `planks` with a 1.0 m `partition` railing wall and no roof; the bath (31) gets `bathtub` props. Roofs over the stable and Eudes's house (`covers: "e1"`).

- [ ] Steps 1–5 as in Task 11, with `npm run shots e2`.

### Task 14: Trace the third floor, fourth floor and roofs

**Files:**
- Modify: `src/data/levels/e3.json`, `src/data/levels/e4.json`, create `src/data/levels/toits.json`

Reference: sheet 3, middle and bottom sub-plans; rooms 32–35 on `e3` (the dormitory 35 under the main roof, walls material `timber`), rooms 38–40 on `e4` (tower only). `toits.json` holds the main-body roof (`covers: "e3"`), the tower roof (`covers: "e4"`), chimneys as `stone` walls 0.6×0.6 rising 1.2 m above the ridge, and the sign (`primitive` prop `sign_sword`: a gold board with a silver sword, built in code) on the tower's street face.

- [ ] Steps 1–5 as in Task 11 for `e3`, then `e4`, then `toits` (`npm run shots e3 e4 toits`). Check that selecting `e1` leaves the germoir open to the sky and `3e` shows the dormitory with no roof.

### Task 15: Trace the silo levels

**Files:**
- Modify: `src/data/levels/silo1.json`, `src/data/levels/silo2.json`, `tools/correspondences.json`, `src/data/calibration.json`

Reference: fan silo scenes and renders (600 px per cell) plus the rulebook (6 m wide, 10 m deep, central spiral stair, upper level = cellier 36, lower = bric-à-brac 37). Centre = the RdC cellier spiral stair traced in Task 11.

- [ ] **Step 1: Register.** Add silo correspondences (circle centre and two rim points) and rerun `node tools/calibrate.mjs` so the silo `worldRect`s centre on the stair.
- [ ] **Step 2: Geometry.** Each silo level: `floors` disc polygon (24-gon, radius 3, `planks` for silo1, `dirt` for silo2), room 36 or 37, the spiral stair, props from the fan render (barrels, crates, sacks; broken furniture as crates and stools), two `candle` lights. The cylinder wall itself is built once by `buildSilo` from `rdc.json`'s stair position (add `"silo": { "centre": [x, z], "radius": 3, "depth": 10 }` to `rdc.json` and have the stack add it to `silo1`'s group).
- [ ] **Step 3: Verify.** `npm run shots silo1 silo2`; `npm run test:legend` must now PASS: all 39 legend rooms present exactly once.

### Task 16: Finish — README, build, performance

**Files:**
- Create: `Creations/auberge-epee-3d/README.md`
- Modify: `src/main.js` (stats toggle `F` showing draw calls and fps from `renderer.info` in a corner)

- [ ] **Step 1: README** in the style of `Creations/outils-meneur/README.md`: what it is, `npm install && npm run dev`, controls (keys from Global Constraints), data layout, where the plans come from, licences, `npm run shots` for checking.
- [ ] **Step 2: `npm run build`**, open `dist/` with `npm run preview`, orbit at `toits` with everything visible: draw calls under 400 and no visible stutter when peeling; if over, merge static walls per level into one `BufferGeometry` per material (`BufferGeometryUtils.mergeGeometries`).
- [ ] **Step 3: Full check.** `npm test`, `npm run test:legend`, `npm run shots` (all levels), look at every `verification/*-top-calque.png` once more.
