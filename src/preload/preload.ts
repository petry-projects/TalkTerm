import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types/domain/ipc-channels';

contextBridge.exposeInMainWorld('electronAPI', {
  // Agent
  sendAgentMessage: (sessionId: string, message: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_ACTION, sessionId, message) as Promise<void>,
  cancelAgent: (): void => {
    ipcRenderer.send('agent:cancel');
  },
  onAgentEvent: (callback: (event: unknown) => void): (() => void) => {
    const handler = (_ipcEvent: unknown, data: unknown): void => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.AGENT_MESSAGE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AGENT_MESSAGE, handler);
    };
  },

  // Session
  startSession: (workspacePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_START, workspacePath) as Promise<string>,
  resumeSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SESSION_RESUME, sessionId) as Promise<void>,

  // Settings
  validateApiKey: (key: string): Promise<{ valid: boolean; message?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_VALIDATE_KEY, key) as Promise<{
      valid: boolean;
      message?: string;
    }>,
  storeApiKey: (key: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_STORE_KEY, key) as Promise<void>,
  getKeyState: (): Promise<'none' | 'valid' | 'expired'> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_KEY_STATE) as Promise<
      'none' | 'valid' | 'expired'
    >,

  // Profile
  getProfile: (): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET) as Promise<unknown>,
  setProfile: (name: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SET, name) as Promise<void>,

  // Avatar
  getAvatarRoster: (): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.AVATAR_GET_ROSTER) as Promise<unknown>,
  selectAvatar: (personaId: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.AVATAR_SELECT, personaId) as Promise<void>,

  // Workspace
  browseWorkspace: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_BROWSE) as Promise<string | null>,
  setWorkspace: (path: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SET, path) as Promise<void>,

  // Launch
  assessLaunchState: (): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_ASSESS_STATE) as Promise<unknown>,
});
