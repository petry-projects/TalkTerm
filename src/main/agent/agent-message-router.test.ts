import { describe, it, expect, vi } from 'vitest';
import { AgentMessageRouter } from './agent-message-router';
import { FakeAgentBackend } from './fake-agent-backend';

describe('AgentMessageRouter', () => {
  it('routes events from startSession to handler', async () => {
    const backend = new FakeAgentBackend();
    backend.queueEvents([
      { type: 'text', content: 'Hello' },
      { type: 'complete', summary: 'Done' },
    ]);

    const router = new AgentMessageRouter(backend);
    const handler = vi.fn();
    router.onEvent(handler);

    await router.startSession({ workspacePath: '/tmp', apiKey: 'test' });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, { type: 'text', content: 'Hello' });
    expect(handler).toHaveBeenNthCalledWith(2, { type: 'complete', summary: 'Done' });
  });

  it('routes events from sendMessage to handler', async () => {
    const backend = new FakeAgentBackend();
    backend.queueEvents([{ type: 'text', content: 'Response' }]);

    const router = new AgentMessageRouter(backend);
    const handler = vi.fn();
    router.onEvent(handler);

    await router.sendMessage('session-1', 'hello');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('cancels the backend', () => {
    const backend = new FakeAgentBackend();
    const router = new AgentMessageRouter(backend);

    router.cancel();

    expect(backend.cancelled).toBe(true);
  });

  it('does not throw when no handler is set', async () => {
    const backend = new FakeAgentBackend();
    backend.queueEvents([{ type: 'text', content: 'Hello' }]);

    const router = new AgentMessageRouter(backend);

    await expect(
      router.startSession({ workspacePath: '/tmp', apiKey: 'test' }),
    ).resolves.toBeUndefined();
  });
});
