import { describe, it, expect } from 'vitest';
import { InMemoryConfigStore } from './electron-config-store';

describe('InMemoryConfigStore', () => {
  it('stores and retrieves values', () => {
    const store = new InMemoryConfigStore();
    store.set('name', 'Root');
    expect(store.get('name')).toBe('Root');
  });

  it('returns undefined for missing keys', () => {
    const store = new InMemoryConfigStore();
    expect(store.get('missing')).toBeUndefined();
  });

  it('checks key existence', () => {
    const store = new InMemoryConfigStore();
    store.set('key', 'value');
    expect(store.has('key')).toBe(true);
    expect(store.has('other')).toBe(false);
  });

  it('deletes keys', () => {
    const store = new InMemoryConfigStore();
    store.set('key', 'value');
    store.delete('key');
    expect(store.has('key')).toBe(false);
  });

  it('stores complex objects', () => {
    const store = new InMemoryConfigStore();
    store.set('profile', { name: 'Root', avatar: 'mary' });
    expect(store.get('profile')).toEqual({ name: 'Root', avatar: 'mary' });
  });
});
