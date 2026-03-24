# Story 4.3: Implement IPC Message Bridge

Status: ready-for-dev

## Story
As a developer, I want a structured IPC message bridge between main and renderer, so that cross-process communication is type-safe, consistent, and maintainable.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Messages follow IPCMessage envelope format
  Given an IPC message is created
  Then it has a typed IPCMessage<T> envelope with channel, payload, and timestamp fields

Scenario: Channels use namespace:verb naming
  Given IPC channels are defined
  Then all channels follow the namespace:verb naming convention
  And channels include: agent:message, agent:error, agent:confirm, session:start, session:resume, session:updated, settings:get, settings:set, settings:validate-key

Scenario: Main streams messages to renderer
  Given the agent is processing
  When agent events occur
  Then they are sent to the renderer via mainWindow.webContents.send on channels: agent:message, agent:error, session:updated

Scenario: Renderer invokes main process actions
  Given the renderer needs to trigger an action
  When it calls ipcRenderer.invoke
  Then it uses channels: agent:action, session:start, session:resume, settings:get, settings:set
  And receives typed responses

Scenario: Cancel propagates through IPC
  Given the agent is processing a request
  When the renderer sends a cancel action
  Then SDK query.cancel() is called through the IPC bridge
```

## Tasks / Subtasks

1. **Write tests for IPCMessage type and envelope creation** — validates structure (AC: 1)
2. **Define IPCMessage<T> type** in src/shared/types/ (AC: 1)
3. **Write tests for IPC handler registration** — handlers registered for all channels (AC: 2, 3)
4. **Implement IPC handlers** in src/main/ipc/ — agent, session, settings handlers (AC: 3, 4)
5. **Write tests for preload bridge exposure** — all methods available on window.electronAPI (AC: 4)
6. **Implement preload.ts** with contextBridge.exposeInMainWorld (AC: 4, 5)
7. **Define window.electronAPI type** for renderer consumption (AC: 4)

## Dev Notes

- `contextBridge.exposeInMainWorld("electronAPI", { ... })` is the only safe way to expose main process functionality to the renderer.
- The `window.electronAPI` typed interface is the architectural seam for renderer tests. Renderer tests mock this interface — they never import from `src/main/`.
- IPC handlers are split by domain: `agent-ipc-handler.ts`, `session-ipc-handler.ts`, `settings-ipc-handler.ts`.
- Channel naming follows `namespace:verb` convention per project naming rules.
- Cancel flow: renderer calls `window.electronAPI.agentCancel()` -> ipcMain handler -> `agentBackend.cancelCurrentAction()` -> SDK `query.cancel()`.

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/shared/types/ipc-message.ts` | IPCMessage<T> envelope type |
| `src/main/ipc/agent-ipc-handler.ts` | Agent-related IPC handlers |
| `src/main/ipc/agent-ipc-handler.test.ts` | Agent IPC handler tests |
| `src/main/ipc/session-ipc-handler.ts` | Session-related IPC handlers |
| `src/main/ipc/session-ipc-handler.test.ts` | Session IPC handler tests |
| `src/main/ipc/settings-ipc-handler.ts` | Settings-related IPC handlers |
| `src/main/ipc/settings-ipc-handler.test.ts` | Settings IPC handler tests |
| `src/preload/preload.ts` | contextBridge exposure to renderer |
| `src/shared/types/electron-api.d.ts` | window.electronAPI type definition |

### References

- PRD: FR10, FR11
- Architecture: IPC layer, preload gateway, process boundary enforcement
- Epics: Epic 4, Story 4.3
