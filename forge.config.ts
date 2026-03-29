import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import path from 'node:path';
import fs from 'node:fs';

function copyNativeModules(
  buildPath: string,
  _electronVersion: string,
  _platform: string,
  _arch: string,
  callback: (err?: Error) => void,
): void {
  // Copy better-sqlite3 native module into the packaged app
  const src = path.join(__dirname, 'node_modules', 'better-sqlite3');
  const dest = path.join(buildPath, 'node_modules', 'better-sqlite3');
  fs.cpSync(src, dest, { recursive: true });

  // Also copy bindings (dependency of better-sqlite3)
  const bindingsSrc = path.join(__dirname, 'node_modules', 'bindings');
  const bindingsDest = path.join(buildPath, 'node_modules', 'bindings');
  if (fs.existsSync(bindingsSrc)) {
    fs.cpSync(bindingsSrc, bindingsDest, { recursive: true });
  }

  // Also copy file-uri-to-path (dependency of bindings)
  const furiSrc = path.join(__dirname, 'node_modules', 'file-uri-to-path');
  const furiDest = path.join(buildPath, 'node_modules', 'file-uri-to-path');
  if (fs.existsSync(furiSrc)) {
    fs.cpSync(furiSrc, furiDest, { recursive: true });
  }

  callback();
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/node_modules/better-sqlite3/**',
    },
    name: 'TalkTerm',
    afterCopy: [copyNativeModules],
  },
  rebuildConfig: {
    onlyModules: ['better-sqlite3'],
  },
  makers: [
    new MakerSquirrel({
      name: 'TalkTerm',
    }),
    new MakerDMG({
      name: 'TalkTerm',
      format: 'ULFO',
    }),
    new MakerZIP({}, ['darwin', 'linux']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
