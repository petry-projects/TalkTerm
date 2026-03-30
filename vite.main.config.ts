import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3', '@anthropic-ai/claude-agent-sdk', 'sherpa-onnx-node'],
    },
  },
});
