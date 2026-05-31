#!/usr/bin/env bash
set -euo pipefail

build=1
run_test_event=1
windows_user="${WINDOWS_USER:-}"
runtime_dir="${CODEX_LIGHT_HOME:-}"

usage() {
  cat <<'EOF'
Usage: bash scripts/install-wsl-hooks.sh [options]

Options:
  --windows-user USER   Windows user name under /mnt/c/Users.
  --runtime-dir DIR     Windows-readable Codex Light runtime directory.
  --no-build            Do not run npm install/build before installing hooks.
  --no-test-event       Do not emit a manual UserPromptSubmit test event.
  -h, --help            Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --windows-user)
      windows_user="${2:-}"
      shift 2
      ;;
    --runtime-dir)
      runtime_dir="${2:-}"
      shift 2
      ;;
    --no-build)
      build=0
      shift
      ;;
    --no-test-event)
      run_test_event=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

log() {
  printf '[Codex Light] %s\n' "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' was not found in PATH." >&2
    exit 1
  fi
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
hook_cli="$repo_root/dist/hook-cli/index.js"

require_command node
node_path="$(command -v node)"

if [[ -z "$windows_user" ]]; then
  if command -v powershell.exe >/dev/null 2>&1; then
    windows_user="$(powershell.exe -NoProfile -Command '$env:USERNAME' | tr -d '\r' | tail -n 1)"
  fi
fi

if [[ -z "$runtime_dir" ]]; then
  if [[ -z "$windows_user" ]]; then
    echo 'Could not detect Windows user. Pass --windows-user USER or set CODEX_LIGHT_HOME.' >&2
    exit 1
  fi
  runtime_dir="/mnt/c/Users/$windows_user/AppData/Local/CodexLight"
fi

if [[ "$runtime_dir" != /mnt/* ]]; then
  log "Runtime directory is not under /mnt; continuing with: $runtime_dir"
fi

log "Repository: $repo_root"
log "Runtime directory: $runtime_dir"
mkdir -p "$runtime_dir"

if [[ "$build" -eq 1 ]]; then
  require_command npm
  log 'Building hook CLI with npm install && npm run build'
  (
    cd "$repo_root"
    npm install
    npm run build
  )
fi

if [[ ! -f "$hook_cli" ]]; then
  echo "Hook CLI not found: $hook_cli. Run without --no-build or run npm run build first." >&2
  exit 1
fi

hook_command="CODEX_LIGHT_HOME=\"$runtime_dir\" \"$node_path\" \"$hook_cli\" hook"

log 'Installing Codex CLI hooks'
"$node_path" "$hook_cli" install-hooks --hook-command "$hook_command"

log 'Running doctor'
CODEX_LIGHT_HOME="$runtime_dir" "$node_path" "$hook_cli" doctor --hook-executable "$node_path"

if [[ "$run_test_event" -eq 1 ]]; then
  log 'Writing manual UserPromptSubmit test event'
  printf '{"hook_event_name":"UserPromptSubmit","session_id":"install-test","cwd":"%s","model":"gpt-5.5"}' "$repo_root" \
    | CODEX_LIGHT_HOME="$runtime_dir" "$node_path" "$hook_cli" hook
fi

cat <<EOF

Codex Light WSL hooks installed successfully.
Runtime: $runtime_dir
Hooks: ~/.codex/hooks.json
Hook command: $hook_command
EOF
