export interface IPCMain {
  handle(channel: string, handler: (event: unknown, ...args: unknown[]) => unknown): void;
  on(channel: string, handler: (event: unknown, ...args: unknown[]) => void): void;
}

export interface IPCRegistrar {
  register(ipcMain: IPCMain): void;
}
