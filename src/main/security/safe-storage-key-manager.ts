export interface KeyManager {
  storeKey(key: string): void;
  retrieveKey(): string | null;
  deleteKey(): void;
  hasKey(): boolean;
}

export interface SafeStorageAPI {
  isEncryptionAvailable(): boolean;
  encryptString(plainText: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

export class SafeStorageKeyManager implements KeyManager {
  private encryptedKey: Buffer | null = null;

  constructor(private readonly safeStorage: SafeStorageAPI) {}

  storeKey(key: string): void {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available — cannot store API key securely');
    }
    this.encryptedKey = this.safeStorage.encryptString(key);
  }

  retrieveKey(): string | null {
    if (this.encryptedKey === null) return null;
    try {
      return this.safeStorage.decryptString(this.encryptedKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[SafeStorageKeyManager] Failed to decrypt API key:', msg);
      // Return null instead of throwing — key retrieval failure shouldn't crash the app
      return null;
    }
  }

  deleteKey(): void {
    this.encryptedKey = null;
  }

  hasKey(): boolean {
    return this.encryptedKey !== null;
  }
}
