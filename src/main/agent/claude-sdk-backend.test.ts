/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentEvent } from '../../shared/types/domain/agent-event';
import type { AuditRepository } from '../../shared/types/ports/audit-repository';
import { ClaudeSdkBackend } from './claude-sdk-backend';

function createMockAuditRepo(): AuditRepository {
  return {
    append: vi.fn(),
    findBySession: vi.fn().mockReturnValue([]),
    findByDateRange: vi.fn().mockReturnValue([]),
  };
}

async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
  }
  return events;
}

/**
 * Create an async generator that yields the given SDK messages.
 * Mimics the SDK's query() return type.
 */
function createMockSdkQuery(
  messages: Array<Record<string, unknown>>,
): AsyncGenerator<Record<string, unknown>, void> & { interrupt: () => Promise<void> } {
  // eslint-disable-next-line @typescript-eslint/require-await -- yields synchronously from array
  async function* gen(): AsyncGenerator<Record<string, unknown>, void> {
    for (const msg of messages) {
      yield msg;
    }
  }
  const generator = gen() as AsyncGenerator<Record<string, unknown>, void> & {
    interrupt: () => Promise<void>;
  };
  generator.interrupt = vi.fn().mockResolvedValue(undefined);
  return generator;
}

/**
 * Mock the SDK module. Returns a spy on query() so tests can assert
 * that the SDK was actually called with correct parameters.
 */
function mockSdkModule(messages: Array<Record<string, unknown>>): {
  query: ReturnType<typeof vi.fn>;
} {
  const querySpy = vi.fn().mockReturnValue(createMockSdkQuery(messages));
  return { query: querySpy };
}

/**
 * Install the SDK mock so dynamic import('@anthropic-ai/claude-agent-sdk') resolves it.
 */
function installSdkMock(sdkMock: { query: ReturnType<typeof vi.fn> }): void {
  vi.doMock('@anthropic-ai/claude-agent-sdk', () => sdkMock);
}

function clearSdkMock(): void {
  vi.doUnmock('@anthropic-ai/claude-agent-sdk');
}

describe('ClaudeSdkBackend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearSdkMock();
  });

  describe('startSession', () => {
    it('yields error when no API key is provided', async () => {
      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => null);
      const events = await collectEvents(
        backend.startSession({ workspacePath: '/tmp', apiKey: '' }),
      );
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('error');
      if (events[0]?.type === 'error') {
        expect(events[0].recoveryOptions[0]?.action).toBe('setup-key');
      }
    });

    it('calls SDK query() with correct options when API key is present', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Hello from Claude!' }] },
          session_id: 'sess-1',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Session started',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-1',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(
        backend.startSession({ workspacePath: '/tmp/project', apiKey: 'sk-ant-test-key' }),
      );

      // SDK query() was called
      expect(sdkMock.query).toHaveBeenCalledTimes(1);
      const callArgs = sdkMock.query.mock.calls[0] as [
        { prompt: string; options: Record<string, unknown> },
      ];
      expect(callArgs[0].options).toMatchObject({
        cwd: '/tmp/project',
        persistSession: false,
      });
      expect(callArgs[0].options.env).toMatchObject({
        ANTHROPIC_API_KEY: 'sk-ant-test-key',
      });

      // Events were mapped correctly
      const textEvents = events.filter((e) => e.type === 'text');
      expect(textEvents).toHaveLength(1);
      if (textEvents[0]?.type === 'text') {
        expect(textEvents[0].content).toBe('Hello from Claude!');
      }

      const completeEvents = events.filter((e) => e.type === 'complete');
      expect(completeEvents).toHaveLength(1);
    });

    it('yields demo mode message when SDK is not installed', async () => {
      clearSdkMock();
      // Force SDK to be unavailable by mocking the import to throw
      vi.doMock('@anthropic-ai/claude-agent-sdk', () => {
        throw new Error('Cannot find module');
      });

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test');
      const events = await collectEvents(
        backend.startSession({ workspacePath: '/tmp', apiKey: 'sk-ant-test' }),
      );
      expect(events.length).toBeGreaterThanOrEqual(1);
      const textEvent = events.find((e) => e.type === 'text');
      expect(textEvent?.type).toBe('text');
      if (textEvent?.type === 'text') {
        expect(textEvent.content).toContain('demo mode');
      }
    });
  });

  describe('sendMessage', () => {
    it('calls SDK query() and maps assistant text response', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Here is my response about your code.' }],
          },
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.002,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const auditRepo = createMockAuditRepo();
      const backend = new ClaudeSdkBackend(auditRepo, () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'explain this function'));

      // SDK was called with the user's message as prompt
      expect(sdkMock.query).toHaveBeenCalledTimes(1);
      const callArgs = sdkMock.query.mock.calls[0] as [{ prompt: string }];
      expect(callArgs[0].prompt).toBe('explain this function');

      // Text event was yielded
      const textEvents = events.filter((e) => e.type === 'text');
      expect(textEvents).toHaveLength(1);
      if (textEvents[0]?.type === 'text') {
        expect(textEvents[0].content).toBe('Here is my response about your code.');
      }

      // Audit was logged for user message
      expect(auditRepo.append).toHaveBeenCalled();
    });

    it('passes workspace path as cwd to SDK query', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Response' }] },
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      await collectEvents(backend.sendMessage('sess-42', 'hello', '/home/user/project'));

      const callArgs = sdkMock.query.mock.calls[0] as [
        { prompt: string; options: Record<string, unknown> },
      ];
      expect(callArgs[0].options).toMatchObject({ cwd: '/home/user/project' });
    });

    it('maps tool_use content blocks to tool-call events', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'tu-1',
                name: 'Read',
                input: { file_path: '/src/main.ts' },
              },
            ],
          },
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'read the main file'));

      const toolEvents = events.filter((e) => e.type === 'tool-call');
      expect(toolEvents).toHaveLength(1);
      if (toolEvents[0]?.type === 'tool-call') {
        expect(toolEvents[0].toolName).toBe('Read');
        expect(toolEvents[0].toolInput).toEqual({ file_path: '/src/main.ts' });
      }
    });

    it('maps tool_progress SDK messages to progress events', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'tool_progress',
          tool_name: 'Bash',
          tool_use_id: 'tu-2',
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'run tests'));

      const progressEvents = events.filter((e) => e.type === 'progress');
      expect(progressEvents).toHaveLength(1);
      if (progressEvents[0]?.type === 'progress') {
        expect(progressEvents[0].step).toContain('Bash');
        expect(progressEvents[0].status).toBe('in-progress');
      }
    });

    it('maps tool_use_summary SDK messages to completed progress events', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'tool_use_summary',
          summary: 'Read 3 files',
          preceding_tool_use_ids: ['tu-1', 'tu-2', 'tu-3'],
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'explore codebase'));

      const progressEvents = events.filter((e) => e.type === 'progress');
      expect(progressEvents).toHaveLength(1);
      if (progressEvents[0]?.type === 'progress') {
        expect(progressEvents[0].step).toBe('Read 3 files');
        expect(progressEvents[0].status).toBe('completed');
      }
    });

    it('maps SDK result error to error event', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'result',
          subtype: 'error_max_turns',
          errors: ['Max turns exceeded'],
          is_error: true,
          duration_ms: 5000,
          num_turns: 10,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'do something'));

      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents).toHaveLength(1);
      if (errorEvents[0]?.type === 'error') {
        expect(errorEvents[0].recoveryOptions).toHaveLength(1);
        expect(errorEvents[0].recoveryOptions[0]?.description).toContain('Max turns exceeded');
      }
    });

    it('maps SDK assistant error to error event', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: { content: [] },
          error: 'authentication_failed',
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'hello'));

      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents).toHaveLength(1);
    });

    it('yields error when SDK stream throws', async () => {
      const querySpy = vi.fn().mockReturnValue(
        // eslint-disable-next-line @typescript-eslint/require-await -- throws synchronously
        (async function* (): AsyncGenerator<Record<string, unknown>, void> {
          throw new Error('network connection lost');
        })(),
      );
      installSdkMock({ query: querySpy });

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'hello'));

      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents).toHaveLength(1);
      if (errorEvents[0]?.type === 'error') {
        expect(errorEvents[0].userMessage).toBeTruthy();
        expect(errorEvents[0].recoveryOptions.length).toBeGreaterThan(0);
      }
    });

    it('yields error when no API key for sendMessage', async () => {
      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => null);
      const events = await collectEvents(backend.sendMessage('sess-1', 'hello'));

      expect(events.some((e) => e.type === 'error')).toBe(true);
    });
  });

  describe('cancelCurrentAction', () => {
    it('can be cancelled without throwing', () => {
      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test');
      expect(() => {
        backend.cancelCurrentAction();
      }).not.toThrow();
    });
  });

  describe('resumeSession', () => {
    it('yields events from resumeSession', async () => {
      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test');
      const events = await collectEvents(backend.resumeSession('sess-1'));
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0]?.type).toBe('text');
    });
  });

  describe('SDK message filtering', () => {
    it('silently ignores system init and status messages', async () => {
      const sdkMock = mockSdkModule([
        { type: 'system', subtype: 'init', session_id: 'sess-42' },
        { type: 'system', subtype: 'status', session_id: 'sess-42' },
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'The actual response' }] },
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'hello'));

      // Only text + complete, no system events leaked
      const types = events.map((e) => e.type);
      expect(types).not.toContain('system');
      expect(types).toContain('text');
      expect(types).toContain('complete');
    });

    it('skips empty text blocks', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: {
            content: [
              { type: 'text', text: '' },
              { type: 'text', text: '   ' },
              { type: 'text', text: 'Actual content' },
            ],
          },
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'hello'));

      const textEvents = events.filter((e) => e.type === 'text');
      expect(textEvents).toHaveLength(1);
      if (textEvents[0]?.type === 'text') {
        expect(textEvents[0].content).toBe('Actual content');
      }
    });
  });

  describe('conversation history tracking', () => {
    it('tracks multi-turn conversation history', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Response 1' }] },
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test-key');

      // First turn
      await collectEvents(backend.sendMessage('sess-42', 'first message'));
      // Second turn
      await collectEvents(backend.sendMessage('sess-42', 'second message'));

      // SDK was called twice
      expect(sdkMock.query).toHaveBeenCalledTimes(2);

      // Resume should reflect the history
      const resumeEvents = await collectEvents(backend.resumeSession('sess-42'));
      if (resumeEvents[0]?.type === 'text') {
        expect(resumeEvents[0].content).toContain('previous messages');
      }
    });
  });

  describe('audit logging', () => {
    it('logs user message and assistant response to audit repo', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Audited response' }] },
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const auditRepo = createMockAuditRepo();
      const backend = new ClaudeSdkBackend(auditRepo, () => 'sk-ant-test-key');
      await collectEvents(backend.sendMessage('sess-42', 'hello'));

      // At least user:message and agent:response
      expect(auditRepo.append).toHaveBeenCalledTimes(2);
    });

    it('continues even when audit repo throws', async () => {
      const sdkMock = mockSdkModule([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'Still works' }] },
          session_id: 'sess-42',
        },
        {
          type: 'result',
          subtype: 'success',
          result: 'Done',
          total_cost_usd: 0.001,
          num_turns: 1,
          session_id: 'sess-42',
        },
      ]);
      installSdkMock(sdkMock);

      const auditRepo = createMockAuditRepo();
      (auditRepo.append as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('DB write failed');
      });

      const backend = new ClaudeSdkBackend(auditRepo, () => 'sk-ant-test-key');
      const events = await collectEvents(backend.sendMessage('sess-42', 'hello'));

      // Should still get response despite audit failure
      const textEvents = events.filter((e) => e.type === 'text');
      expect(textEvents).toHaveLength(1);
    });
  });
});
