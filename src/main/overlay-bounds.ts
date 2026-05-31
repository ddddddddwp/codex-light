import type { Rectangle } from 'electron';
import type { OverlaySettings, OverlayTargetDisplayId } from './overlay-settings';

export type OverlayMode = 'compact' | 'expanded';

export interface WorkAreaLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayLike {
  id: number;
  workArea: WorkAreaLike;
  isPrimary?: boolean;
}

export type OverlayBounds = Rectangle;

const BASE_SIZES: Record<OverlayMode, { width: number; height: number }> = {
  compact: { width: 300, height: 78 },
  expanded: { width: 580, height: 128 }
};

const TOP_MARGIN = 10;
const SIDE_MARGIN = 10;

export function overlaySizeForMode(mode: OverlayMode, sizeScale: number): { width: number; height: number } {
  const size = BASE_SIZES[mode];

  return {
    width: Math.round(size.width * sizeScale),
    height: Math.round(size.height * sizeScale)
  };
}

export function selectOverlayDisplay(
  displays: DisplayLike[],
  target: OverlayTargetDisplayId
): DisplayLike {
  if (displays.length === 0) {
    throw new Error('No displays available for overlay positioning');
  }

  const primary = displays.find((display) => display.isPrimary) ?? displays[0];

  if (target === 'primary') {
    return primary;
  }

  return displays.find((display) => display.id === target) ?? primary;
}

export function computeOverlayBounds(
  display: DisplayLike,
  mode: OverlayMode,
  settings: Pick<OverlaySettings, 'alignment' | 'sizeScale'>
): Rectangle {
  const size = overlaySizeForMode(mode, settings.sizeScale);
  const { x, y, width } = display.workArea;

  if (settings.alignment === 'top-left') {
    return {
      x: x + SIDE_MARGIN,
      y: y + TOP_MARGIN,
      ...size
    };
  }

  if (settings.alignment === 'top-right') {
    return {
      x: x + width - size.width - SIDE_MARGIN,
      y: y + TOP_MARGIN,
      ...size
    };
  }

  return {
    x: Math.round(x + width / 2 - size.width / 2),
    y: y + TOP_MARGIN,
    ...size
  };
}
