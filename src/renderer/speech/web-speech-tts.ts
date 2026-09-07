/* eslint-disable @typescript-eslint/no-unnecessary-condition -- typeof window checks needed for SSR/test safety */
import type { TextToSpeech } from '../../shared/types/ports/text-to-speech';

export class WebSpeechTts implements TextToSpeech {
  private _isSpeaking = false;

  onEnd: (() => void) | null = null;

  get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  speak(text: string, voiceName?: string): void {
    if (typeof window === 'undefined' || window.speechSynthesis === undefined) return;

    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);

    if (voiceName !== undefined) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((v) => v.name === voiceName);
      if (voice !== undefined) {
        utterance.voice = voice;
      }
    }

    utterance.onend = (): void => {
      this._isSpeaking = false;
      this.onEnd?.();
    };

    this._isSpeaking = true;
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis !== undefined) {
      window.speechSynthesis.cancel();
    }
    this._isSpeaking = false;
  }
}
