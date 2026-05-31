---
astrolabe_change: enhance-island-ui-settings
role: technical-design
canonical_spec: openspec
---

# UI 表现增强技术设计

## Context

Codex Light 当前只有一个透明、置顶的 Electron overlay。主进程在 `src/main/main.ts` 里用固定 `COMPACT` 和 `EXPANDED` 尺寸创建窗口，并始终定位到主显示器顶部居中；renderer 通过 `src/renderer/App.tsx` 在 hover/click 时展示更多会话信息；preload 只暴露 `onSnapshot` 和 `setPinnedExpanded` 两个接口。

本设计只定义 UI 表现增强和排期，不改变状态摄取、hook 归一化或红绿灯准确性逻辑。实现顺序必须排在稳定性和状态准确性工作之后。

## Goals

- 紧凑模式只显示状态灯、项目名和多会话数量。
- 展开模式显示工具名或动作、模型、cwd、耗时、来源和会话数量。
- 位置支持顶部居中、顶部左侧、顶部右侧。
- 显示器支持默认主显示器和用户选择的目标显示器。
- 透明度、尺寸和开机启动可以从独立设置面板调整并持久化。
- 设置入口从托盘或后台控制打开，不塞进红绿灯岛。

## Non-Goals

- 不做诊断面板。
- 不做自动更新。
- 不做任意拖拽定位。
- 不重写状态优先级、hook ingestion 或 WSL 接入逻辑。

## Architecture

```text
Tray
  -> opens settings window
      -> preload IPC
          -> main settings service
              -> userData JSON
              -> BrowserWindow bounds / opacity / startup

Snapshot stream
  -> renderer App
      -> compact: dot + project + count
      -> expanded: action/tool + model + cwd + elapsed + source
```

主进程继续拥有窗口和系统能力：显示器枚举、窗口定位、透明度、尺寸、开机启动和设置持久化。renderer 只负责展示当前 snapshot 和设置界面。preload 作为 typed IPC 边界，避免 renderer 直接接触 Electron 主进程 API。

## Design Decisions

### Dedicated Settings Surface

采用独立设置面板，由托盘菜单打开。红绿灯岛保留为状态显示面，不承载复杂控件。

原因：紧凑岛需要保持低干扰和可快速扫描；展开岛需要给 cwd、model、tool 和 elapsed time 留空间。如果把位置、显示器、透明度、尺寸、开机启动全部塞进展开岛，会让状态显示和设置控制互相干扰。

### Main-Owned Settings

新增主进程 settings module，保存 typed settings 到 `app.getPath('userData')` 下的 JSON 文件。主进程负责 defaults、validation、clamping 和 migration。

原因：窗口 bounds、显示器选择和启动项都属于主进程能力。把设置放在 renderer localStorage 会导致启动早期定位、显示器 fallback 和 startup 状态读取变得不可靠。

### Pure Bounds Helper

把窗口定位抽成纯函数，输入为 display workArea、mode size、alignment、size scale，输出 BrowserWindow bounds。

原因：现在 `positionOverlay` 直接读主显示器并写窗口，难以覆盖多显示器和对齐规则。纯函数可以用单元测试覆盖顶部居中、顶部左、顶部右、显示器缺失 fallback 和尺寸缩放。

### Renderer-Derived Elapsed Time

耗时由 renderer 根据 session 的 `startedAt`、`updatedAt` 和当前时间计算。运行中 session 用 now，完成状态用 `updatedAt`。

原因：elapsed 是展示派生值，不需要写入 snapshot，避免污染状态摄取数据结构。

### Startup as App Preference

设置面板显示和修改当前 app-level startup 状态。既有 NSIS 安装器的开机启动选项保留为安装时初始选择，安装后以 app 设置为准。

原因：用户需要安装后也能打开或关闭开机启动。实现可以用 Electron login item 或 Windows 兼容 adapter，但 UI 和 spec 只暴露一个稳定偏好。

## Implementation Order

1. 稳定性 gate：确认红绿灯状态准确性、WSL hook 旧状态问题和基础验证命令已经稳定。
2. Settings model + IPC：定义 settings 类型、默认值、持久化、validation、preload API。
3. Overlay positioning：抽 bounds helper，支持 display/alignment/size/opacity，接入 display topology 变化。
4. Island presentation：调整 compact/expanded 信息层级和 elapsed time。
5. Settings surface：托盘打开设置面板，提供 display、position、opacity、size、startup 控件。
6. Startup adapter：读写 Windows 登录启动状态，并处理 dev/installed 差异。
7. Verification：补单元测试、renderer 测试、视觉检查，跑 typecheck/test/lint。

## Risks

- 显示器 ID 变化：目标显示器不存在时回退主显示器，但保留用户保存值。
- 透明度过低：限制最小值，保证状态灯和项目名可读。
- 尺寸过小：限制 size range，并对 cwd/model/tool 使用 ellipsis。
- Startup 在 dev/portable/installed 环境差异：用 adapter 包装并在不可用时给出稳定状态，不让设置面板崩溃。
- hover/click 展开交互冲突：本变更不扩大交互模型，只把 settings 和 expansion 状态分离。

## Test Strategy

- Settings defaults, validation, persistence, migration。
- Bounds helper 覆盖三种 alignment、多显示器、fallback、size scale。
- Renderer 测试 compact 不显示状态标签/模型/cwd，expanded 显示 tool/model/cwd/elapsed/source。
- Startup adapter 用可注入依赖测试 enable/disable/read。
- 视觉检查覆盖 compact 和 expanded 的主要状态，确认文本不溢出、不遮挡、不出现空白 overlay。
