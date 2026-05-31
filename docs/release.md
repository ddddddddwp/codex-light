# Release Process

Codex Light releases are published from the GitHub Actions workflow named
`Release`. The workflow is started manually with `workflow_dispatch`.

Maintainers choose one version input:

- `patch`
- `minor`
- `major`

The workflow bumps `package.json` and `package-lock.json`, validates the
release, builds the Windows installer with `npm run package:win`, verifies the
installer asset exists, then commits `chore(release): vX.Y.Z` to `main`, tags
`vX.Y.Z`, pushes the release commit and tag, and publishes a GitHub Release
containing:

```text
dist/Codex-Light-Setup-X.Y.Z.exe
```

Before publishing, the workflow validates the release with:

```bash
npm run typecheck
npm test
npm run lint
npm run package:win
```

## Installer Behavior

The Windows installer closes any existing Codex Light process before replacing
files.

During install, the startup (开机启动) option is shown and defaults unchecked for
a fresh install. On upgrade, an existing startup shortcut is preserved. Uninstall
removes the startup shortcut. Silent upgrades preserve an existing startup
shortcut unless a later interactive install explicitly leaves the startup option
unchecked.

## Local Packaging

Local Windows installer generation from WSL/Linux may need `wine` because
electron-builder uses Windows executable tooling for NSIS packaging. The release
workflow runs on GitHub's `windows-latest` runner.

## Automatic Updates

Automatic updates (自动更新, auto updates) are intentionally deferred. Releases are
currently distributed through manually triggered GitHub Release installer assets.
