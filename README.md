# Codex Light

[English](README.en.md)

Codex Light 是一个非官方的 Win11 顶部小岛状态灯，用于显示 Codex CLI hooks 以及 Codex Desktop 进程兜底检测状态。

它会在 Windows 桌面顶部放置一个紧凑、置顶的状态岛，把 Codex 活动转换成可见的红绿灯状态。

## 状态映射

| Codex 事件 | 状态 | 灯色 |
| --- | --- | --- |
| `SessionStart` | idle | red |
| `UserPromptSubmit` | running | green |
| `PreToolUse` | running | green |
| 需要审批的 `PreToolUse` | waiting | yellow |
| `PermissionRequest` | waiting | yellow |
| `PostToolUse` | running | green |
| `Stop` / `SessionEnd` / `SubagentStop` | completed | red |
| `HookError` | error | red |

Codex CLI 路径基于 hooks，状态更精确。Codex Desktop 兜底路径基于进程检测，只能表示匹配的桌面进程是否存在。
当前 hook 安装器会注册 `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PermissionRequest`、`PostToolUse` 和 `Stop`；如果收到 `SessionEnd`、`SubagentStop` 或 `HookError`，状态归一化逻辑也能识别。

## 要求

- Windows 11，用于运行桌面应用。
- Node.js 22+，用于开发和 hook CLI 执行。
- Codex CLI 已在需要安装 hooks 的环境中配置好。
- 如果从 WSL 使用，Windows runtime 目录需要能通过 `/mnt/c/...` 访问。

## 构建

```bash
npm install
npm run build
```

创建未打包安装器的 Windows 目录构建：

```bash
npm run package:win:dir
```

生成的应用位于：

```text
dist/win-unpacked/Codex Light.exe
```

## 在 Win11 上安装

普通桌面使用建议安装生成的 setup 可执行文件：

```text
dist/Codex-Light-Setup-0.1.0.exe
```

setup 安装器会在替换文件前关闭已有 Codex Light 进程，创建桌面和开始菜单快捷方式，并可在安装完成后启动 Codex Light。
安装器还会显示可选的开机启动选项。全新安装时默认不勾选；升级时会保留已有 Startup 快捷方式；卸载时会移除 Startup 快捷方式。

构建 setup 可执行文件：

```bash
npm run package:win
```

如果你在 WSL/Linux 中工作，而 NSIS 打包需要 Windows 可执行文件工具，请在 Win11 上构建安装器。开发安装可以使用下面的 PowerShell 脚本。

## 从 GitHub Actions 发布

维护者可以通过手动触发 GitHub Actions 的 `Release` workflow 发布 Windows 安装器。
选择 `patch`、`minor` 或 `major` 后，workflow 会验证项目，在 `windows-latest` 上执行 `npm run package:win`，提交版本递增，创建 `vX.Y.Z` tag，并把 `Codex-Light-Setup-X.Y.Z.exe` 上传到 GitHub Release。

发布检查清单和安装器行为细节见 [docs/release.md](docs/release.md)。

## Win11 开发脚本安装

在本仓库的 Windows PowerShell 中运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1
```

常用参数：

```powershell
# 复用已有 dist\win-unpacked 构建。
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -SkipBuild

# 安装后设置 Codex Light 随 Windows 启动。
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -StartOnLogin

# 安装后不启动应用。
powershell -ExecutionPolicy Bypass -File scripts\install-win11.ps1 -NoLaunch
```

脚本会把应用复制到：

```text
%LOCALAPPDATA%\Programs\CodexLight
```

同时创建桌面和开始菜单快捷方式。

## 在 Win11 上运行

启动打包后的应用：

```text
Codex Light.exe
```

runtime 状态保存在：

```text
%LOCALAPPDATA%\CodexLight
```

关键文件：

- `state.json` - 当前聚合状态。
- `events.jsonl` - 追加写入的 hook 事件日志。

## 从 WSL Ubuntu 连接 Codex CLI

在 WSL 中的项目目录运行：

```bash
bash scripts/install-wsl-hooks.sh
```

常用参数：

```bash
bash scripts/install-wsl-hooks.sh --windows-user <WindowsUser>
bash scripts/install-wsl-hooks.sh --no-build
bash scripts/install-wsl-hooks.sh --no-test-event
```

等价的手动步骤：

```bash
npm install
npm run build

export CODEX_LIGHT_HOME="/mnt/c/Users/<WindowsUser>/AppData/Local/CodexLight"
mkdir -p "$CODEX_LIGHT_HOME"

HOOK_CLI="$(pwd)/dist/hook-cli/index.js"

node "$HOOK_CLI" install-hooks \
  --hook-command "CODEX_LIGHT_HOME=\"$CODEX_LIGHT_HOME\" node \"$HOOK_CLI\" hook"
```

验证连接：

```bash
CODEX_LIGHT_HOME="$CODEX_LIGHT_HOME" node "$HOOK_CLI" doctor \
  --hook-executable "$(command -v node)"
```

关键字段应为：

```json
{
  "runtimeWritable": true,
  "hooksExists": true,
  "hookExecutableExists": true
}
```

手动发送测试事件：

```bash
printf '{"hook_event_name":"UserPromptSubmit","session_id":"test-1","cwd":"%s","model":"gpt-5.5"}' "$PWD" \
  | CODEX_LIGHT_HOME="$CODEX_LIGHT_HOME" node "$HOOK_CLI" hook
```

Win11 顶部小岛应切换为绿色 running 状态。

## 从 Win11 卸载

在 Windows PowerShell 中运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-win11.ps1
```

runtime 状态默认保留。如需一并删除：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-win11.ps1 -RemoveRuntime
```

## CLI 命令

```bash
node dist/hook-cli/index.js hook
node dist/hook-cli/index.js install-hooks
node dist/hook-cli/index.js doctor
```

## 开发

```bash
npm run lint
npm run typecheck
npm test
npm run test:visual
```

以开发模式运行 Electron：

```bash
npm run dev:electron
```

## 说明

- 本项目与 OpenAI 无隶属关系，也不代表 OpenAI 官方认可。
- Windows 桌面应用使用文件监听和轮询结合的方式，因此 hooks 从 WSL 写入 Windows 文件系统时，状态更新仍然可靠。
- 打包后的 renderer 资源使用相对路径，因此应用可以从 `file://.../app.asar/...` 正常运行。

## 许可证

MIT。见 [LICENSE](LICENSE)。
