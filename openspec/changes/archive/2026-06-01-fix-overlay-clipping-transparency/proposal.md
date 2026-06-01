## Why

Expanded island details can appear visually clipped because the overlay window is sized close to the island body while the body still draws outside its own box. The visible island also leaves a rectangular shadow artifact around the transparent Electron window, making the dynamic-island area look less than fully transparent.

## What Changes

- Make the renderer island body scale to the configured overlay bounds so compact and expanded modes are not clipped at smaller size settings.
- Remove the rectangular-looking island shadow artifact while preserving the transparent window background and rounded island body.
- Add regression coverage for expanded bounds and transparent island styling.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- None. This fixes implementation behavior already covered by `top-island-overlay`.

## Impact

- Affects renderer island state handling in `src/renderer/App.tsx`.
- Affects renderer island presentation in `src/renderer/styles.css`.
- Adds focused unit and visual regression checks.
