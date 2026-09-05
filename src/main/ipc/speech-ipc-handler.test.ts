import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IpcMain, WebContents } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/domain/ipc-channels';
import { SpeechIPCHandler } from './speech-ipc-handler';

describe('SpeechIPCHandler', () => {
  let handler: SpeechIPCHandler;
  let mockStt: {
    initialize: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    acceptAudio: ReturnType<typeof vi.fn>;
    onResult: ((result: unknown) => void) | null;
    onError: ((error: string) => void) | null;
    onEnd: (() => void) | null;
    isListening: boolean;
  };
  let mockWebContents: Partial<WebContents>;
  let mockIpcMain: Partial<IpcMain>;
  let ipcHandlers: Record<string, any>;

  beforeEach(() => {
    ipcHandlers = {};

    mockStt = {
      initialize: vi.fn().mockResolvedValue(undefined),
      start: vi.fn(),
      stop: vi.fn(),
      acceptAudio: vi.fn(),
      onResult: null,
      onError: null,
      onEnd: null,
      isListening: false,
    };

    mockWebContents = {
      send: vi.fn(),
    };

    mockIpcMain = {
      handle: vi.fn((channel: string, fn: Function) => {
        ipcHandlers[channel] = fn;
      }),
      on: vi.fn((channel: string, fn: Function) => {
        ipcHandlers[channel] = fn;
      }),
    };

    handler = new SpeechIPCHandler(mockStt as any, () => mockWebContents as any);
  });

  it('registers IPC handlers when register is called', () => {
    handler.register(mockIpcMain as any);

    expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.AUDIO_START, expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.AUDIO_STOP, expect.any(Function));
    expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.AUDIO_DATA, expect.any(Function));
  });

  it('initializes STT and sets up callbacks on AUDIO_START', async () => {
    handler.register(mockIpcMain as any);

    const startHandler = ipcHandlers[IPC_CHANNELS.AUDIO_START];
    await startHandler();

    expect(mockStt.initialize).toHaveBeenCalled();
    expect(mockStt.start).toHaveBeenCalled();
    expect(mockStt.onResult).not.toBeNull();
    expect(mockStt.onError).not.toBeNull();
    expect(mockStt.onEnd).not.toBeNull();
  });

  it('sends result via IPC when onResult is called', async () => {
    handler.register(mockIpcMain as any);

    const startHandler = ipcHandlers[IPC_CHANNELS.AUDIO_START];
    await startHandler();

    const result = { transcript: 'hello', isFinal: true, confidence: 0.95 };
    mockStt.onResult?.(result);

    expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.AUDIO_RESULT, result);
  });

  it('sends error via IPC when onError is called', async () => {
    handler.register(mockIpcMain as any);

    const startHandler = ipcHandlers[IPC_CHANNELS.AUDIO_START];
    await startHandler();

    mockStt.onError?.('Mic access denied');

    expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.AUDIO_ERROR, 'Mic access denied');
  });

  it('sends end event via IPC when onEnd is called', async () => {
    handler.register(mockIpcMain as any);

    const startHandler = ipcHandlers[IPC_CHANNELS.AUDIO_START];
    await startHandler();

    mockStt.onEnd?.();

    expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.AUDIO_END);
  });

  it('handles initialization errors gracefully', async () => {
    mockStt.initialize.mockRejectedValue(new Error('Init failed'));
    handler.register(mockIpcMain as any);

    const startHandler = ipcHandlers[IPC_CHANNELS.AUDIO_START];
    await startHandler();

    expect(mockWebContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.AUDIO_ERROR,
      expect.stringContaining('Init failed'),
    );
  });

  it('stops STT on AUDIO_STOP', async () => {
    handler.register(mockIpcMain as any);

    const stopHandler = ipcHandlers[IPC_CHANNELS.AUDIO_STOP];
    stopHandler();

    expect(mockStt.stop).toHaveBeenCalled();
  });

  it('processes audio data and calls acceptAudio', async () => {
    handler.register(mockIpcMain as any);
    mockStt.isListening = true;

    const buffer = new ArrayBuffer(4);
    const dataHandler = ipcHandlers[IPC_CHANNELS.AUDIO_DATA];
    dataHandler({}, buffer);

    expect(mockStt.acceptAudio).toHaveBeenCalledWith(expect.any(Float32Array));
  });

  it('ignores audio data when not listening', async () => {
    handler.register(mockIpcMain as any);
    mockStt.isListening = false;

    const buffer = new ArrayBuffer(4);
    const dataHandler = ipcHandlers[IPC_CHANNELS.AUDIO_DATA];
    dataHandler({}, buffer);

    expect(mockStt.acceptAudio).not.toHaveBeenCalled();
  });

  it('ignores non-ArrayBuffer audio data', async () => {
    handler.register(mockIpcMain as any);
    mockStt.isListening = true;

    const dataHandler = ipcHandlers[IPC_CHANNELS.AUDIO_DATA];
    dataHandler({}, 'not a buffer');

    expect(mockStt.acceptAudio).not.toHaveBeenCalled();
  });

  it('sends error when WebContents is unavailable', async () => {
    handler = new SpeechIPCHandler(mockStt as any, () => null);
    handler.register(mockIpcMain as any);

    const startHandler = ipcHandlers[IPC_CHANNELS.AUDIO_START];
    await expect(startHandler()).resolves.toBeUndefined();

    expect(mockStt.initialize).toHaveBeenCalled();
  });
});
