import type { AgentEvent } from '../../shared/types/domain/agent-event';
import type { AgentBackend, AgentSessionConfig } from '../../shared/types/ports/agent-backend';

export type AgentEventHandler = (event: AgentEvent) => void;

export class AgentMessageRouter {
  private handler: AgentEventHandler | null = null;

  constructor(private readonly backend: AgentBackend) {}

  onEvent(handler: AgentEventHandler): void {
    this.handler = handler;
  }

  async startSession(config: AgentSessionConfig): Promise<void> {
    for await (const event of this.backend.startSession(config)) {
      this.handler?.(event);
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    for await (const event of this.backend.sendMessage(sessionId, message)) {
      this.handler?.(event);
    }
  }

  cancel(): void {
    this.backend.cancelCurrentAction();
  }

  async resumeSession(sessionId: string): Promise<void> {
    for await (const event of this.backend.resumeSession(sessionId)) {
      this.handler?.(event);
    }
  }
}
