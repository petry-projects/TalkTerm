/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks */
import { describe, it, expect, vi } from 'vitest';
import { SafeStorageKeyManager, type SafeStorageAPI } from './safe-storage-key-manager';

function createMockSafeStorage(available = true): SafeStorageAPI {
  return {
    isEncryptionAvailable: vi.fn().mockReturnValue(available),
    encryptString: vi.fn((text: string) => Buffer.from(`encrypted:${text}`)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace('encrypted:', '')),
  };
}

describe('SafeStorageKeyManager', () => {
  it('stores and retrieves a key', () => {
    const mgr = new SafeStorageKeyManager(createMockSafeStorage());
    mgr.storeKey('sk-ant-api03-test');
    expect(mgr.retrieveKey()).toBe('sk-ant-api03-test');
  });

  it('returns null when no key stored', () => {
    const mgr = new SafeStorageKeyManager(createMockSafeStorage());
    expect(mgr.retrieveKey()).toBeNull();
  });

  it('reports hasKey correctly', () => {
    const mgr = new SafeStorageKeyManager(createMockSafeStorage());
    expect(mgr.hasKey()).toBe(false);
    mgr.storeKey('sk-ant-api03-test');
    expect(mgr.hasKey()).toBe(true);
  });

  it('deletes a key', () => {
    const mgr = new SafeStorageKeyManager(createMockSafeStorage());
    mgr.storeKey('sk-ant-api03-test');
    mgr.deleteKey();
    expect(mgr.hasKey()).toBe(false);
    expect(mgr.retrieveKey()).toBeNull();
  });

  it('throws when encryption not available', () => {
    const mgr = new SafeStorageKeyManager(createMockSafeStorage(false));
    expect(() => {
      mgr.storeKey('sk-ant-test');
    }).toThrow('Encryption not available');
  });

  it('uses safeStorage.encryptString for storage', () => {
    const safeStorage = createMockSafeStorage();
    const mgr = new SafeStorageKeyManager(safeStorage);
    mgr.storeKey('sk-ant-test');
    expect(safeStorage.encryptString).toHaveBeenCalledWith('sk-ant-test');
  });
});
