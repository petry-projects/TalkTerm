/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- Web Speech API types are not fully typed in TypeScript */
import type { SpeechToText, SpeechToTextResult } from '../../shared/types/ports/speech-to-text';

export class WebSpeechStt implements SpeechToText {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SpeechRecognition type varies by browser
  private recognition: any = null;
  private _isListening = false;

  onResult: ((result: SpeechToTextResult) => void) | null = null;
  onError: ((error: Error) => void) | null = null;
  onEnd: (() => void) | null = null;

  get isListening(): boolean {
    return this._isListening;
  }

  start(): void {
    if (this._isListening) return;
    const SpeechRecognitionClass = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (SpeechRecognitionClass === undefined) {
      this.onError?.(new Error('Speech recognition not supported'));
      return;
    }
    this.recognition = new SpeechRecognitionClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: { results: SpeechRecognitionResultList }): void => {
      const result = event.results[event.results.length - 1];
      if (result !== undefined) {
        this.onResult?.({
          transcript: result[0]?.transcript ?? '',
          isFinal: result.isFinal,
        });
      }
    };

    this.recognition.onerror = (event: { error: string }): void => {
      this.onError?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onend = (): void => {
      this._isListening = false;
      this.onEnd?.();
    };

    this.recognition.start();
    this._isListening = true;
  }

  stop(): void {
    if (this.recognition !== null) {
      this.recognition.stop();
      this._isListening = false;
    }
  }
}
