// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SpeechToTextResult } from '../../shared/types/ports/speech-to-text';
import { IpcSpeechStt } from './ipc-speech-stt';

interface MockElectronAPI {
  onAudioResult: ReturnType<typeof vi.fn>;
  onAudioError: ReturnType<typeof vi.fn>;
  onAudioEnd: ReturnType<typeof vi.fn>;
  startAudioCapture: ReturnType<typeof vi.fn>;
  stopAudioCapture: ReturnType<typeof vi.fn>;
  sendAudioData: ReturnType<typeof vi.fn>;
}

describe('IpcSpeechStt', () => {
  let stt: IpcSpeechStt;
  let mockOnResult: ((result: SpeechToTextResult) => void) | null;
  let mockOnError: ((error: Error) => void) | null;
  let mockOnEnd: (() => void) | null;

  beforeEach(() => {
    stt = new IpcSpeechStt();
    mockOnResult = null;
    mockOnError = null;
    mockOnEnd = null;

    // Mock electronAPI
    Object.defineProperty(window, 'electronAPI', {
      value: {
        onAudioResult: vi.fn((callback: (result: SpeechToTextResult) => void) => {
          mockOnResult = callback;
          return vi.fn();
        }),
        onAudioError: vi.fn((callback: (error: Error) => void) => {
          mockOnError = callback;
          return vi.fn();
        }),
        onAudioEnd: vi.fn((callback: () => void) => {
          mockOnEnd = callback;
          return vi.fn();
        }),
        startAudioCapture: vi.fn().mockResolvedValue(undefined),
        stopAudioCapture: vi.fn(),
        sendAudioData: vi.fn(),
      } as MockElectronAPI,
      writable: true,
      configurable: true,
    });

    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
        }),
      },
      writable: true,
      configurable: true,
    });

    // Mock AudioContext
    const mockAudioContext = vi.fn(() => ({
      sampleRate: 16000,
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
      }),
      createScriptProcessor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        onaudioprocess: null,
      }),
      destination: {},
      close: vi.fn().mockResolvedValue(undefined),
    }));
    global.AudioContext = mockAudioContext as unknown as typeof AudioContext;
  });

  it('initializes with isListening = false', () => {
    expect(stt.isListening).toBe(false);
  });

  it('starts listening and subscribes to IPC callbacks', () => {
    stt.start();
    const mockElectronAPI = window.electronAPI as unknown as MockElectronAPI;
    expect(mockElectronAPI.onAudioResult).toHaveBeenCalled();
    expect(mockElectronAPI.onAudioError).toHaveBeenCalled();
    expect(mockElectronAPI.onAudioEnd).toHaveBeenCalled();
  });

  it('does not start twice', () => {
    stt.start();
    const mockElectronAPI = window.electronAPI as unknown as MockElectronAPI;
    const callCount = vi.isMockFunction(mockElectronAPI.onAudioResult)
      ? mockElectronAPI.onAudioResult.mock.calls.length
      : 0;
    stt.start();
    const newCallCount = vi.isMockFunction(mockElectronAPI.onAudioResult)
      ? mockElectronAPI.onAudioResult.mock.calls.length
      : 0;
    expect(newCallCount).toBe(callCount);
  });

  it('stops listening and unsubscribes from IPC', () => {
    stt.start();
    stt.stop();
    const mockElectronAPI = window.electronAPI as unknown as MockElectronAPI;
    expect(mockElectronAPI.stopAudioCapture).toHaveBeenCalled();
    expect(stt.isListening).toBe(false);
  });

  it('does not error on stop if not listening', () => {
    expect(() => {
      stt.stop();
    }).not.toThrow();
  });

  it('calls onResult when receiving audio result', () => {
    stt.onResult = vi.fn();
    stt.start();

    const result: SpeechToTextResult = { transcript: 'hello', isFinal: true, confidence: 0.95 };
    mockOnResult?.(result);

    expect(stt.onResult).toHaveBeenCalledWith(result);
  });

  it('calls onError when receiving audio error', () => {
    stt.onError = vi.fn();
    stt.start();

    mockOnError?.(new Error('Mic access denied'));

    expect(stt.onError).toHaveBeenCalled();
    expect(stt.isListening).toBe(false);
  });

  it('calls onEnd when receiving audio end event', () => {
    stt.onEnd = vi.fn();
    stt.start();

    mockOnEnd?.();

    expect(stt.onEnd).toHaveBeenCalled();
    expect(stt.isListening).toBe(false);
  });

  it('handles missing callbacks gracefully', () => {
    stt.start();
    expect(() => {
      mockOnResult?.({ transcript: 'test', isFinal: true, confidence: 0.9 });
    }).not.toThrow();

    expect(() => {
      mockOnError?.(new Error('test error'));
    }).not.toThrow();

    expect(() => {
      mockOnEnd?.();
    }).not.toThrow();
  });
});
