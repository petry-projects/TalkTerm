/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  mutate: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.ts',
    '!src/preload/**',
    '!src/main/main.ts',
    '!src/main/speech/**',
    '!src/main/ipc/speech-ipc-handler.ts',
    '!src/renderer/speech/ipc-speech-stt.ts',
    '!src/renderer/speech/web-speech-stt.ts',
    '!src/**/*.d.ts',
  ],
  reporters: ['html', 'clear-text', 'progress'],
  ignorePatterns: ['out', '.vite', '.stryker-tmp', 'node_modules'],
  thresholds: {
    high: 90,
    low: 80,
    break: 80,
  },
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
