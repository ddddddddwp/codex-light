import { describe, expect, it } from 'vitest';
import {
  computeOverlayBounds,
  overlaySizeForMode,
  selectOverlayDisplay,
  type DisplayLike
} from '../../src/main/overlay-bounds';

const displays: DisplayLike[] = [
  { id: 1, isPrimary: true, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
  { id: 2, workArea: { x: 1920, y: 40, width: 1280, height: 900 } }
];

describe('overlay bounds', () => {
  it('computes compact top-center bounds on the primary display', () => {
    expect(computeOverlayBounds(displays[0], 'compact', {
      alignment: 'top-center',
      sizeScale: 1
    })).toEqual({ x: 810, y: 10, width: 300, height: 78 });
  });

  it('computes top-left and top-right bounds with side margins', () => {
    expect(computeOverlayBounds(displays[0], 'compact', {
      alignment: 'top-left',
      sizeScale: 1
    })).toEqual({ x: 10, y: 10, width: 300, height: 78 });

    expect(computeOverlayBounds(displays[0], 'compact', {
      alignment: 'top-right',
      sizeScale: 1
    })).toEqual({ x: 1610, y: 10, width: 300, height: 78 });
  });

  it('accounts for non-zero work area origins', () => {
    expect(computeOverlayBounds(displays[1], 'compact', {
      alignment: 'top-right',
      sizeScale: 1
    })).toEqual({ x: 2890, y: 50, width: 300, height: 78 });
  });

  it('uses base and scaled sizes for compact and expanded modes', () => {
    expect(overlaySizeForMode('compact', 1)).toEqual({ width: 300, height: 78 });
    expect(overlaySizeForMode('expanded', 1)).toEqual({ width: 580, height: 128 });
    expect(overlaySizeForMode('expanded', 1.1)).toEqual({ width: 638, height: 141 });
  });

  it('selects primary, numeric, and fallback displays', () => {
    expect(selectOverlayDisplay(displays, 'primary')).toBe(displays[0]);
    expect(selectOverlayDisplay(displays, 2)).toBe(displays[1]);
    expect(selectOverlayDisplay(displays, 99)).toBe(displays[0]);
  });

  it('uses the first display as primary when none is marked', () => {
    const unmarkedDisplays: DisplayLike[] = [
      { id: 10, workArea: { x: 100, y: 100, width: 800, height: 600 } },
      { id: 11, workArea: { x: 900, y: 100, width: 800, height: 600 } }
    ];

    expect(selectOverlayDisplay(unmarkedDisplays, 'primary')).toBe(unmarkedDisplays[0]);
    expect(selectOverlayDisplay(unmarkedDisplays, 99)).toBe(unmarkedDisplays[0]);
  });

  it('throws when no displays are available', () => {
    expect(() => selectOverlayDisplay([], 'primary')).toThrow('No displays available for overlay positioning');
  });
});
