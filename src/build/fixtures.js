import * as THREE from 'three';

/**
 * Built-in stand-ins for the fixtures no CC0 pack provides: masonry pieces assembled from boxes,
 * sized to a footprint [w, d] and a height, base at y = 0, centred on the origin. Each returns a
 * group whose parts are named for tests and probes.
 */
export const FIXTURES = {
  hearth: buildHearth,
  forge: buildForge,
  stove: buildStove,
};

export function buildFixture(kind, { footprint, height }, matFor) {
  const build = FIXTURES[kind];
  return build ? build(footprint[0], footprint[1], height, matFor) : null;
}

function box(name, w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

// A fireplace against a wall: two jambs, a lintel, a mantel shelf, a dark firebox and embers.
function buildHearth(w, d, h, matFor) {
  const g = new THREE.Group();
  g.name = 'hearth';
  const stone = matFor('plinth'), dark = matFor('cut'), ember = matFor('ember');
  const jambW = w * 0.18, openH = h * 0.6;
  g.add(box('jamb', jambW, openH, d, stone, -w / 2 + jambW / 2, openH / 2, 0));
  g.add(box('jamb', jambW, openH, d, stone, w / 2 - jambW / 2, openH / 2, 0));
  g.add(box('lintel', w, h * 0.22, d, stone, 0, openH + h * 0.11, 0));
  g.add(box('mantel', w + 0.0, h * 0.08, d + 0.0, matFor('timber'), 0, openH + h * 0.22 + h * 0.04, 0));
  g.add(box('hood', w * 0.7, h - openH - h * 0.3, d * 0.8, stone, 0, openH + h * 0.3 + (h - openH - h * 0.3) / 2, -d * 0.1));
  g.add(box('firebox', w - 2 * jambW, openH, d * 0.9, dark, 0, openH / 2, -d * 0.05));
  g.add(box('embers', (w - 2 * jambW) * 0.7, 0.12, d * 0.5, ember, 0, 0.08, d * 0.05));
  g.add(box('hearthstone', w, 0.05, d * 0.3, stone, 0, 0.025, d / 2 - d * 0.15));
  return g;
}

// A smith's forge: a waist-high brick hearth, an embers bed in a hollow, a bellows at the back.
function buildForge(w, d, h, matFor) {
  const g = new THREE.Group();
  g.name = 'forge';
  const brick = matFor('plinth'), ember = matFor('ember'), timber = matFor('timber');
  g.add(box('base', w, h * 0.8, d * 0.75, brick, 0, h * 0.4, d * 0.125));
  g.add(box('embers', w * 0.5, 0.1, d * 0.35, ember, 0, h * 0.8 + 0.05, d * 0.1));
  g.add(box('rim', w, h * 0.12, 0.08, brick, 0, h * 0.8 + h * 0.06, d * 0.5 - 0.04));
  g.add(box('rim', 0.08, h * 0.12, d * 0.75, brick, -w / 2 + 0.04, h * 0.8 + h * 0.06, d * 0.125));
  g.add(box('rim', 0.08, h * 0.12, d * 0.75, brick, w / 2 - 0.04, h * 0.8 + h * 0.06, d * 0.125));
  g.add(box('bellows', w * 0.45, h * 0.3, d * 0.25, timber, 0, h * 0.95, -d * 0.37));
  g.add(box('bellows', w * 0.12, h * 0.12, d * 0.3, timber, 0, h * 1.05, -d * 0.12));
  return g;
}

// A bread or brewing oven: a brick block with an arched mouth and a short flue on top.
function buildStove(w, d, h, matFor) {
  const g = new THREE.Group();
  g.name = 'stove';
  const brick = matFor('plinth'), dark = matFor('cut'), ember = matFor('ember');
  g.add(box('body', w, h, d, brick, 0, h / 2, 0));
  g.add(box('mouth', w * 0.4, h * 0.4, 0.06, dark, 0, h * 0.35, d / 2 + 0.01));
  g.add(box('embers', w * 0.25, h * 0.08, 0.04, ember, 0, h * 0.2, d / 2 + 0.03));
  g.add(box('flue', w * 0.25, h * 0.35, d * 0.25, brick, 0, h + h * 0.175, -d * 0.2));
  return g;
}
