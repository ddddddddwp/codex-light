# Install Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reliable Win11 and WSL installer scripts for Codex Light.

**Architecture:** The Windows PowerShell installer builds or reuses the unpacked app, copies it to a per-user install directory, creates shortcuts, prepares runtime storage, and optionally enables startup launch. The WSL Bash installer configures Codex CLI hooks to write into the Windows runtime directory and runs doctor checks. A Windows uninstaller removes the app and shortcuts while preserving runtime data unless explicitly requested.

**Tech Stack:** PowerShell 5.1+, Bash, Node.js 22+, existing hook CLI, Vitest static coverage.

---

### Task 1: Script Contract Tests

**Files:**
- Create: `tests/install/install-scripts.test.ts`

- [ ] **Step 1: Write failing static contract tests**

Create tests that assert `scripts/install-win11.ps1`, `scripts/install-wsl-hooks.sh`, and `scripts/uninstall-win11.ps1` exist and contain the expected install commands, paths, and safety switches.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/install/install-scripts.test.ts`

Expected: FAIL because the scripts do not exist.

### Task 2: Installer Scripts

**Files:**
- Create: `scripts/install-win11.ps1`
- Create: `scripts/install-wsl-hooks.sh`
- Create: `scripts/uninstall-win11.ps1`

- [ ] **Step 1: Implement Windows installer**

The script shall resolve the repository root, build with `npm run package:win:dir` unless `-SkipBuild` is passed, stop existing Codex Light processes, copy `dist/win-unpacked` into `%LOCALAPPDATA%\Programs\CodexLight`, create Desktop and Start Menu shortcuts, create `%LOCALAPPDATA%\CodexLight`, optionally create a Startup shortcut, and launch the installed app unless `-NoLaunch` is passed.

- [ ] **Step 2: Implement WSL hook installer**

The script shall detect the Windows username with `powershell.exe`, create `/mnt/c/Users/<user>/AppData/Local/CodexLight`, build `dist/hook-cli/index.js` if needed, install Codex hooks with an absolute Node and hook CLI path, run doctor, and optionally emit a manual test event.

- [ ] **Step 3: Implement Windows uninstaller**

The script shall stop Codex Light, remove install and shortcut files, preserve runtime state by default, and delete `%LOCALAPPDATA%\CodexLight` only when `-RemoveRuntime` is passed.

### Task 3: Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/setup-win11.md`
- Modify: `docs/setup-wsl-ubuntu22-codex-cli.md`

- [ ] **Step 1: Document the script-first install path**

Add PowerShell and WSL commands that call the new scripts, plus the most useful switches.

### Task 4: Verification And Publish

- [ ] **Step 1: Verify**

Run: `npx vitest run tests/install/install-scripts.test.ts`, `bash -n scripts/install-wsl-hooks.sh`, PowerShell parser checks for both `.ps1` files, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

- [ ] **Step 2: Commit and push**

Commit as `feat: add installer scripts` and push to `origin/main`.
