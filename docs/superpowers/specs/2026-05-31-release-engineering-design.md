# Release Engineering Design

## Context

Codex Light currently builds an unsigned Windows NSIS installer through `npm run package:win`, but releases are manual. The project needs a repeatable release path that increments versions, builds the installer, publishes a GitHub Release, and improves installer behavior without adding auto-update yet.

## Goals

- Provide a manually triggered GitHub Actions release workflow.
- Let the release operator choose `patch`, `minor`, or `major`.
- Automatically update `package.json` and `package-lock.json`.
- Commit the version bump to `main` as `chore(release): vX.Y.Z`.
- Create a matching `vX.Y.Z` tag.
- Build the Windows NSIS installer on a Windows runner.
- Publish a non-draft, non-prerelease GitHub Release and upload the installer.
- Make the NSIS installer close old Codex Light processes before install.
- Add an optional, unchecked-by-default startup option to the NSIS installer.

## Non-Goals

- Automatic app updates.
- Code signing.
- Draft or prerelease release modes.
- Automatic release on every push to `main`.
- Changing runtime data retention during uninstall.

## Proposed Workflow

Add a GitHub Actions workflow, likely `.github/workflows/release.yml`, with `workflow_dispatch` input:

- `version`: one of `patch`, `minor`, `major`.

The workflow runs with repository write permissions and performs these steps:

1. Checkout `main` with full history.
2. Configure Git author for the workflow.
3. Install Node dependencies with `npm ci`.
4. Run `npm version <level> --no-git-tag-version`.
5. Read the new version from `package.json`.
6. Run validation: typecheck, tests, lint.
7. Commit `package.json` and `package-lock.json` with `chore(release): vX.Y.Z`.
8. Create tag `vX.Y.Z`.
9. Build the NSIS installer with `npm run package:win`.
10. Push the release commit and tag.
11. Create a public GitHub Release for `vX.Y.Z`.
12. Upload `Codex-Light-Setup-X.Y.Z.exe`.

The workflow should fail before pushing if validation or packaging fails. The release commit and tag should only be pushed after a successful installer build, so the repository does not publish a version that cannot be packaged.

## Installer Behavior

Use electron-builder NSIS customization to add installer behavior that is not expressible in the current `package.json` config alone.

The installer should:

- close existing `Codex Light` processes before installing files;
- present an optional startup checkbox that is unchecked by default;
- create a Startup shortcut only when the user selects that option;
- preserve runtime data under `%LOCALAPPDATA%\CodexLight` on uninstall.

The existing PowerShell developer installer already supports stopping old processes and `-StartOnLogin`; this work aligns the distributable NSIS installer with that behavior.

## Data Flow

```text
manual workflow input
  -> npm version
  -> package.json/package-lock.json
  -> validation
  -> NSIS installer
  -> release commit + tag
  -> GitHub Release asset
```

For installation:

```text
NSIS installer starts
  -> terminate old Codex Light process
  -> install files
  -> optionally create Startup shortcut
  -> optionally launch app after install
```

## Error Handling

- If `npm version` fails, stop before any commit.
- If validation fails, stop before commit/tag/publish.
- If packaging fails, stop before commit/tag/publish.
- If tag `vX.Y.Z` already exists, fail clearly rather than overwriting it.
- If release asset upload fails after tag push, rerunning the workflow should fail on the existing tag; manual recovery can delete the failed release/tag or upload the asset separately.

## Testing Strategy

- Add automated checks for release workflow shape where practical, such as verifying the workflow file contains `workflow_dispatch`, version choices, package validation, package build, tag creation, and release upload.
- Add packaging/config tests that verify NSIS customization files are included by electron-builder config.
- Existing validation commands remain required in the release workflow:
  - `npm run typecheck`
  - `npm test`
  - `npm run lint`
  - `npm run package:win`

## Open Decisions

All current product decisions are resolved:

- release trigger: manual workflow;
- version bump: operator chooses `patch`, `minor`, or `major`;
- version files: commit back to `main`;
- release visibility: public final release;
- startup option: visible but unchecked by default;
- signing: unsigned for now.
