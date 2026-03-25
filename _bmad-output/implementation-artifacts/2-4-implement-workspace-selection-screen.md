# Story 2.4: Implement Workspace Selection Screen

Status: ready-for-dev

## Story

As a new TalkTerm user,
I want to optionally connect a project folder or skip to use BMAD defaults,
So that TalkTerm knows which workspace to operate in for my AI-assisted workflows.

## Acceptance Criteria (BDD)

- Two paths: (a) browse local folder or paste Git URL, (b) "Skip — use BMAD defaults"
- Local folder: workspace path persisted, app proceeds to greeting
- Git URL: repo cloned to local dir, set as workspace
- Skip: BMAD-method repo cloned silently in background, no visible progress, avatar proceeds to greeting

## Tasks / Subtasks

1. Write failing tests for workspace manager in main process (AC: 1, 2, 3, 4)
   - Browse folder: validates path exists, persists to store
   - Git URL: validates URL format, clones repo, persists workspace path
   - Skip/BMAD default: triggers silent clone of BMAD-METHOD repo
   - Error cases: invalid path, clone failure, network error
2. Implement workspace-manager.ts in src/main/storage/ (AC: 1, 2, 3, 4)
3. Write failing tests for WorkspaceSelection component (AC: 1, 2, 3, 4)
   - Renders two paths: browse/paste and skip
   - Browse button opens system folder dialog
   - Git URL input with clone action
   - Skip button triggers BMAD default flow
   - Shows appropriate loading state during clone
   - Proceeds to greeting after workspace is set
4. Implement WorkspaceSelection component per UX-DR12 (AC: 1, 2, 3, 4)
5. Implement silent git clone for BMAD-method repo (AC: 4)
6. Wire IPC channels: workspace:browse, workspace:set, workspace:clone (AC: 2, 3)
7. Register IPC handlers in src/main/ipc/workspace-handlers.ts

## Dev Notes

- Electron `dialog.showOpenDialog` for folder browse (properties: ['openDirectory'])
- Git clone via `simple-git` npm package or `child_process.execFile('git', ['clone', ...])`
- BMAD-method repo: `https://github.com/bmadcode/BMAD-METHOD`
- Silent clone = no UI progress indicator, no confirmation dialog (FR53)
- Clone destination: app data directory (e.g., `app.getPath('userData')/workspaces/`)
- Workspace path stored in electron-store

### IPC Channels

- `workspace:browse` — opens native folder picker dialog, returns selected path
- `workspace:set` — persists workspace path to store
- `workspace:clone` — clones git repo to local directory, returns workspace path
- `workspace:get` — returns current workspace path or null

### Project Structure Notes

```
src/main/storage/
  workspace-manager.ts           (workspace path management + git clone)
  workspace-manager.test.ts

src/renderer/components/setup/
  WorkspaceSelection.tsx         (workspace selection screen)
  WorkspaceSelection.test.tsx

src/main/ipc/
  workspace-handlers.ts          (IPC handler registration for workspace:* channels)
  workspace-handlers.test.ts
```

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- UX Design: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR12)
- PRD: `_bmad-output/planning-artifacts/prd.md` — FR53 (BMAD-method default workspace)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.4
