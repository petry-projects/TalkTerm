# Story 12.2: Implement Auto-Update Mechanism

Status: ready-for-dev

## Story
As a TalkTerm user, I want the app to update itself when new versions are available, so that I always have the latest features and fixes without manual downloads.

## Acceptance Criteria (BDD)

```gherkin
Scenario: App checks for updates on launch
  Given TalkTerm launches
  When the app finishes initializing
  Then electron-updater checks GitHub Releases for a newer version
  And the check runs silently in the background without blocking the UI

Scenario: Update available triggers user notification
  Given a new version is available on GitHub Releases
  When the update check completes
  Then the user is notified that an update is available
  And the user can choose to install the update or defer

Scenario: Package manager formulas are updatable on release
  Given a new version is published to GitHub Releases
  When the release workflow completes
  Then the Homebrew cask formula (macOS) can be updated to reference the new version
  And the winget manifest (Windows) can be updated to reference the new version
```

## Tasks / Subtasks

1. **Write tests for update checker** (AC: 1)
   - Test that update check is triggered after app initialization
   - Test that update check does not block the main window from rendering
   - Test handling of "no update available" response
   - Test handling of network failure during update check
   - Test handling of "update available" response with version info

2. **Implement auto-update with electron-updater** (AC: 1, 2)
   - Create `AutoUpdater` class in `src/main/auto-updater.ts`
   - Configure electron-updater to check GitHub Releases
   - Set `autoDownload: false` — user must consent before downloading
   - Trigger check on app `ready` event, after main window is shown
   - Handle update events: `update-available`, `update-not-available`, `error`, `download-progress`, `update-downloaded`

3. **Implement update notification UI** (AC: 2)
   - Create subtle notification bar or non-modal dialog in renderer
   - Show: new version number, "Install Update" button, "Later" button
   - "Install Update": trigger download, show progress, then `quitAndInstall`
   - "Later": dismiss notification, do not nag again until next launch
   - Send update status from main to renderer via IPC: `update:available`, `update:progress`, `update:ready`

4. **Create Homebrew cask formula template** (AC: 3)
   - Create `homebrew/talkterm.rb` template
   - Include: app name, version placeholder, download URL pattern, SHA256 placeholder
   - Document manual or automated steps to update the formula on release

5. **Create winget manifest template** (AC: 3)
   - Create `winget/talkterm.yaml` template
   - Include: package identifier, version placeholder, installer URL pattern, SHA256 placeholder
   - Document submission process to winget-pkgs repository

## Dev Notes

### Architecture Guardrails
- Auto-updater logic lives in `src/main/auto-updater.ts` — main process only
- Update notification UI in renderer — receives status via IPC, never imports from main
- IPC channels: `update:available`, `update:progress`, `update:ready`, `update:install`
- electron-updater reads from `@electron-forge/publisher-github` configuration
- Update check must not block app startup — run asynchronously after window is shown

### Key Patterns
- electron-updater: `@electron-forge/publisher-github` for publishing, `electron-updater` for checking
- Update flow: check -> notify -> user consents -> download -> notify ready -> user consents -> quitAndInstall
- Notification: subtle, non-intrusive — notification bar at top of window or small dialog
- Homebrew cask: ruby formula in separate tap repo or project directory
- winget: YAML manifest following winget-pkgs format

### Testing
- TDD: write failing tests first for update checker behavior
- Mock electron-updater `autoUpdater` object for unit tests
- Test all event handlers: update-available, update-not-available, error, download-progress, update-downloaded
- React Testing Library for notification UI
- E2E: manual verification (auto-update is difficult to test in CI)

### Project Structure Notes
- `src/main/auto-updater.ts` — auto-update orchestration
- `src/main/auto-updater.test.ts` — co-located tests
- `src/renderer/components/overlay/UpdateNotification.tsx` — update notification UI
- `src/renderer/components/overlay/UpdateNotification.test.tsx` — co-located tests
- `homebrew/talkterm.rb` — Homebrew cask formula template
- `winget/talkterm.yaml` — winget manifest template

### References
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` (Epic 12, Story 12.2)
- Depends on: Story 12.1 (CI/CD pipeline and GitHub Releases publishing)
- electron-updater docs: https://www.electron.build/auto-update
