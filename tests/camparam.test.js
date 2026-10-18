import { describe, it, expect } from 'vitest';
import { parseCamera } from '../src/scene.js';

describe('parseCamera', () => {
  it('reads six numbers as position and target', () => {
    expect(parseCamera('10,5,-2,0,1,3')).toEqual({ position: [10, 5, -2], target: [0, 1, 3] });
  });
  it('rejects anything else', () => {
    expect(parseCamera('1,2,3')).toBeNull();
    expect(parseCamera('a,b,c,d,e,f')).toBeNull();
    expect(parseCamera(null)).toBeNull();
  });
});
