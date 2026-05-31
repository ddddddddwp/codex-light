export type CodexLightState = 'idle' | 'running' | 'waiting' | 'completed' | 'error';
export type CodexLightSource = 'cli' | 'desktop' | 'desktop-fallback';

export interface RawCodexHookPayload {
  hook_event_name?: string;
  session_id?: string;
  transcript_path?: string | null;
  cwd?: string;
  model?: string;
  turn_id?: string;
  permission_mode?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  source?: CodexLightSource;
  [key: string]: unknown;
}

export interface CodexLightEvent {
  eventId: string;
  sessionId: string;
  source: CodexLightSource;
  state: CodexLightState;
  hookEventName: string;
  cwd?: string;
  projectName?: string;
  model?: string;
  action?: string;
  turnId?: string;
  fallbackReason?: string;
  createdAt: string;
  raw: RawCodexHookPayload;
}

export interface CodexSession {
  sessionId: string;
  source: CodexLightSource;
  state: CodexLightState;
  cwd?: string;
  projectName?: string;
  model?: string;
  action?: string;
  startedAt: string;
  updatedAt: string;
  turnId?: string;
  fallbackReason?: string;
}

export interface DiagnosticEvent {
  level: 'info' | 'warning' | 'error';
  message: string;
  createdAt: string;
}

export interface CodexLightSnapshot {
  version: 1;
  generatedAt: string;
  globalState: CodexLightState;
  activeSessionCount: number;
  sessions: CodexSession[];
  diagnostics: DiagnosticEvent[];
}
