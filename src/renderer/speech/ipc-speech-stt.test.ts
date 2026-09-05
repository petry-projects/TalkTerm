// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SpeechToTextResult } from '../../shared/types/ports/speech-to-text';
import { IpcSpeechStt } from './ipc-speech-stt';

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
        onAudioResult: vi.fn((callback) => {
          mockOnResult = callback;
          return vi.fn();
        }),
        onAudioError: vi.fn((callback) => {
          mockOnError = callback;
          return vi.fn();
        }),
        onAudioEnd: vi.fn((callback) => {
          mockOnEnd = callback;
          return vi.fn();
        }),
        startAudioCapture: vi.fn().mockResolvedValue(undefined),
        stopAudioCapture: vi.fn(),
        sendAudioData: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([
            { stop: vi.fn() },
          ]),
        }),
      },
      writable: true,
      configurable: true,
    });

    // Mock AudioContext
    (global.AudioContext as unknown) = vi.fn(() => ({
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
  });

  it('initializes with isListening = false', () => {
    expect(stt.isListening).toBe(false);
  });

  it('starts listening and subscribes to IPC callbacks', async () => {
    stt.start();
    expect(window.electronAPI.onAudioResult).toHaveBeenCalled();
    expect(window.electronAPI.onAudioError).toHaveBeenCalled();
    expect(window.electronAPI.onAudioEnd).toHaveBeenCalled();
  });

  it('does not start twice', () => {
    stt.start();
    const callCount = (window.electronAPI.onAudioResult as any).mock.calls.length;
    stt.start();
    // Should not call IPC handlers again
    expect((window.electronAPI.onAudioResult as any).mock.calls.length).toBe(callCount);
  });

  it('stops listening and unsubscribes from IPC', () => {
    stt.start();
    stt.stop();
    expect(window.electronAPI.stopAudioCapture).toHaveBeenCalled();
    expect(stt.isListening).toBe(false);
  });

  it('does not error on stop if not listening', () => {
    expect(() => stt.stop()).not.toThrow();
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
    // Don't set any callbacks
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
