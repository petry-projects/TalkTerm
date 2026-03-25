# Story 2.1: Implement API Key Entry with Live Validation

Status: ready-for-dev

## Story

As a new TalkTerm user,
I want to enter my Anthropic API key in a guided setup screen with live validation,
So that TalkTerm can connect to Claude and I know immediately if my key works.

## Acceptance Criteria (BDD)

- Centered setup card (Surface Muted #2A2A2A, 80% opacity, max-width 420px) with heading "Get Started", description, text input (placeholder sk-ant-api03-...), help link, Continue button
- Key validated against Anthropic API (not just format), Continue shows "Validating..." disabled during validation
- Valid: encrypted via safeStorage.encryptString(), stored in OS credential store, Success border (#2E7D32), checkmark, "Key verified", Continue enabled
- Invalid: inline error with specific reason, Danger/Warning border, key not stored, Continue disabled
- Key masked after entry (dots/bullets)
- Help link opens Anthropic console in system browser

## Tasks / Subtasks

1. Write failing tests for API key validation service in main process — test format check, API call success, API call failure, network error (AC: 2, 3, 4)
2. Implement api-key-validator.ts in src/main/security/ (AC: 2, 3, 4)
3. Write failing tests for SafeStorageKeyManager — encrypt, decrypt, store, retrieve, delete (AC: 3)
4. Implement SafeStorageKeyManager in src/main/security/ using Electron safeStorage (AC: 3)
5. Write failing tests for ApiKeySetup React component — all validation states (AC: 1, 2, 3, 4, 5, 6)
   - Empty state: Continue disabled
   - Typing state: key masked, Continue disabled
   - Validating state: "Validating..." text, Continue disabled, spinner
   - Valid state: Success border (#2E7D32), checkmark icon, "Key verified", Continue enabled
   - Invalid format: inline error, Danger border
   - Invalid key (API rejected): inline error with reason, Warning border
   - Network error: inline error with retry suggestion
   - Help link click: opens external URL
6. Implement ApiKeySetup component per UX-DR11 (AC: 1, 2, 3, 4, 5, 6)
7. Wire IPC channels: settings:validate-key, settings:store-key, settings:get-key-state (AC: 2, 3)
8. Register IPC handlers in src/main/ipc/settings-handlers.ts

## Dev Notes

- safeStorage.encryptString() for storage, decryptString() for retrieval
- NEVER store key in plaintext, logs, or client-side code (NFR6)
- Validation is a real API call, not just regex format check
- Debounce validation — do not call API on every keystroke

### Validation States

| State | Border Color | Icon | Message | Continue |
|-------|-------------|------|---------|----------|
| empty | default | none | none | disabled |
| typing | default | none | none | disabled |
| validating | default | spinner | "Validating..." | disabled |
| valid | Success #2E7D32 | checkmark | "Key verified" | enabled |
| invalid-format | Danger #E0301E | warning | "Invalid key format" | disabled |
| invalid-key | Warning #EB8C00 | warning | specific reason | disabled |
| expired/revoked | Warning #EB8C00 | warning | "Key expired or revoked" | disabled |
| network-error | Warning #EB8C00 | warning | "Network error — check connection" | disabled |

### IPC Channels

- `settings:validate-key` — validates key against Anthropic API
- `settings:store-key` — encrypts and stores validated key
- `settings:get-key-state` — returns current key state (exists, valid, missing)

### Project Structure Notes

```
src/main/security/
  api-key-validator.ts           (API key validation logic)
  api-key-validator.test.ts
  safe-storage-key-manager.ts    (encrypt/decrypt/store via safeStorage)
  safe-storage-key-manager.test.ts

src/renderer/components/setup/
  ApiKeySetup.tsx                (setup screen component)
  ApiKeySetup.test.tsx

src/main/ipc/
  settings-handlers.ts           (IPC handler registration for settings:* channels)
  settings-handlers.test.ts
```

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- UX Design: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR11)
- PRD: `_bmad-output/planning-artifacts/prd.md` — FR40/FR41/FR42 (API key entry), NFR6 (key security)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.1
