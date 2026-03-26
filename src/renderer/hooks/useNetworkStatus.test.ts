// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  it('starts as online', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('detects offline event', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);
  });

  it('detects online event', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });
});
