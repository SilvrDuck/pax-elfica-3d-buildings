import { describe, it, expect } from 'vitest';
import { parseQuality, shouldDowngrade, QUALITY } from '../src/quality.js';

describe('quality presets', () => {
  it('names what each level turns on', () => {
    expect(QUALITY.high).toEqual({ bloom: true, shadows: true });
    expect(QUALITY.low).toEqual({ bloom: false, shadows: false });
  });
  it('reads the URL parameter, defaulting to high', () => {
    expect(parseQuality('low')).toBe('low');
    expect(parseQuality('high')).toBe('high');
    expect(parseQuality('ultra')).toBe('high');
    expect(parseQuality(null)).toBe('high');
  });
});

describe('shouldDowngrade', () => {
  it('asks for low quality after a steady run under 40 fps, not on a single hiccup', () => {
    const slow = Array(60).fill(33);
    const fast = Array(60).fill(8);
    const hiccup = [...Array(55).fill(8), 120, 90, 8, 8, 8];
    expect(shouldDowngrade(slow)).toBe(true);
    expect(shouldDowngrade(fast)).toBe(false);
    expect(shouldDowngrade(hiccup)).toBe(false);
    expect(shouldDowngrade(Array(10).fill(33))).toBe(false); // too few samples
  });
});
