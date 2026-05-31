# Windows Installer Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a formal Windows installer for Codex Light and reconnect WSL Codex CLI hooks after removing old unpacked installs.

**Architecture:** Electron Builder will emit an NSIS setup executable with stable artifact naming and installer shortcut behavior. Existing scripts remain as developer and WSL helpers, while README and setup docs make the setup executable the primary desktop install path. The machine cleanup is operational: stop running old copies, remove old unpacked folders, then reinstall WSL hooks against the Windows runtime directory.

**Tech Stack:** Electron Builder NSIS, PowerShell, Bash, Vitest static packaging tests.

---

### Task 1: Package Metadata Tests

**Files:**
- Modify: `tests/install/install-scripts.test.ts`

- [ ] Add a test asserting `package.json` configures NSIS artifact name, shortcut creation, per-machine disabled, and run-after-finish behavior.
- [ ] Run `npx vitest run tests/install/install-scripts.test.ts` and confirm the new test fails before config changes.

### Task 2: NSIS Release Configuration

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/setup-win11.md`

- [ ] Configure `artifactName` as `Codex-Light-Setup-${version}.${ext}`.
- [ ] Configure NSIS for one-click false, per-machine false, desktop shortcut true, start menu shortcut true, run after finish true.
- [ ] Document the setup executable as the preferred Win11 desktop install path and keep script installation as developer fallback.

### Task 3: Build, Cleanup, Hook Reconnect

**Files:**
- No source edits.

- [ ] Run lint, typecheck, tests, visual tests, and `npm run package:win`.
- [ ] Locate `dist/Codex-Light-Setup-0.1.0.exe`.
- [ ] Stop old `Codex Light` processes and remove old unpacked desktop install folders under `C:\Users\d\Desktop\codexlight`.
- [ ] Run `bash scripts/install-wsl-hooks.sh --no-build` to reconnect Codex CLI hooks.
- [ ] Run doctor and a manual hook event to verify the runtime path.

### Task 4: Commit And Push

- [ ] Commit as `build: add windows setup installer`.
- [ ] Push to `origin/main`.
