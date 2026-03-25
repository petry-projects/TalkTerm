import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  server: {
    watch: {
      // Exclude non-source directories from file watching
      ignored: ['**/node_modules/**', '**/_bmad/**', '**/_bmad-output/**', '**/test/**'],
    },
  },
  optimizeDeps: {
    // Only scan src/renderer for dependency pre-bundling
    entries: ['src/renderer/**/*.{ts,tsx}'],
  },
});
