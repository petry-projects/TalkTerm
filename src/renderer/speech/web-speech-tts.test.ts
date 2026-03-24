/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks are not class methods */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSpeechTts } from './web-speech-tts';

describe('WebSpeechTts', () => {
  beforeEach(() => {
    const mockSpeechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
    };
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSpeechSynthesis,
      writable: true,
      configurable: true,
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      vi.fn().mockImplementation((text: string) => ({
        text,
        voice: null,
        onend: null,
      })),
    );
  });

  it('implements TextToSpeech interface', () => {
    const tts = new WebSpeechTts();
    expect(tts.isSpeaking).toBe(false);
    expect(tts.onEnd).toBeNull();
  });

  it('speaks text', () => {
    const tts = new WebSpeechTts();
    tts.speak('Hello');
    expect(tts.isSpeaking).toBe(true);
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('stops speaking', () => {
    const tts = new WebSpeechTts();
    tts.speak('Hello');
    tts.stop();
    expect(tts.isSpeaking).toBe(false);
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});
