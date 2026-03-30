import type { IpcMain, WebContents } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/domain/ipc-channels';
import type { SherpaOnnxStt } from '../speech/sherpa-onnx-stt';

/**
 * SpeechIPCHandler — bridges renderer audio IPC to the main-process SherpaOnnxStt.
 */
export class SpeechIPCHandler {
  constructor(
    private readonly stt: SherpaOnnxStt,
    private readonly getWebContents: () => WebContents | null,
  ) {}

  register(ipcMain: IpcMain): void {
    ipcMain.handle(IPC_CHANNELS.AUDIO_START, async () => {
      await this.stt.initialize();

      const wc = this.getWebContents();

      this.stt.onResult = (result) => {
        wc?.send(IPC_CHANNELS.AUDIO_RESULT, result);
      };

      this.stt.onError = (error) => {
        wc?.send(IPC_CHANNELS.AUDIO_ERROR, error);
      };

      this.stt.onEnd = () => {
        wc?.send(IPC_CHANNELS.AUDIO_END);
      };

      this.stt.start();
    });

    ipcMain.handle(IPC_CHANNELS.AUDIO_STOP, () => {
      this.stt.stop();
    });

    // Audio data arrives as ArrayBuffer from renderer — convert to Float32Array
    ipcMain.on(IPC_CHANNELS.AUDIO_DATA, (_event, buffer: ArrayBuffer) => {
      if (this.stt.isListening) {
        const samples = new Float32Array(buffer);
        this.stt.acceptAudio(samples);
      }
    });
  }
}
