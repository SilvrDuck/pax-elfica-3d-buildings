import { describe, it, expect } from 'vitest';
import { webglSupported } from '../src/scene.js';
import { mount } from '../src/main.js';

describe('scene bootstrap', () => {
  it('reports WebGL as unsupported under jsdom', () => {
    expect(webglSupported()).toBe(false);
  });

  it('tells the user in French when WebGL is unavailable', () => {
    const container = document.createElement('div');
    mount(container);
    expect(container.textContent).toContain("WebGL n'est pas disponible");
  });
});
