## Why

Codex Light 当前顶部岛的展示密度、窗口位置和尺寸都是固定的，紧凑模式仍暴露过多状态文本，展开模式也没有完整呈现工具名、模型、cwd 和耗时等排障信息。用户需要在完成状态准确性和稳定性工作之后，能够按自己的桌面布局调整岛的位置、透明度、尺寸和开机启动行为。

## What Changes

- 调整岛的两种展示密度：
  - 紧凑模式只显示状态灯和项目名，保留多会话数量提示。
  - 展开模式显示工具名、模型、cwd、耗时和会话来源等详情。
- 增加可持久化的 UI 偏好：
  - 顶部居中、顶部左侧、顶部右侧位置。
  - 目标显示器选择，默认跟随主显示器。
  - 透明度和尺寸设置。
- 增加设置入口，不把复杂设置塞进红绿灯本体。
- 增加开机启动设置，与 Windows/Electron 登录启动状态保持一致。
- 明确实施优先级：本变更只在稳定性和状态准确性工作之后进入实现。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `top-island-overlay`: add compact/expanded presentation rules, configurable top alignment, display selection, opacity, and size behavior.
- `win11-app-operations`: add settings access and app startup configuration behavior.

## Impact

- Renderer UI: `src/renderer/App.tsx` and styles for compact/expanded island metadata layout.
- Main process window management: `src/main/main.ts` for display enumeration, overlay bounds, opacity, size, and settings application.
- Preload/IPC contract: `src/main/preload.ts` and `src/main/ipc-types.ts` for settings read/write and display/startup controls.
- Settings persistence: likely a small main-process settings module under `src/main/`.
- Tests: renderer behavior, settings validation/persistence, window bounds calculations, and startup-setting integration tests.
