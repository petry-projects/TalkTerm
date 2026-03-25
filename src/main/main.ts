import path from 'node:path';
import { app, BrowserWindow, safeStorage } from 'electron';
import { AgentMessageRouter } from './agent/agent-message-router';
import { ClaudeSdkBackend } from './agent/claude-sdk-backend';
import { SessionIPCHandler } from './ipc/session-ipc-handler';
import { SettingsIPCHandler } from './ipc/settings-ipc-handler';
import { checkAdminPrivileges } from './security/admin-check';
import { SafeStorageKeyManager } from './security/safe-storage-key-manager';
import { initializeDatabase } from './storage/database-initializer';
import { InMemoryConfigStore } from './storage/electron-config-store';
import { MemoryIndexStore } from './storage/memory-index-store';
import { SqliteAuditRepository } from './storage/sqlite-audit-repository';
import { SqliteSessionRepository } from './storage/sqlite-session-repository';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- Electron Forge requires CJS for squirrel startup
const squirrelStartup = require('electron-squirrel-startup') as boolean;
if (squirrelStartup) {
  app.quit();
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
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
  const agentBackend = new ClaudeSdkBackend(auditRepo, () => keyManager.retrieveKey());
  const _agentRouter = new AgentMessageRouter(agentBackend);

  // 5. IPC handlers — register with ipcMain
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic require for ipcMain in composition root
  const { ipcMain } = require('electron') as typeof import('electron');
  const settingsHandler = new SettingsIPCHandler(keyManager, configStore);
  const sessionHandler = new SessionIPCHandler(sessionRepo, configStore);
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

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL !== '') {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

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
