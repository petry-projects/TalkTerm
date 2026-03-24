import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      exclude: [
        'node_modules/',
        'src/main/main.ts',
        'src/preload/preload.ts',
        '**/*.config.*',
        '**/*.d.ts',
        '.vite/',
        'out/',
      ],
    },
  },
});
