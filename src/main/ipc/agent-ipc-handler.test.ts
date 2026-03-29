/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockIpcMain, createMockWebContents } from '../../../test/support/fixtures/ipc';
import type { AgentEvent } from '../../shared/types/domain/agent-event';
import { IPC_CHANNELS } from '../../shared/types/domain/ipc-channels';
import type { AgentMessageRouter } from '../agent/agent-message-router';
import { AgentIPCHandler } from './agent-ipc-handler';
import type { IPCMain } from './ipc-registrar';

function createMockRouter(): AgentMessageRouter {
  return {
    onEvent: vi.fn(),
    startSession: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    resumeSession: vi.fn().mockResolvedValue(undefined),
  } as unknown as AgentMessageRouter;
}

describe('AgentIPCHandler', () => {
  let handlers: Map<string, (...args: unknown[]) => unknown>;
  let listeners: Map<string, (...args: unknown[]) => void>;
  let ipcMain: IPCMain;

  beforeEach(() => {
    const mock = createMockIpcMain();
    ipcMain = mock.ipcMain;
    handlers = mock.handlers;
    listeners = new Map();
    // Capture `on` registrations for fire-and-forget channels
    ipcMain.on = vi.fn((channel: string, handler: (event: unknown, ...args: unknown[]) => void) => {
      listeners.set(channel, handler);
    });
  });

  it('registers agent:action as a handle channel', () => {
    const router = createMockRouter();
    const handler = new AgentIPCHandler(router, () => createMockWebContents());
    handler.register(ipcMain);

    expect(handlers.has(IPC_CHANNELS.AGENT_ACTION)).toBe(true);
  });

  it('registers agent:cancel as an on channel', () => {
    const router = createMockRouter();
    const handler = new AgentIPCHandler(router, () => createMockWebContents());
    handler.register(ipcMain);

    expect(listeners.has('agent:cancel')).toBe(true);
  });

  it('channel names follow agent:verb convention', () => {
    const router = createMockRouter();
    const handler = new AgentIPCHandler(router, () => createMockWebContents());
    handler.register(ipcMain);

    expect(IPC_CHANNELS.AGENT_ACTION).toBe('agent:action');
    for (const channel of [...handlers.keys(), ...listeners.keys()]) {
      expect(channel).toMatch(/^agent:/);
    }
  });

  it('sets up event forwarding during register and sends events to webContents', async () => {
    const router = createMockRouter();
    const webContents = createMockWebContents();

    // Capture the onEvent callback registered during register()
    let eventForwarder: ((event: AgentEvent) => void) | undefined;
    vi.mocked(router.onEvent).mockImplementation((cb) => {
      eventForwarder = cb;
    });

    // Simulate the router calling the event forwarder during sendMessage
    vi.mocked(router.sendMessage).mockImplementation(() => {
      eventForwarder?.({ type: 'text', content: 'Hello' });
      eventForwarder?.({ type: 'complete', summary: 'Done' });
      return Promise.resolve();
    });

    const handler = new AgentIPCHandler(router, () => webContents);
    handler.register(ipcMain);

    // onEvent should be called once during register, not per sendMessage
    expect(router.onEvent).toHaveBeenCalledOnce();

    const agentAction = handlers.get(IPC_CHANNELS.AGENT_ACTION);
    await agentAction?.({}, 'session-1', 'Hello agent');

    expect(router.sendMessage).toHaveBeenCalledWith('session-1', 'Hello agent');
    expect(webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.AGENT_MESSAGE, {
      type: 'text',
      content: 'Hello',
    });
    expect(webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.AGENT_MESSAGE, {
      type: 'complete',
      summary: 'Done',
    });
  });

  it('throws when no active window is available', async () => {
    const router = createMockRouter();
    const handler = new AgentIPCHandler(router, () => null);
    handler.register(ipcMain);

    const agentAction = handlers.get(IPC_CHANNELS.AGENT_ACTION);
    await expect(agentAction?.({}, 'session-1', 'test')).rejects.toThrow('No active window');
  });

  it('sends error event to renderer when router.sendMessage throws', async () => {
    const router = createMockRouter();
    const webContents = createMockWebContents();
    vi.mocked(router.sendMessage).mockRejectedValue(new Error('Backend failure'));

    const handler = new AgentIPCHandler(router, () => webContents);
    handler.register(ipcMain);

    const agentAction = handlers.get(IPC_CHANNELS.AGENT_ACTION);
    // Should NOT throw — error is sent as an event
    await agentAction?.({}, 'session-1', 'test');

    expect(webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.AGENT_MESSAGE,
      expect.objectContaining({
        type: 'error',
        userMessage: expect.stringContaining('Backend failure') as string,
      }),
    );
  });

  it('calls router.cancel on agent:cancel', () => {
    const router = createMockRouter();
    const handler = new AgentIPCHandler(router, () => createMockWebContents());
    handler.register(ipcMain);

    const cancelHandler = listeners.get('agent:cancel');
    cancelHandler?.({});

    expect(router.cancel).toHaveBeenCalled();
  });
});
