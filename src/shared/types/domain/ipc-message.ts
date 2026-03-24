export interface IPCMessage<T> {
  channel: string;
  payload: T;
  timestamp: number;
}

export function createIPCMessage<T>(channel: string, payload: T): IPCMessage<T> {
  return {
    channel,
    payload,
    timestamp: Date.now(),
  };
}
