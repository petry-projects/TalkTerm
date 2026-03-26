import { IPC_CHANNELS } from '../../shared/types/domain/ipc-channels';
import { createSession } from '../../shared/types/domain/session';
import type { SessionRepository } from '../../shared/types/ports/session-repository';
import type { ConfigStore } from '../storage/electron-config-store';
import type { IPCMain, IPCRegistrar } from './ipc-registrar';

export class SessionIPCHandler implements IPCRegistrar {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly configStore: ConfigStore,
  ) {}

  register(ipcMain: IPCMain): void {
    ipcMain.handle(IPC_CHANNELS.SESSION_START, (_event: unknown, workspacePath: unknown) => {
      const profile = this.configStore.get('userProfile') as
        | { avatarPersonaId: string | null }
        | undefined;
      const avatarId = profile?.avatarPersonaId ?? 'mary';
      const session = createSession(workspacePath as string, avatarId);
      this.sessionRepo.save(session);
      return session.id;
    });

    ipcMain.handle(IPC_CHANNELS.SESSION_RESUME, (_event: unknown, sessionId: unknown) => {
      const session = this.sessionRepo.findById(sessionId as string);
      if (session === null) {
        throw new Error(`Session not found: ${sessionId as string}`);
      }
      this.sessionRepo.updateStatus(session.id, 'active');
      return session;
    });

    ipcMain.handle(IPC_CHANNELS.LAUNCH_ASSESS_STATE, () => {
      const profile = this.configStore.get('userProfile') as
        | { name: string; avatarPersonaId: string | null }
        | undefined;
      // Check for API key: stored key OR ANTHROPIC_API_KEY env var
      const hasEnvKey = process.env['ANTHROPIC_API_KEY'] !== undefined && process.env['ANTHROPIC_API_KEY'] !== '';
      return {
        apiKeyValid: hasEnvKey,
        envKeyDetected: hasEnvKey,
        profileComplete: profile !== undefined && profile.name !== '',
        avatarSelected: profile?.avatarPersonaId !== null && profile?.avatarPersonaId !== undefined,
        workspaceSelected: this.configStore.has('workspacePath'),
      };
    });
  }
}
