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
  setAuthMode: (mode: 'api-key' | 'claude-subscription'): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_AUTH_MODE, mode) as Promise<void>,
  getAuthMode: (): Promise<'api-key' | 'claude-subscription'> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_AUTH_MODE) as Promise<
      'api-key' | 'claude-subscription'
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

  // Audio / STT
  startAudioCapture: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUDIO_START) as Promise<void>,
  stopAudioCapture: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUDIO_STOP) as Promise<void>,
  sendAudioData: (pcmFloat32: Float32Array): void => {
    ipcRenderer.send(IPC_CHANNELS.AUDIO_DATA, pcmFloat32.buffer);
  },
  onAudioResult: (
    callback: (result: { transcript: string; isFinal: boolean }) => void,
  ): (() => void) => {
    const handler = (_ipcEvent: unknown, data: unknown): void => {
      callback(data as { transcript: string; isFinal: boolean });
    };
    ipcRenderer.on(IPC_CHANNELS.AUDIO_RESULT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUDIO_RESULT, handler);
    };
  },
  onAudioError: (callback: (error: string) => void): (() => void) => {
    const handler = (_ipcEvent: unknown, data: unknown): void => {
      callback(data as string);
    };
    ipcRenderer.on(IPC_CHANNELS.AUDIO_ERROR, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUDIO_ERROR, handler);
    };
  },
  onAudioEnd: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback();
    };
    ipcRenderer.on(IPC_CHANNELS.AUDIO_END, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUDIO_END, handler);
    };
  },
});
