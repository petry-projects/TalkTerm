import path from 'node:path';
import { app, BrowserWindow, safeStorage } from 'electron';
import type { AuthMode } from '../shared/types/ports/agent-backend';
import { AgentMessageRouter } from './agent/agent-message-router';
import { ClaudeSdkBackend } from './agent/claude-sdk-backend';
import { AgentIPCHandler } from './ipc/agent-ipc-handler';
import { SessionIPCHandler } from './ipc/session-ipc-handler';
import { SettingsIPCHandler } from './ipc/settings-ipc-handler';
import { checkAdminPrivileges } from './security/admin-check';
import { SafeStorageKeyManager } from './security/safe-storage-key-manager';
import { initializeDatabase } from './storage/database-initializer';
import { InMemoryConfigStore } from './storage/electron-config-store';
import { MemoryIndexStore } from './storage/memory-index-store';
import { SqliteAuditRepository } from './storage/sqlite-audit-repository';
import { SqliteSessionRepository } from './storage/sqlite-session-repository';

// Squirrel.Windows startup handling — only needed on Windows
if (process.platform === 'win32') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Electron Forge requires CJS for squirrel startup
    const squirrelStartup = require('electron-squirrel-startup') as boolean;
    if (squirrelStartup) {
      app.quit();
    }
  } catch {
    // Module not available in production builds — safe to ignore on non-Windows
  }
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// --- Composition Root ---
// All dependencies constructed here, wired via manual constructor injection.
// No DI framework — this is the only place where concrete implementations are created.

let mainWindow: BrowserWindow | null = null;

function bootstrap(): void {
  // 1. Admin privilege check
  const adminResult = checkAdminPrivileges();

  // 2. Initialize persistence with real better-sqlite3
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module
  const BetterSqlite3 = require('better-sqlite3') as typeof import('better-sqlite3');
  const dbPath = path.join(app.getPath('userData'), 'talkterm.db');
  const db = new BetterSqlite3(dbPath);
  db.pragma('journal_mode = WAL');
  initializeDatabase(db);
  const sessionRepo = new SqliteSessionRepository(db);
  const auditRepo = new SqliteAuditRepository(db);
  const _memoryStore = new MemoryIndexStore(db);
  const configStore = new InMemoryConfigStore();

  // 3. Security — use Electron's safeStorage for API key encryption
  const keyManager = new SafeStorageKeyManager({
    isEncryptionAvailable: () => safeStorage.isEncryptionAvailable(),
    encryptString: (text: string) => safeStorage.encryptString(text),
    decryptString: (buf: Buffer) => safeStorage.decryptString(buf),
  });

  // 4. Agent backend
  const agentBackend = new ClaudeSdkBackend(
    auditRepo,
    () => keyManager.retrieveKey(),
    (): AuthMode => {
      const mode = configStore.get('authMode');
      return mode === 'claude-subscription' ? 'claude-subscription' : 'api-key';
    },
  );
  const agentRouter = new AgentMessageRouter(agentBackend);

  // 5. IPC handlers — register with ipcMain
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require for ipcMain in composition root
  const { ipcMain } = require('electron') as typeof import('electron');
  const agentHandler = new AgentIPCHandler(agentRouter, () => mainWindow?.webContents ?? null);
  const settingsHandler = new SettingsIPCHandler(keyManager, configStore);
  const sessionHandler = new SessionIPCHandler(sessionRepo, configStore);
  agentHandler.register(ipcMain);
  settingsHandler.register(ipcMain);
  sessionHandler.register(ipcMain);

  // 6. Create window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'TalkTerm',
    backgroundColor: '#1A1A1A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 7. Send admin check result to renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('admin:check-result', adminResult);
  });

  // Log renderer errors to stderr for debugging
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('did-fail-load:', errorCode, errorDescription);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('render-process-gone:', details);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL !== undefined && MAIN_WINDOW_VITE_DEV_SERVER_URL !== '') {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Force window to foreground
  mainWindow.show();
  mainWindow.focus();
  app.focus({ steal: true });

  // Ctrl+D / Cmd+D to toggle DevTools (developer/debug view)
  // Use before-input-event instead of globalShortcut for reliable packaged-app support
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'd' && (input.control || input.meta) && input.type === 'keyDown') {
      if (mainWindow?.webContents.isDevToolsOpened() === true) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow?.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });

  // 8. Crash-safe session persistence
  app.on('before-quit', () => {
    db.close();
  });
}

void app.whenReady().then(() => {
  bootstrap();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      bootstrap();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
