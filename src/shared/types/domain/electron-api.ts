import type { AgentEvent } from './agent-event';
import type { AvatarPersona } from './avatar-persona';
import type { LaunchState } from './launch-state';
import type { UserProfile } from './user-profile';

export interface ElectronAPI {
  // Agent
  sendAgentMessage: (sessionId: string, message: string) => Promise<void>;
  cancelAgent: () => void;
  onAgentEvent: (callback: (event: AgentEvent) => void) => () => void;

  // Session
  startSession: (workspacePath: string) => Promise<string>;
  resumeSession: (sessionId: string) => Promise<void>;

  // Settings
  validateApiKey: (key: string) => Promise<{ valid: boolean; message?: string }>;
  storeApiKey: (key: string) => Promise<void>;
  getKeyState: () => Promise<'none' | 'valid' | 'expired'>;

  // Profile
  getProfile: () => Promise<UserProfile | null>;
  setProfile: (name: string) => Promise<void>;

  // Avatar
  getAvatarRoster: () => Promise<readonly AvatarPersona[]>;
  selectAvatar: (personaId: string) => Promise<void>;

  // Workspace
  browseWorkspace: () => Promise<string | null>;
  setWorkspace: (path: string) => Promise<void>;

  // Launch
  assessLaunchState: () => Promise<LaunchState>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
