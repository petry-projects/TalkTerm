import type { AgentEvent } from '../domain/agent-event';

export interface AgentSessionConfig {
  workspacePath: string;
  apiKey: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
}

export interface AgentBackend {
  startSession(config: AgentSessionConfig): AsyncIterable<AgentEvent> | Iterable<AgentEvent>;
  sendMessage(sessionId: string, message: string): AsyncIterable<AgentEvent> | Iterable<AgentEvent>;
  cancelCurrentAction(): void;
  resumeSession(sessionId: string): AsyncIterable<AgentEvent> | Iterable<AgentEvent>;
}
