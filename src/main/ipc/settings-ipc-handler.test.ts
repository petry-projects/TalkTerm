/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IPC_CHANNELS } from '../../shared/types/domain/ipc-channels';
import type { KeyManager } from '../security/safe-storage-key-manager';
import { InMemoryConfigStore } from '../storage/electron-config-store';
import type { IPCMain } from './ipc-registrar';
import { SettingsIPCHandler } from './settings-ipc-handler';

function createMockKeyManager(hasKey = false): KeyManager {
  return {
    storeKey: vi.fn(),
    retrieveKey: vi.fn().mockReturnValue(hasKey ? 'sk-ant-test' : null),
    deleteKey: vi.fn(),
    hasKey: vi.fn().mockReturnValue(hasKey),
  };
}

describe('SettingsIPCHandler', () => {
  let handlers: Map<string, (...args: unknown[]) => unknown>;
  let ipcMain: IPCMain;

  beforeEach(() => {
    handlers = new Map();
    ipcMain = {
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler);
      }),
      on: vi.fn(),
    };
  });

  it('registers all settings channels', () => {
    const handler = new SettingsIPCHandler(createMockKeyManager(), new InMemoryConfigStore());
    handler.register(ipcMain);
    expect(handlers.has(IPC_CHANNELS.SETTINGS_GET_KEY_STATE)).toBe(true);
    expect(handlers.has(IPC_CHANNELS.SETTINGS_STORE_KEY)).toBe(true);
    expect(handlers.has(IPC_CHANNELS.PROFILE_GET)).toBe(true);
    expect(handlers.has(IPC_CHANNELS.PROFILE_SET)).toBe(true);
    expect(handlers.has(IPC_CHANNELS.AVATAR_SELECT)).toBe(true);
  });

  it('returns none when no key stored', () => {
    const handler = new SettingsIPCHandler(createMockKeyManager(false), new InMemoryConfigStore());
    handler.register(ipcMain);
    const getKeyState = handlers.get(IPC_CHANNELS.SETTINGS_GET_KEY_STATE);
    expect(getKeyState?.({})).toBe('none');
  });

  it('returns valid when key is stored', () => {
    const handler = new SettingsIPCHandler(createMockKeyManager(true), new InMemoryConfigStore());
    handler.register(ipcMain);
    const getKeyState = handlers.get(IPC_CHANNELS.SETTINGS_GET_KEY_STATE);
    expect(getKeyState?.({})).toBe('valid');
  });

  it('stores API key', () => {
    const keyMgr = createMockKeyManager();
    const handler = new SettingsIPCHandler(keyMgr, new InMemoryConfigStore());
    handler.register(ipcMain);
    const storeKey = handlers.get(IPC_CHANNELS.SETTINGS_STORE_KEY);
    storeKey?.({}, 'sk-ant-test');
    expect(keyMgr.storeKey).toHaveBeenCalledWith('sk-ant-test');
  });

  it('sets and gets profile', () => {
    const store = new InMemoryConfigStore();
    const handler = new SettingsIPCHandler(createMockKeyManager(), store);
    handler.register(ipcMain);
    const setProfile = handlers.get(IPC_CHANNELS.PROFILE_SET);
    setProfile?.({}, 'Root');
    const getProfile = handlers.get(IPC_CHANNELS.PROFILE_GET);
    const profile = getProfile?.({}) as { name: string } | undefined;
    expect(profile?.name).toBe('Root');
  });
});
