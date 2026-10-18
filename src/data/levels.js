// The eight levels of the dollhouse, bottom to top. `elevation` is the floor height in metres and
// `height` the storey height; every block of the inn shares these so that peeling has one meaning.

export const LEVELS = [
  { id: 'silo2', label: 'Silo -2', elevation: -10, height: 5 },
  { id: 'silo1', label: 'Silo -1', elevation: -5, height: 5 },
  { id: 'rdc', label: 'RdC', elevation: 0, height: 3 },
  { id: 'e1', label: '1er', elevation: 3, height: 3 },
  { id: 'e2', label: '2e', elevation: 6, height: 2.6 },
  { id: 'e3', label: '3e', elevation: 8.6, height: 2.6 },
  { id: 'e4', label: '4e', elevation: 11.2, height: 2.6 },
  { id: 'toits', label: 'Toits', elevation: 13.8, height: 0 },
];

export const LEVEL_BY_ID = new Map(LEVELS.map((l) => [l.id, l]));

export function levelIndex(id) {
  return LEVELS.findIndex((l) => l.id === id);
}

const modules = import.meta.glob('./levels/*.json', { eager: true, import: 'default' });

/** Loads every level JSON present in src/data/levels/, keyed by level id. */
export async function loadLevels() {
  const out = new Map();
  for (const [file, json] of Object.entries(modules)) {
    const id = file.match(/([^/]+)\.json$/)[1];
    out.set(id, json);
  }
  return out;
}
