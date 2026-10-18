import { stepLevel } from '../stack.js';

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Keyboard: arrows move one level, N toggles room names, C the plan calque, F the stats overlay.
 * Any of the toggles may be absent.
 */
export function bindKeys(stack, { labels, calque, stats } = {}, target = window) {
  const handler = (event) => {
    if (EDITABLE.has(event.target?.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
    switch (event.key) {
      case 'ArrowUp':
        stack.select(stepLevel(stack.selected, 1));
        break;
      case 'ArrowDown':
        stack.select(stepLevel(stack.selected, -1));
        break;
      case 'n': case 'N':
        labels?.toggle();
        break;
      case 'c': case 'C':
        calque?.toggle();
        break;
      case 'f': case 'F':
        stats?.toggle();
        break;
      default:
        return;
    }
    event.preventDefault();
  };
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}
