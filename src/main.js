import './style.css';
import { createScene, webglSupported, parseCamera } from './scene.js';
import { setupLighting, fitShadowToBox } from './lighting.js';
import { materialFor } from './materials.js';
import { loadLevels, LEVELS, LEVEL_BY_ID, levelIndex } from './data/levels.js';
import { validateLevel } from './data/schema.js';
import calibration from './data/calibration.json';
import propCatalog from './data/props.json';
import { PropLibrary } from './props.js';
import { LevelStack } from './stack.js';
import { Calque } from './calque.js';
import { Labels } from './labels.js';
import { mountLevelSelector } from './ui/levelSelector.js';
import { bindKeys } from './ui/controls.js';

const NO_WEBGL =
  "WebGL n'est pas disponible dans ce navigateur. " +
  "Ouvrez la page dans Chromium ou Firefox avec l'accélération graphique activée.";
const CONTEXT_LOST = "Le rendu 3D s'est interrompu (contexte WebGL perdu). Rechargez la page.";

function showFatal(container, text) {
  const p = document.createElement('p');
  p.className = 'fatal';
  p.textContent = text;
  container.replaceChildren(p);
}

export function mount(container) {
  if (!webglSupported()) {
    showFatal(container, NO_WEBGL);
    return null;
  }
  let view;
  try {
    view = createScene(container);
  } catch (err) {
    console.warn(`Création du rendu WebGL impossible : ${err.message}`);
    showFatal(container, NO_WEBGL);
    return null;
  }
  view.renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showFatal(container, CONTEXT_LOST);
  });
  const lights = setupLighting(view.scene);
  const app = { view, stack: null, ready: null };
  app.ready = start(container, view, lights).then((parts) => Object.assign(app, parts));
  return app;
}

async function start(container, view, lights) {
  const params = new URLSearchParams(window.location.search);
  const levels = await loadLevels();
  for (const [id, json] of levels) {
    for (const problem of validateLevel(json)) console.warn(`Niveau ${id} : ${problem}`);
  }
  const propLibrary = await PropLibrary.load(propCatalog, { matFor: materialFor, baseUrl: import.meta.env.BASE_URL });
  const stack = new LevelStack(view.scene, levels, { matFor: materialFor, propLibrary });
  fitShadowToBox(lights.moon, stack.allBounds());
  const calque = new Calque(view.scene, calibration, { baseUrl: import.meta.env.BASE_URL });
  const labels = new Labels(view.scene, levels);
  stack.addEventListener('change', (e) => {
    calque.setLevel(e.detail.id);
    labels.setLevel(e.detail.id);
    view.ground.visible = levelIndex(e.detail.id) >= levelIndex('rdc');
  });
  const home = () => view.home(stack.selected === 'toits' ? null : stack.bounds(stack.selected));
  mountLevelSelector(container, stack, { onHome: home, labels, calque });
  const stats = mountStats(container, view.renderer);
  bindKeys(stack, { labels, calque, stats });

  // Each selection lights a different set of point lights, which is part of the shader cache key:
  // compile every variant now rather than in the middle of a fade at the table.
  for (const info of LEVELS) {
    stack.select(info.id, { animate: false });
    view.renderer.compile(view.scene, view.camera);
  }

  const requested = params.get('level');
  const levelId = LEVEL_BY_ID.has(requested) ? requested : 'toits';
  stack.select(levelId, { animate: false });
  calque.visible = params.get('calque') === '1';
  labels.visible = params.get('labels') === '1';
  if (params.get('view') === 'top') {
    const sheet = calibration.sheets[levelId] ?? calibration.sheets.rdc;
    view.setTopView(sheet.worldRect);
  }
  const cam = parseCamera(params.get('cam'));
  if (cam) {
    view.camera.position.set(...cam.position);
    view.controls.target.set(...cam.target);
    view.controls.update();
  }
  return { stack, calque, labels };
}

/** Draw calls and frame rate in a corner, for checking the budget on the table's machine (key F). */
function mountStats(container, renderer) {
  const div = document.createElement('div');
  div.className = 'stats';
  div.hidden = true;
  container.appendChild(div);
  let frames = 0, last = performance.now();
  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - last >= 500) {
      const fps = Math.round((frames * 1000) / (now - last));
      div.textContent = `${fps} i/s · ${renderer.info.render.calls} appels · ${renderer.info.render.triangles} triangles`;
      frames = 0; last = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return { toggle: () => { div.hidden = !div.hidden; }, element: div };
}

if (typeof document !== 'undefined') {
  const app = document.getElementById('app');
  if (app) mount(app);
}
