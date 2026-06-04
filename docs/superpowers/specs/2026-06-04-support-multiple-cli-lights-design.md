---
astrolabe_change: support-multiple-cli-lights
role: technical-design
canonical_spec: openspec
archived-with: 2026-06-04-support-multiple-cli-lights
status: final
---

# 多 CLI 红绿灯显示技术设计

## Context

Codex Light 的状态模型已经支持多个会话：`CodexLightSnapshot.sessions` 保存聚合后的 `CodexSession[]`，`activeSessionCount` 保存非 idle 会话数量，`globalState` 保存全局优先级状态。当前 renderer 只取 `snapshot.sessions[0]` 作为 primary session，因此紧凑模式只能显示一个红绿灯，展开模式也只能显示一个会话的详情。

本变更只调整顶部岛展示层，不改变 hook 安装、事件写入、snapshot schema、全局状态优先级或 Electron 主进程同步机制。

## Goals

- 紧凑模式最多显示 10 个 Codex CLI 会话红绿灯。
- 多个 CLI 会话存在时，每个展示中的会话都有自己的状态灯。
- 展开模式显示同一批展示会话的详情，而不是只显示第一个 session。
- 没有活动会话时，展示英文文案 `No active sessions`，不展示中文 idle 文案。
- 保持现有 snapshot 数据结构和主进程 IPC 不变。

## Non-Goals

- 不新增多会话管理面板或完整 dashboard。
- 不改变 `CodexLightSnapshot`、`CodexSession` 或 hook event 的类型结构。
- 不改变 `aggregateSessions` 的状态优先级算法。
- 不在本变更中增加会话关闭、隐藏、固定排序等交互能力。

## Architecture

```text
Hook events
  -> aggregateSessions()
      -> CodexLightSnapshot.sessions[]
          -> renderer App
              -> getDisplaySessions(snapshot.sessions)
                  -> compact: up to 10 per-session traffic lights
                  -> expanded: matching per-session detail rows
```

Renderer 增加一个展示派生层，负责把 snapshot sessions 转成 UI 可展示列表。这个派生层是纯函数，不写回 snapshot，也不影响主进程同步。

## Display Session Derivation

新增 renderer helper，例如：

```ts
const MAX_DISPLAY_SESSIONS = 10;

function getDisplaySessions(sessions: CodexSession[]): CodexSession[] {
  return [...sessions]
    .sort(compareDisplaySessions)
    .slice(0, MAX_DISPLAY_SESSIONS);
}
```

排序规则：

1. active session 优先于 inactive session。
2. `waiting` 优先于 `running`，因为等待用户动作的状态最需要露出。
3. 其余 session 按 `updatedAt` 倒序。
4. 时间无效时降级为 `0`，避免排序抛错。
5. 完全同权重时按 `sessionId` 排序，保证渲染稳定。

Active session 判断沿用现有语义：`state !== 'idle'`。这样与 `activeSessionCount` 保持一致，避免 UI 和聚合层对“活动”的定义分裂。

## Compact UI

紧凑模式从单个 `.status-dot` 改为状态灯组：

- 每个展示会话渲染一个 traffic-light indicator。
- indicator class 包含该 session 的 state，例如 `session-light state-running`。
- indicator 需要有可访问 label 或 `title`，包含项目名或 session id 和状态。
- 紧凑岛仍保留短 label：优先显示第一个展示会话的项目名；没有会话时显示 `No active sessions`。
- 多会话 count 可以继续显示 active session count，但 count 不能替代多个红绿灯。

全局 `.island state-*` class 保留，用于现有外壳颜色、阴影和兼容测试。单个 session 的灯色由 per-session class 决定。

## Expanded UI

展开模式使用 `displaySessions` 渲染多个 `.session` article：

- 空列表：显示 `No active sessions`。
- 非空：每个展示会话一条详情。
- 每条详情包含 session title、state、action、model、cwd、elapsed、source。
- 继续使用现有 fallback copy 处理缺失 action/model/cwd/elapsed。
- 展开列表最多 10 条，与紧凑模式显示的 session 集合一致。

为避免 10 个详情项撑爆 overlay，样式应使用有界布局：

- details 区域设置最大高度。
- 多条详情使用垂直列表和内部滚动。
- cwd、action 等长文本继续 ellipsis 或 wrapping，不能挤压状态灯组。

## Copy And Language

用户明确要求 no-session copy 不需要中文，因此本变更把可见 idle 文案固定为英文 `No active sessions`。即使 overlay language 当前是 `zh-CN`，没有会话时也不展示 `暂无活动会话`。

其他 metadata fallback 是否继续按现有语言设置展示，不在本变更中强制改动。实现可以保留当前 `COPY` 结构，但 idle visible copy 必须满足 OpenSpec delta spec。

## Testing Strategy

优先增加 renderer 层测试，覆盖行为而不是截图细节：

1. Empty state
   - 渲染空 snapshot。
   - 断言页面显示 `No active sessions`。
   - 断言不显示 `暂无活动会话`。

2. Compact multi-light
   - 构造 3 个 CLI session，状态分别为 `running`、`waiting`、`completed`。
   - 断言紧凑 UI 有 3 个 per-session light。
   - 断言每个 light 有对应 state class 或可访问状态。

3. Expanded multi-session details
   - 使用 `initialExpanded: true`。
   - 断言多个 session title/action/model/cwd 可见。

4. Ten-session cap
   - 构造 12 个 session。
   - 断言只渲染 10 个 compact light。
   - 断言 active/recent sessions 优先展示。

5. Visual coverage
   - 更新 `tests/visual/island.spec.ts` 中的 fixture，覆盖空状态、多会话状态和 10 会话状态。
   - 截图检查重点是非空白、文本不重叠、灯组不溢出。

最低验证命令：

```bash
npm test -- tests/renderer/App.test.tsx
npm test -- tests/visual/island.spec.ts
npm run typecheck
```

最终验证命令：

```bash
npm test
npm run lint
npm run build
```

## Risks And Mitigations

- **Risk:** 紧凑模式显示 10 个灯后宽度过大。
  **Mitigation:** 使用固定尺寸灯点、紧凑 gap、最大宽度和 ellipsis；展开详情放入有界滚动区。

- **Risk:** UI count 与实际显示灯数混淆。
  **Mitigation:** count 保留 active session count；灯组只表示最多 10 个展示会话。超过 10 个时可在 title 或 expanded summary 中体现被截断情况，但不是本变更的必要交互。

- **Risk:** 修改排序影响用户对“第一个会话”的预期。
  **Mitigation:** 明确按 active/waiting/recent 排序，并用稳定 tie-breaker。这个排序只影响展示列表，不改变 snapshot。

- **Risk:** 中文语言设置下 idle copy 变化显得不一致。
  **Mitigation:** 用户明确要求 no-session copy 不需要中文，本变更只固定 idle visible copy，其他 labels 保持现状。
