import { LEVELS } from '../data/levels.js';

/**
 * Vertical level list on the right edge, top level first, plus the home-view button and the two
 * display toggles (room names, plan calque).
 */
export function mountLevelSelector(container, stack, { onHome, labels, calque } = {}) {
  const nav = document.createElement('nav');
  nav.className = 'levels';
  nav.setAttribute('aria-label', 'Niveaux');
  const buttons = new Map();
  for (const info of [...LEVELS].reverse()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = info.label;
    button.dataset.level = info.id;
    button.addEventListener('click', () => stack.select(info.id));
    nav.appendChild(button);
    buttons.set(info.id, button);
  }
  const home = document.createElement('button');
  home.type = 'button';
  home.className = 'home';
  home.textContent = "Vue d'ensemble";
  home.addEventListener('click', () => onHome?.());
  nav.appendChild(home);
  for (const [name, target, text] of [['labels', labels, 'Noms des pièces'], ['calque', calque, 'Calque du plan']]) {
    if (!target) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toggle';
    button.dataset.toggle = name;
    button.textContent = text;
    button.setAttribute('aria-pressed', String(Boolean(target.visible)));
    button.addEventListener('click', () => {
      target.toggle();
      button.setAttribute('aria-pressed', String(Boolean(target.visible)));
    });
    nav.appendChild(button);
  }
  const refresh = () => {
    for (const [id, button] of buttons) button.classList.toggle('current', id === stack.selected);
  };
  stack.addEventListener('change', refresh);
  refresh();
  container.appendChild(nav);
  return nav;
}
