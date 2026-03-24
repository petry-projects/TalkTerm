import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAdminPrivileges, type AdminCheckResult } from './admin-check';

describe('checkAdminPrivileges', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('on macOS', () => {
    it('returns isAdmin true when process.getuid returns 0 (root)', () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'darwin',
        getuid: () => 0,
      });

      const result: AdminCheckResult = checkAdminPrivileges();
      expect(result.isAdmin).toBe(true);
      expect(result.platform).toBe('darwin');
    });

    it('returns isAdmin false when process.getuid returns non-zero', () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'darwin',
        getuid: () => 501,
      });

      const result: AdminCheckResult = checkAdminPrivileges();
      expect(result.isAdmin).toBe(false);
      expect(result.platform).toBe('darwin');
      expect(result.instructions).toContain('sudo');
    });
  });

  describe('on Windows', () => {
    it('returns isAdmin true when elevated check succeeds', () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'win32',
        getuid: undefined,
      });

      const result: AdminCheckResult = checkAdminPrivileges({ isElevated: true });
      expect(result.isAdmin).toBe(true);
      expect(result.platform).toBe('win32');
    });

    it('returns isAdmin false when not elevated', () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'win32',
        getuid: undefined,
      });

      const result: AdminCheckResult = checkAdminPrivileges({ isElevated: false });
      expect(result.isAdmin).toBe(false);
      expect(result.platform).toBe('win32');
      expect(result.instructions).toContain('Run as administrator');
    });
  });

  describe('on Linux', () => {
    it('returns isAdmin true when process.getuid returns 0', () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'linux',
        getuid: () => 0,
      });

      const result: AdminCheckResult = checkAdminPrivileges();
      expect(result.isAdmin).toBe(true);
      expect(result.platform).toBe('linux');
    });

    it('returns isAdmin false when process.getuid returns non-zero', () => {
      vi.stubGlobal('process', {
        ...process,
        platform: 'linux',
        getuid: () => 1000,
      });

      const result: AdminCheckResult = checkAdminPrivileges();
      expect(result.isAdmin).toBe(false);
      expect(result.platform).toBe('linux');
      expect(result.instructions).toContain('sudo');
    });
  });

  it('returns platform-specific instructions only for the current platform', () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'darwin',
      getuid: () => 501,
    });

    const result: AdminCheckResult = checkAdminPrivileges();
    expect(result.instructions).toContain('sudo');
    expect(result.instructions).not.toContain('Run as administrator');
  });
});
