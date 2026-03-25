import type { AgentEvent } from '../../shared/types/domain/agent-event';
import { createAuditEntry } from '../../shared/types/domain/audit-entry';
import type { AgentBackend, AgentSessionConfig } from '../../shared/types/ports/agent-backend';
import type { AuditRepository } from '../../shared/types/ports/audit-repository';

/**
 * ClaudeSdkBackend — the ONLY file that imports @anthropic-ai/claude-agent-sdk.
 * Anti-corruption layer: maps SDK messages → domain AgentEvent types.
 * When SDK is not installed, yields a helpful error event.
 */
export class ClaudeSdkBackend implements AgentBackend {
  private _cancelled = false;

  constructor(
    private readonly auditRepo: AuditRepository,
    private readonly getApiKey: () => string | null,
  ) {}

  async *startSession(config: AgentSessionConfig): AsyncIterable<AgentEvent> {
    this._cancelled = false;
    const apiKey = this.getApiKey();
    if (apiKey === null) {
      yield {
        type: 'error',
        userMessage: 'No API key configured. Please set up your API key first.',
        recoveryOptions: [
          { label: 'Set up API key', action: 'setup-key', description: 'Go to API key setup' },
        ],
      };
      return;
    }

    // Attempt to load SDK dynamically
    let sdk: unknown;
    try {
      // @ts-expect-error -- SDK may not be installed yet
      sdk = await import('@anthropic-ai/claude-agent-sdk');
    } catch {
      yield {
        type: 'text',
        content:
          "The Claude Agent SDK is not yet installed. I'm running in demo mode — I can show you how things work, but I can't execute real agent actions yet.",
      };
      yield { type: 'complete', summary: 'Demo mode — SDK not available' };
      return;
    }

    // SDK is available — create session and stream events
    yield* this.runSdkSession(sdk, config);
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- will be async when SDK is wired
  async *sendMessage(sessionId: string, message: string): AsyncIterable<AgentEvent> {
    this._cancelled = false;
    this.auditRepo.append(createAuditEntry(sessionId, 'user:message', 'success', message));
    yield { type: 'text', content: `Processing: ${message}` };
    yield { type: 'complete', summary: 'Message processed' };
  }

  cancelCurrentAction(): void {
    this._cancelled = true;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- will be async when SDK is wired
  async *resumeSession(_sessionId: string): AsyncIterable<AgentEvent> {
    this._cancelled = false;
    yield { type: 'text', content: 'Resuming session...' };
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- will be async when SDK is wired
  private async *runSdkSession(
    _sdk: unknown,
    _config: AgentSessionConfig,
  ): AsyncIterable<AgentEvent> {
    // Real SDK integration will be wired here when package is installed.
    // For now, yield placeholder events that exercise the full pipeline.
    yield { type: 'text', content: 'Connected to Claude. How can I help you today?' };
  }
}
