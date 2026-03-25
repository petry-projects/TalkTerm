# Story 1.2: Implement Admin Privilege Check with Blocking Error Screen

Status: ready-for-dev

## Story

As a TalkTerm user launching the app,
I want the app to verify it has administrator privileges before starting,
So that the Claude Agent SDK can access the file system, run shell commands, and use MCP tools without permission failures mid-workflow.

## Acceptance Criteria (BDD)

- Given macOS with admin privileges, When main process runs admin check, Then check passes silently and app proceeds
- Given macOS without admin, When check runs, Then blocking error screen with warning icon (48px, #E0301E), title "TalkTerm needs admin privileges", macOS-specific instructions, Retry + Quit buttons
- Given Windows without elevated privileges, Then Windows-specific instructions ("Right-click → Run as administrator"), only platform-relevant instructions shown
- Given admin check screen displayed, When user relaunches with admin and clicks Retry, Then check passes and app proceeds

## Tasks / Subtasks

1. Write failing tests for admin check logic: passes on admin, fails on non-admin (AC: 1, 2) — mock process.getuid() for macOS, is-elevated for Windows
2. Implement admin-check.ts in src/main/security/ with platform detection (AC: 1, 2, 3)
3. Write failing tests for AdminBlockScreen React component (AC: 2, 3)
   - Renders warning icon, title, platform-specific instructions
   - Shows macOS instructions on macOS, Windows instructions on Windows (never both)
   - Retry button triggers re-check via IPC
   - Quit button triggers app quit via IPC
4. Implement AdminBlockScreen component with UX-DR10 specs (AC: 2, 3, 4)
5. Wire admin check into main.ts composition root as first operation (AC: 1)
6. Wire IPC channels: security:check-admin, security:retry-admin, security:quit (AC: 4)
7. Write integration test: admin check → proceed or block (AC: 4)

## Dev Notes

- macOS detection: `process.getuid() === 0` or membership in admin group
- Windows detection: use `is-elevated` npm package (or native check)
- This is a BLOCKING gate — no other app functionality accessible until admin confirmed
- Only show relevant platform instructions (not both)
- Error follows the conversational error pattern but this is a special case — it is a pre-conversation blocking screen

### UX Specs (UX-DR10)

- Center stage only, blocking overlay
- Warning icon: 48px, Danger color (#E0301E)
- Title: Display size (28px/700), "TalkTerm needs admin privileges"
- Body: Text Muted on dark (#A0A0A0)
- Platform instruction box: Surface Muted (#2A2A2A) background, monospace font for terminal commands
- Retry button: Primary accent (#EB8C00)
- Quit button: Ghost style

### Design Tokens

- Primary Tangerine: #EB8C00
- Danger Red: #E0301E
- Stage Background: #1A1A1A
- Surface Muted: #2A2A2A
- Text On Dark: #F0F0F0
- Text Muted on Dark: #A0A0A0

### Project Structure Notes

```
src/main/security/
  admin-check.ts             (admin privilege detection logic)
  admin-check.test.ts        (co-located unit tests)

src/renderer/components/setup/
  AdminBlockScreen.tsx        (blocking error screen component)
  AdminBlockScreen.test.tsx   (co-located component tests)

src/main/ipc/
  security-handlers.ts       (IPC handler registration for security:* channels)
```

### Testing Notes

- Mock `process.getuid()` for macOS admin detection
- Mock `is-elevated` (or equivalent) for Windows detection
- Mock `process.platform` to test platform-specific rendering
- Renderer tests mock `window.electronAPI` (preload bridge) — never import from src/main/
- Test all 4 AC scenarios explicitly

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- UX Design: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR10)
- PRD: `_bmad-output/planning-artifacts/prd.md` — FR39 (admin check), NFR4 (launch time), NFR9 (TLS)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.2
