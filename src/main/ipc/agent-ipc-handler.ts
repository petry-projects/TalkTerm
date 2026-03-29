import { IPC_CHANNELS } from '../../shared/types/domain/ipc-channels';
import type { AgentMessageRouter } from '../agent/agent-message-router';
import type { IPCMain, IPCRegistrar } from './ipc-registrar';

export interface WebContents {
  send(channel: string, ...args: unknown[]): void;
}

export class AgentIPCHandler implements IPCRegistrar {
  constructor(
    private readonly router: AgentMessageRouter,
    private readonly getWebContents: () => WebContents | null,
  ) {}

  register(ipcMain: IPCMain): void {
    // Set up event forwarding once during registration
    this.router.onEvent((event) => {
      const webContents = this.getWebContents();
      if (webContents !== null) {
        webContents.send(IPC_CHANNELS.AGENT_MESSAGE, event);
      }
    });

    ipcMain.handle(
      IPC_CHANNELS.AGENT_ACTION,
      async (_event: unknown, sessionId: unknown, message: unknown) => {
        const webContents = this.getWebContents();
        if (webContents === null) {
          throw new Error('No active window');
        }

        try {
          await this.router.sendMessage(sessionId as string, message as string);
        } catch (err: unknown) {
          // Send error as an agent event so the UI can recover
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
          webContents.send(IPC_CHANNELS.AGENT_MESSAGE, {
            type: 'error',
            userMessage: `Something went wrong: ${errorMessage}`,
            recoveryOptions: [
              { label: 'Try again', action: 'retry', description: 'Send your message again' },
            ],
          });
        }
      },
    );

    ipcMain.on('agent:cancel', () => {
      this.router.cancel();
    });
  }
}
