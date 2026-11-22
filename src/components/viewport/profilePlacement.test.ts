import { describe, expect, it } from 'vitest';
import { profileOriginMm } from './profilePlacement';

describe('profile mesh origin', () => {
  it('centers a vertical post on its footprint', () => {
    expect(profileOriginMm({ x: 0, y: 50, z: 0 }, { x: 0, y: 0, z: 90 }, 30)).toEqual({
      x: 15,
      y: 50,
      z: 15,
    });
  });

  it('centers a depth profile without shifting it sideways', () => {
    expect(profileOriginMm({ x: 100, y: 200, z: 30 }, { x: 0, y: -90, z: 0 }, 30)).toEqual({
      x: 115,
      y: 215,
      z: 30,
    });
  });

  it('lifts a width profile onto the center of its section', () => {
    expect(profileOriginMm({ x: 30, y: 200, z: 0 }, { x: 0, y: 0, z: 0 }, 30)).toEqual({
      x: 30,
      y: 215,
      z: 15,
    });
  });
});
