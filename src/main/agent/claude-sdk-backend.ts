import { classifyError, createUserFriendlyMessage } from '../../shared/types/domain/agent-error';
import type { AgentEvent } from '../../shared/types/domain/agent-event';
import { createAuditEntry } from '../../shared/types/domain/audit-entry';
import type {
  AgentBackend,
  AgentSessionConfig,
  AuthMode,
} from '../../shared/types/ports/agent-backend';
import type { AuditRepository } from '../../shared/types/ports/audit-repository';

/**
 * Subset of the SDK module we actually use.
 * Keeps the rest of the codebase decoupled from the SDK's full surface.
 */
interface SdkModule {
  query(params: { prompt: string; options?: SdkQueryOptions }): SdkQuery;
}

interface SdkQueryOptions {
  abortController?: AbortController | undefined;
  cwd?: string | undefined;
  maxTurns?: number | undefined;
  maxBudgetUsd?: number | undefined;
  allowedTools?: string[] | undefined;
  disallowedTools?: string[] | undefined;
  tools?: string[] | undefined;
  systemPrompt?:
    | string
    | { type: 'preset'; preset: 'claude_code'; append?: string | undefined }
    | undefined;
  permissionMode?: 'default' | 'plan' | undefined;
  persistSession?: boolean | undefined;
  env?: Record<string, string | undefined> | undefined;
  forceLoginMethod?: 'claudeai' | 'console' | undefined;
}

/**
 * SDK query is an AsyncGenerator that yields SDK messages.
 */
interface SdkQuery extends AsyncGenerator<SdkMessage, void> {
  interrupt(): Promise<void>;
}

/**
 * Minimal SDK message types we map from — avoids coupling to SDK internals.
 */
type SdkMessage =
  | SdkAssistantMessage
  | SdkResultSuccess
  | SdkResultError
  | SdkToolUseSummaryMessage
  | SdkToolProgressMessage
  | SdkStatusMessage
  | SdkSystemMessage
  | SdkOtherMessage;

interface SdkAssistantMessage {
  type: 'assistant';
  message: {
    content: SdkContentBlock[];
    stop_reason?: string | null;
  };
  error?: string;
  session_id: string;
}

type SdkContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'thinking'; thinking: string }
  | { type: string };

interface SdkResultSuccess {
  type: 'result';
  subtype: 'success';
  result: string;
  total_cost_usd: number;
  num_turns: number;
  session_id: string;
}

interface SdkResultError {
  type: 'result';
  subtype: string;
  errors?: string[];
  session_id: string;
}

interface SdkToolUseSummaryMessage {
  type: 'tool_use_summary';
  summary: string;
  session_id: string;
}

interface SdkToolProgressMessage {
  type: 'tool_progress';
  tool_name: string;
  session_id: string;
}

interface SdkStatusMessage {
  type: 'system';
  subtype: 'status';
  session_id: string;
}

interface SdkSystemMessage {
  type: 'system';
  subtype: 'init';
  session_id: string;
}

interface SdkOtherMessage {
  type: string;
  session_id?: string;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * ClaudeSdkBackend — the ONLY file that imports @anthropic-ai/claude-agent-sdk.
 * Anti-corruption layer: maps SDK messages → domain AgentEvent types.
 * Maintains per-session conversation history so the agent has full context.
 */
export class ClaudeSdkBackend implements AgentBackend {
  private abortController: AbortController | null = null;
  private activeQuery: SdkQuery | null = null;
  private readonly sessionHistory = new Map<string, ConversationTurn[]>();

  constructor(
    private readonly auditRepo: AuditRepository,
    private readonly getApiKey: () => string | null,
    private readonly getAuthMode: () => AuthMode = () => 'api-key',
  ) {}

  async *startSession(config: AgentSessionConfig): AsyncIterable<AgentEvent> {
    const useSubscription = this.getAuthMode() === 'claude-subscription';

    if (!useSubscription) {
      const apiKey = config.apiKey !== '' ? config.apiKey : this.getApiKey();
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
    }

    const sdk = await this.loadSdk();
    if (sdk === null) {
      yield {
        type: 'text',
        content:
          "The Claude Agent SDK is not yet installed. I'm running in demo mode — I can show you how things work, but I can't execute real agent actions yet.",
      };
      yield { type: 'complete', summary: 'Demo mode — SDK not available' };
      return;
    }

    const apiKey = useSubscription ? null : config.apiKey !== '' ? config.apiKey : this.getApiKey();
    yield* this.runSdkSession(sdk, config, apiKey);
  }

  async *sendMessage(sessionId: string, message: string): AsyncIterable<AgentEvent> {
    // Audit logging is best-effort — don't let it break the conversation
    try {
      this.auditRepo.append(createAuditEntry(sessionId, 'user:message', 'success', message));
    } catch {
      // Audit failure is non-fatal
    }

    // Track user message in conversation history
    const history = this.getOrCreateHistory(sessionId);
    history.push({ role: 'user', content: message });

    const useSubscription = this.getAuthMode() === 'claude-subscription';

    if (!useSubscription) {
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
    }

    const sdk = await this.loadSdk();
    if (sdk === null) {
      yield {
        type: 'error',
        userMessage: 'The Claude Agent SDK is not available.',
        recoveryOptions: [],
      };
      return;
    }

    const apiKey = useSubscription ? null : this.getApiKey();
    yield* this.runSdkTurn(sdk, apiKey, sessionId, message);
  }

  cancelCurrentAction(): void {
    this.abortController?.abort();
    // Fire-and-forget interrupt on the active query
    this.activeQuery?.interrupt().catch(() => {});
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- will be async when resume uses SDK
  async *resumeSession(sessionId: string): AsyncIterable<AgentEvent> {
    const history = this.sessionHistory.get(sessionId);
    const turnCount = history?.length ?? 0;
    yield {
      type: 'text',
      content:
        turnCount > 0
          ? `Resuming session with ${String(turnCount)} previous messages. Where were we?`
          : 'Resuming session...',
    };
  }

  private async loadSdk(): Promise<SdkModule | null> {
    try {
      return (await import('@anthropic-ai/claude-agent-sdk')) as SdkModule;
    } catch {
      return null;
    }
  }

  private getOrCreateHistory(sessionId: string): ConversationTurn[] {
    let history = this.sessionHistory.get(sessionId);
    if (history === undefined) {
      history = [];
      this.sessionHistory.set(sessionId, history);
    }
    return history;
  }

  private buildSdkEnv(apiKey: string | null): Record<string, string | undefined> {
    const env = { ...process.env };
    if (apiKey !== null) {
      env.ANTHROPIC_API_KEY = apiKey;
    }
    return env;
  }

  private buildSdkOptions(
    apiKey: string | null,
    overrides: Partial<SdkQueryOptions> = {},
  ): SdkQueryOptions {
    const opts: SdkQueryOptions = {
      abortController: this.abortController ?? undefined,
      persistSession: false,
      env: this.buildSdkEnv(apiKey),
      // Default to conversational mode — no autonomous tool use
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append:
          'You are a helpful conversational assistant inside the TalkTerm desktop app. ' +
          'IMPORTANT: Do NOT use tools, create files, run commands, or take any actions ' +
          'unless the user explicitly asks you to. Ask clarifying questions instead of ' +
          'assuming intent. Keep responses conversational and concise.',
      },
      permissionMode: 'plan',
      ...overrides,
    };
    if (this.getAuthMode() === 'claude-subscription') {
      opts.forceLoginMethod = 'claudeai';
    }
    return opts;
  }

  private async *runSdkSession(
    sdk: SdkModule,
    config: AgentSessionConfig,
    apiKey: string | null,
  ): AsyncIterable<AgentEvent> {
    this.abortController = new AbortController();

    const queryObj = sdk.query({
      prompt: 'Hello — I just opened a new session. Please introduce yourself briefly.',
      options: this.buildSdkOptions(apiKey, {
        cwd: config.workspacePath,
        maxTurns: config.maxTurns ?? 3,
        maxBudgetUsd: config.maxBudgetUsd,
        allowedTools: [],
      }),
    });

    this.activeQuery = queryObj;
    yield* this.consumeSdkStream(queryObj, 'session-init');
    this.activeQuery = null;
  }

  private async *runSdkTurn(
    sdk: SdkModule,
    apiKey: string | null,
    sessionId: string,
    message: string,
  ): AsyncIterable<AgentEvent> {
    this.abortController = new AbortController();

    const queryObj = sdk.query({
      prompt: message,
      options: this.buildSdkOptions(apiKey, {
        maxTurns: 3,
      }),
    });

    this.activeQuery = queryObj;
    yield* this.consumeSdkStream(queryObj, sessionId);
    this.activeQuery = null;
  }

  /**
   * Consume the SDK's async generator and map each message to domain AgentEvents.
   * This is the anti-corruption layer boundary.
   */
  private async *consumeSdkStream(
    queryStream: AsyncGenerator<SdkMessage, void>,
    sessionId: string,
  ): AsyncIterable<AgentEvent> {
    try {
      for await (const msg of queryStream) {
        if (this.abortController?.signal.aborted === true) {
          yield { type: 'complete', summary: 'Cancelled by user' };
          return;
        }

        const events = this.mapSdkMessage(msg, sessionId);
        for (const event of events) {
          yield event;
        }
      }
    } catch (err: unknown) {
      console.error('[ClaudeSdkBackend] SDK error:', err instanceof Error ? err.message : err);
      const category = classifyError(err);
      yield {
        type: 'error',
        userMessage: createUserFriendlyMessage(category),
        recoveryOptions: [
          { label: 'Try again', action: 'retry', description: 'Retry the last action' },
        ],
      };
    }
  }

  /**
   * Map a single SDK message to zero or more domain AgentEvents.
   * SDK types stay on this side of the boundary — only AgentEvents cross out.
   */
  private mapSdkMessage(msg: SdkMessage, sessionId: string): AgentEvent[] {
    const events: AgentEvent[] = [];

    switch (msg.type) {
      case 'assistant': {
        const assistantMsg = msg as SdkAssistantMessage;

        if (assistantMsg.error !== undefined) {
          events.push({
            type: 'error',
            userMessage: 'Something unexpected happened. Let me try a different approach.',
            recoveryOptions: [
              { label: 'Try again', action: 'retry', description: 'Retry the last action' },
            ],
          });
          break;
        }

        for (const block of assistantMsg.message.content) {
          if (block.type === 'text') {
            const textBlock = block as { type: 'text'; text: string };
            if (textBlock.text.trim() !== '') {
              events.push({ type: 'text', content: textBlock.text });

              // Track assistant response in history
              const history = this.getOrCreateHistory(sessionId);
              history.push({ role: 'assistant', content: textBlock.text });

              // Audit assistant response
              try {
                this.auditRepo.append(
                  createAuditEntry(sessionId, 'agent:response', 'success', textBlock.text),
                );
              } catch {
                // Audit failure is non-fatal
              }
            }
          } else if (block.type === 'tool_use') {
            const toolBlock = block as {
              type: 'tool_use';
              name: string;
              input: Record<string, unknown>;
            };
            events.push({
              type: 'tool-call',
              toolName: toolBlock.name,
              toolInput: toolBlock.input,
            });
          }
        }
        break;
      }

      case 'result': {
        const resultMsg = msg as SdkResultSuccess | SdkResultError;
        if (resultMsg.subtype === 'success') {
          const success = resultMsg as SdkResultSuccess;
          events.push({
            type: 'complete',
            summary: success.result !== '' ? success.result : 'Task completed',
          });
        } else {
          const error = resultMsg as SdkResultError;
          const errorDetail = error.errors?.join('; ') ?? 'An error occurred';
          events.push({
            type: 'error',
            userMessage: 'Something went wrong, but we can work through it.',
            recoveryOptions: [{ label: 'Try again', action: 'retry', description: errorDetail }],
          });
        }
        break;
      }

      case 'tool_use_summary': {
        const summary = msg as SdkToolUseSummaryMessage;
        events.push({
          type: 'progress',
          step: summary.summary,
          status: 'completed',
        });
        break;
      }

      case 'tool_progress': {
        const progress = msg as SdkToolProgressMessage;
        events.push({
          type: 'progress',
          step: `Running ${progress.tool_name}...`,
          status: 'in-progress',
        });
        break;
      }

      // system init, status, and other message types we don't need to surface
      default:
        break;
    }

    return events;
  }
}
