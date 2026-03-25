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
      this.keyManager.storeKey(key as string);
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event: unknown, key: unknown) => {
      return this.configStore.get(key as string);
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event: unknown, key: unknown, value: unknown) => {
      this.configStore.set(key as string, value);
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
      if (profile !== undefined) {
        this.configStore.set('userProfile', {
          ...profile,
          avatarPersonaId: personaId,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }
}
