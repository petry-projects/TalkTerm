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
      if (typeof workspacePath !== 'string' || workspacePath.length === 0) {
        throw new Error('workspacePath must be a non-empty string');
      }
      const profile = this.configStore.get('userProfile') as
        | { avatarPersonaId: string | null }
        | undefined;
      const avatarId =
        profile !== undefined &&
        profile.avatarPersonaId !== null &&
        profile.avatarPersonaId.length > 0
          ? profile.avatarPersonaId
          : 'mary';
      const session = createSession(workspacePath, avatarId);
      this.sessionRepo.save(session);
      return session.id;
    });

    ipcMain.handle(IPC_CHANNELS.SESSION_RESUME, (_event: unknown, sessionId: unknown) => {
      if (typeof sessionId !== 'string' || sessionId.length === 0) {
        throw new Error('sessionId must be a non-empty string');
      }
      const session = this.sessionRepo.findById(sessionId);
      if (session === null) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      this.sessionRepo.updateStatus(session.id, 'active');
      return session;
    });

    ipcMain.handle(IPC_CHANNELS.LAUNCH_ASSESS_STATE, () => {
      const profile = this.configStore.get('userProfile') as
        | { name: string; avatarPersonaId: string | null }
        | undefined;
      // Check for API key: stored key OR ANTHROPIC_API_KEY env var
      const apiKeyEnv = process.env['ANTHROPIC_API_KEY'];
      const hasEnvKey = apiKeyEnv !== undefined && apiKeyEnv !== '';
      return {
        apiKeyValid: hasEnvKey,
        envKeyDetected: hasEnvKey,
        profileComplete: profile !== undefined && profile.name !== '',
        avatarSelected: profile?.avatarPersonaId !== null,
        workspaceSelected: this.configStore.has('workspacePath'),
      };
    });
  }
}
