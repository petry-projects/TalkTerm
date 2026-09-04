import { IPC_CHANNELS } from '../../shared/types/domain/ipc-channels';
import type { KeyManager } from '../security/safe-storage-key-manager';
import type { ConfigStore } from '../storage/electron-config-store';
import type { IPCMain, IPCRegistrar } from './ipc-registrar';
import { validateString } from './validate-string';

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
      const validKey = validateString(key, 'API key');
      this.keyManager.storeKey(validKey);
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_AUTH_MODE, (_event: unknown, mode: unknown) => {
      if (mode !== 'api-key' && mode !== 'claude-subscription') {
        throw new Error('Auth mode must be either "api-key" or "claude-subscription"');
      }
      this.configStore.set('authMode', mode);
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_AUTH_MODE, () => {
      return this.configStore.get('authMode') ?? 'api-key';
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event: unknown, key: unknown) => {
      const validKey = validateString(key, 'Settings key');
      return this.configStore.get(validKey);
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event: unknown, key: unknown, value: unknown) => {
      const validKey = validateString(key, 'Settings key');
      this.configStore.set(validKey, value);
    });

    ipcMain.handle(IPC_CHANNELS.PROFILE_GET, () => {
      return this.configStore.get('userProfile');
    });

    ipcMain.handle(IPC_CHANNELS.PROFILE_SET, (_event: unknown, name: unknown) => {
      const validName = validateString(name, 'Profile name');
      const now = new Date().toISOString();
      this.configStore.set('userProfile', {
        name: validName,
        avatarPersonaId: null,
        createdAt: now,
        updatedAt: now,
      });
    });

    ipcMain.handle(IPC_CHANNELS.AVATAR_SELECT, (_event: unknown, personaId: unknown) => {
      const validPersonaId = validateString(personaId, 'Avatar persona ID');
      const profile = this.configStore.get('userProfile') as
        | { name: string; avatarPersonaId: string | null; createdAt: string; updatedAt: string }
        | undefined;
      if (profile === undefined) {
        throw new Error('User profile not found');
      }
      this.configStore.set('userProfile', {
        ...profile,
        avatarPersonaId: validPersonaId,
        updatedAt: new Date().toISOString(),
      });
    });
  }
}
