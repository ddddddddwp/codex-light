import type { CodexLightState } from '../core/types';

export const STATE_LABEL: Record<CodexLightState, string> = {
  idle: '空闲',
  running: '运行中',
  waiting: '等待确认',
  completed: '已结束',
  error: '发生错误'
};
