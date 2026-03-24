// Preload script — exposes main process APIs to renderer via contextBridge.
// See: https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge } from 'electron';

// Expose a typed API to the renderer process.
// Each IPC channel will be added here as features are implemented.
contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder — channels added per story (agent:*, session:*, settings:*, etc.)
});
