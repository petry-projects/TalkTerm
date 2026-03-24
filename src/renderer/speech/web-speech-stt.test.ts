// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSpeechStt } from './web-speech-stt';

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });
}

describe('WebSpeechStt', () => {
  beforeEach(() => {
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('implements SpeechToText interface', () => {
    const stt = new WebSpeechStt();
    expect(stt.isListening).toBe(false);
    expect(stt.onResult).toBeNull();
    expect(stt.onError).toBeNull();
  });

  it('starts listening', () => {
    const stt = new WebSpeechStt();
    stt.start();
    expect(stt.isListening).toBe(true);
  });

  it('stops listening', () => {
    const stt = new WebSpeechStt();
    stt.start();
    stt.stop();
    expect(stt.isListening).toBe(false);
  });

  it('calls onError when speech recognition not supported', () => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const stt = new WebSpeechStt();
    const onError = vi.fn();
    stt.onError = onError;
    stt.start();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest expect matcher
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('not supported') }),
    );
  });
});
