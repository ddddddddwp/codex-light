## Summary

Fix the island clipping and transparency artifact by making the renderer island scale to the Electron window bounds and eliminating the shadow that exposes the transparent window rectangle.

## Root Cause

The main process scales the Electron overlay bounds with `sizeScale`, but the renderer island body keeps fixed pixel dimensions. At smaller size settings, expanded details can exceed the transparent BrowserWindow viewport. The island `box-shadow` also makes the transparent window's rectangular clipping area visible.

## Approach

- Read `sizeScale` from overlay settings in the renderer and expose it as a CSS custom property.
- Split the island into a transparent frame sized by `sizeScale` and a visible body transformed from the fixed base dimensions.
- Remove the island `box-shadow`; retain the solid rounded island, subtle border, and backdrop blur so the area outside the island remains truly transparent.
- Add tests that fail on the current clipped bounds and current shadow style.

## Non-Goals

- No new settings, APIs, dependencies, or interaction behavior.
- No changes to session data rendering semantics.
