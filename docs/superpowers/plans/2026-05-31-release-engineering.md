# Release Engineering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual GitHub Release pipeline and improve the NSIS installer with automatic old-process shutdown and an optional startup shortcut.

**Architecture:** Release automation lives in a GitHub Actions workflow that bumps package versions, validates, builds on Windows, pushes a release commit/tag, and publishes the installer. Installer behavior is customized through electron-builder's NSIS `include` hook using a focused `scripts/nsis/installer.nsh` file, while existing PowerShell developer install scripts remain unchanged.

**Tech Stack:** GitHub Actions, npm, electron-builder NSIS, PowerShell, NSIS include macros, Vitest static configuration tests.

---

### Task 1: Release Workflow Test

**Files:**
- Create: `tests/packaging/release-workflow.test.ts`

- [ ] **Step 1: Write the failing release workflow test**

Create `tests/packaging/release-workflow.test.ts` with:

```typescript
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

describe('release workflow', () => {
  it('publishes a manually triggered Windows installer release', () => {
    const workflow = read('.github/workflows/release.yml');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('patch');
    expect(workflow).toContain('minor');
    expect(workflow).toContain('major');
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('runs-on: windows-latest');
    expect(workflow).toContain('actions/checkout@v4');
    expect(workflow).toContain('actions/setup-node@v4');
    expect(workflow).toContain('node-version: 22');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm version "${{ inputs.version }}" --no-git-tag-version');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm run lint');
    expect(workflow).toContain('npm run package:win');
    expect(workflow).toContain('git commit -m "chore(release): v$env:VERSION"');
    expect(workflow).toContain('git tag "v$env:VERSION"');
    expect(workflow).toContain('git push origin HEAD:main');
    expect(workflow).toContain('git push origin "v$env:VERSION"');
    expect(workflow).toContain('gh release create "v$env:VERSION"');
    expect(workflow).toContain('dist/Codex-Light-Setup-$env:VERSION.exe');
    expect(workflow).toContain('GH_TOKEN: ${{ github.token }}');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- tests/packaging/release-workflow.test.ts
```

Expected: FAIL with `ENOENT` for `.github/workflows/release.yml`.

---

### Task 2: Release Workflow Implementation

**Files:**
- Create: `.github/workflows/release.yml`
- Test: `tests/packaging/release-workflow.test.ts`

- [ ] **Step 1: Create the workflow directory and file**

Create `.github/workflows/release.yml` with:

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: Version increment
        required: true
        type: choice
        options:
          - patch
          - minor
          - major

permissions:
  contents: write

concurrency:
  group: release
  cancel-in-progress: false

jobs:
  release:
    name: Build and publish Windows installer
    runs-on: windows-latest
    defaults:
      run:
        shell: pwsh

    steps:
      - name: Checkout main
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git pull --ff-only origin main

      - name: Bump package version
        run: |
          npm version "${{ inputs.version }}" --no-git-tag-version
          $version = node -p "require('./package.json').version"
          "VERSION=$version" >> $env:GITHUB_ENV

      - name: Ensure tag is new
        run: |
          if (git rev-parse "v$env:VERSION" 2>$null) {
            Write-Error "Tag v$env:VERSION already exists."
            exit 1
          }

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Lint
        run: npm run lint

      - name: Build installer
        run: npm run package:win

      - name: Commit release version
        run: |
          git add package.json package-lock.json
          git commit -m "chore(release): v$env:VERSION"
          git tag "v$env:VERSION"

      - name: Push release commit and tag
        run: |
          git push origin HEAD:main
          git push origin "v$env:VERSION"

      - name: Publish GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "v$env:VERSION" `
            "dist/Codex-Light-Setup-$env:VERSION.exe" `
            --title "Codex Light v$env:VERSION" `
            --notes "Codex Light v$env:VERSION"
```

- [ ] **Step 2: Run the workflow test to verify it passes**

Run:

```bash
npm test -- tests/packaging/release-workflow.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit release workflow milestone**

Run:

```bash
git add .github/workflows/release.yml tests/packaging/release-workflow.test.ts
git commit -m "ci(release): add manual installer release workflow"
```

Expected: commit succeeds.

---

### Task 3: NSIS Customization Test

**Files:**
- Modify: `tests/install/install-scripts.test.ts`

- [ ] **Step 1: Add failing assertions for NSIS custom behavior**

Add this test inside the existing `describe('installer scripts', () => { ... })` block in `tests/install/install-scripts.test.ts`:

```typescript
  it('configures NSIS to close old processes and optionally start on login', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      build?: {
        nsis?: {
          include?: string;
        };
      };
    };
    const installerInclude = read('scripts/nsis/installer.nsh');

    expect(packageJson.build?.nsis?.include).toBe('scripts/nsis/installer.nsh');
    expect(installerInclude).toContain('!macro customCheckAppRunning');
    expect(installerInclude).toContain("Get-Process -Name 'Codex Light'");
    expect(installerInclude).toContain('Stop-Process -Force');
    expect(installerInclude).toContain('taskkill /F /IM "Codex Light.exe" /T');
    expect(installerInclude).toContain('!macro customPageAfterChangeDir');
    expect(installerInclude).toContain('Page custom StartOnLoginPageCreate StartOnLoginPageLeave');
    expect(installerInclude).toContain('Start Codex Light when I sign in');
    expect(installerInclude).toContain('${NSD_Uncheck} $StartOnLoginCheckbox');
    expect(installerInclude).toContain('!macro customInstall');
    expect(installerInclude).toContain('CreateShortCut "$SMSTARTUP\\Codex Light.lnk"');
    expect(installerInclude).toContain('!macro customUnInstall');
    expect(installerInclude).toContain('Delete "$SMSTARTUP\\Codex Light.lnk"');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- tests/install/install-scripts.test.ts
```

Expected: FAIL with `ENOENT` for `scripts/nsis/installer.nsh` or missing `build.nsis.include`.

---

### Task 4: NSIS Customization Implementation

**Files:**
- Create: `scripts/nsis/installer.nsh`
- Modify: `package.json`
- Test: `tests/install/install-scripts.test.ts`

- [ ] **Step 1: Add the NSIS include file**

Create `scripts/nsis/installer.nsh` with:

```nsis
!include LogicLib.nsh
!include nsDialogs.nsh

Var StartOnLoginCheckbox
Var StartOnLoginState

!macro customCheckAppRunning
  DetailPrint "Closing existing Codex Light processes."
  nsExec::ExecToLog `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name 'Codex Light' -ErrorAction SilentlyContinue | Stop-Process -Force"`
  Pop $0
  ${If} $0 != 0
    nsExec::ExecToLog `"$CmdPath" /C taskkill /F /IM "Codex Light.exe" /T`
    Pop $0
  ${EndIf}
  Sleep 500
!macroend

!macro customPageAfterChangeDir
  Page custom StartOnLoginPageCreate StartOnLoginPageLeave
!macroend

Function StartOnLoginPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "Startup option" "Choose whether Codex Light starts when you sign in."
  ${NSD_CreateLabel} 0 0 100% 24u "Codex Light can start automatically when Windows starts."
  Pop $1
  ${NSD_CreateCheckbox} 0 32u 100% 12u "Start Codex Light when I sign in"
  Pop $StartOnLoginCheckbox
  ${NSD_Uncheck} $StartOnLoginCheckbox

  nsDialogs::Show
FunctionEnd

Function StartOnLoginPageLeave
  ${NSD_GetState} $StartOnLoginCheckbox $StartOnLoginState
FunctionEnd

!macro customInstall
  ${If} $StartOnLoginState == ${BST_CHECKED}
    CreateShortCut "$SMSTARTUP\Codex Light.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
  ${Else}
    Delete "$SMSTARTUP\Codex Light.lnk"
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$SMSTARTUP\Codex Light.lnk"
!macroend
```

- [ ] **Step 2: Point electron-builder at the include file**

In `package.json`, add `include` to `build.nsis`:

```json
"nsis": {
  "oneClick": false,
  "perMachine": false,
  "allowToChangeInstallationDirectory": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "shortcutName": "Codex Light",
  "runAfterFinish": true,
  "deleteAppDataOnUninstall": false,
  "include": "scripts/nsis/installer.nsh"
}
```

- [ ] **Step 3: Run the installer script tests**

Run:

```bash
npm test -- tests/install/install-scripts.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run package config validation through typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 5: Commit NSIS milestone**

Run:

```bash
git add package.json scripts/nsis/installer.nsh tests/install/install-scripts.test.ts
git commit -m "build(installer): add startup option and process cleanup"
```

Expected: commit succeeds.

---

### Task 5: Release Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/setup-win11.md`

- [ ] **Step 1: Update README release notes**

Add this section after the existing Windows installer build instructions in `README.md`:

```markdown
## Release From GitHub Actions

Maintainers can publish a Windows installer from GitHub Actions:

1. Open the `Release` workflow in GitHub Actions.
2. Choose `patch`, `minor`, or `major`.
3. Run the workflow.

The workflow increments `package.json` and `package-lock.json`, commits `chore(release): vX.Y.Z`, tags `vX.Y.Z`, builds the unsigned NSIS installer on Windows, and uploads `Codex-Light-Setup-X.Y.Z.exe` to a public GitHub Release.

The installer can optionally create a Startup shortcut. The startup option is visible during install and is unchecked by default.
```

- [ ] **Step 2: Update Win11 setup docs**

Add this section after the setup installer section in `docs/setup-win11.md`:

```markdown
## Release Workflow

Use the GitHub Actions `Release` workflow to publish installers:

- trigger manually;
- choose `patch`, `minor`, or `major`;
- let CI update package versions, run validation, build the NSIS installer, create `vX.Y.Z`, and publish the installer asset.

Installers are unsigned in the current release process, so Windows may show an unknown publisher warning.

During installation, the NSIS setup closes existing Codex Light processes before replacing files. The optional startup checkbox is unchecked by default; selecting it creates a Startup shortcut for the current Windows user.
```

- [ ] **Step 3: Run documentation-adjacent tests**

Run:

```bash
npm test -- tests/install/install-scripts.test.ts tests/packaging/release-workflow.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit documentation milestone**

Run:

```bash
git add README.md docs/setup-win11.md
git commit -m "docs(release): document release workflow"
```

Expected: commit succeeds.

---

### Task 6: Final Verification

**Files:**
- No source edits unless verification exposes a defect.

- [ ] **Step 1: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: all test files pass, including `tests/packaging/release-workflow.test.ts` and `tests/install/install-scripts.test.ts`.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: exit code 0.

- [ ] **Step 4: Run Windows packaging when available**

Run:

```bash
npm run package:win
```

Expected on Windows runner: exit code 0 and installer at `dist/Codex-Light-Setup-<version>.exe`.

Expected in Linux or WSL without Windows packaging tools: if electron-builder fails because Windows NSIS tooling is unavailable, record the exact error in the final report and rely on the GitHub Actions Windows runner for installer packaging.

- [ ] **Step 5: Inspect final history**

Run:

```bash
git status --short
git log --oneline -4
```

Expected: only intentional changes are present; if all tasks committed, `git status --short` is empty.

---

## Self-Review Notes

- Spec coverage: workflow dispatch, version choices, version file commit, tag creation, installer build, GitHub Release upload, old process shutdown, startup checkbox, and unsigned release acceptance are covered by Tasks 1-5.
- Placeholder scan: this plan uses no deferred implementation placeholders.
- Type consistency: workflow test strings match the workflow commands; NSIS test strings match the proposed include file; package config path is `build.nsis.include`.
