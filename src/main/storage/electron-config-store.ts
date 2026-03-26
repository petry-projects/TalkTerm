export interface ConfigStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  has(key: string): boolean;
  delete(key: string): void;
}

export class InMemoryConfigStore implements ConfigStore {
  private data = new Map<string, unknown>();

  get(key: string): unknown {
    return this.data.get(key);
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): void {
    this.data.delete(key);
  }
}
