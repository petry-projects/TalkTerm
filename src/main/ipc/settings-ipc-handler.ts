import { IPC_CHANNELS } from '../../shared/types/domain/ipc-channels';
import type { KeyManager } from '../security/safe-storage-key-manager';
import type { ConfigStore } from '../storage/electron-config-store';
import type { IPCMain, IPCRegistrar } from './ipc-registrar';

export class SettingsIPCHandler implements IPCRegistrar {
  constructor(
    private readonly keyManager: KeyManager,
    private readonly configStore: ConfigStore,
  ) {}

  register(ipcMain: IPCMain): void {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_KEY_STATE, () => {
      if (!this.keyManager.hasKey()) return 'none';
      return 'valid'; // Real validation would check against Anthropic API
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_STORE_KEY, (_event: unknown, key: unknown) => {
      if (typeof key === 'string' && key.length > 0) {
        this.keyManager.storeKey(key);
      }
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_AUTH_MODE, (_event: unknown, mode: unknown) => {
      if (mode === 'api-key' || mode === 'claude-subscription') {
        this.configStore.set('authMode', mode);
      }
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_AUTH_MODE, () => {
      return this.configStore.get('authMode') ?? 'api-key';
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event: unknown, key: unknown) => {
      if (typeof key === 'string') {
        return this.configStore.get(key);
      }
      return undefined;
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event: unknown, key: unknown, value: unknown) => {
      if (typeof key === 'string' && key.length > 0) {
        this.configStore.set(key, value);
      }
    });

    ipcMain.handle(IPC_CHANNELS.PROFILE_GET, () => {
      return this.configStore.get('userProfile');
    });

    ipcMain.handle(IPC_CHANNELS.PROFILE_SET, (_event: unknown, name: unknown) => {
      const now = new Date().toISOString();
      this.configStore.set('userProfile', {
        name,
        avatarPersonaId: null,
        createdAt: now,
        updatedAt: now,
      });
    });

    ipcMain.handle(IPC_CHANNELS.AVATAR_SELECT, (_event: unknown, personaId: unknown) => {
      const profile = this.configStore.get('userProfile') as
        | { name: string; avatarPersonaId: string | null; createdAt: string; updatedAt: string }
        | undefined;
      if (profile !== undefined && typeof personaId === 'string' && personaId.length > 0) {
        this.configStore.set('userProfile', {
          ...profile,
          avatarPersonaId: personaId,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }
}
