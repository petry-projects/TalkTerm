# Story 2.5: Implement Combined Launch State Assessment

Status: ready-for-dev

## Story

As a returning TalkTerm user,
I want the app to skip completed setup steps and take me directly where I need to be,
So that I do not have to repeat setup every time I launch the app.

## Acceptance Criteria (BDD)

- After admin check, simultaneously read: API key validity, profile completeness, avatar selection, workspace selection
- Route to first incomplete step (not sequential re-check of all steps)
- Expired/revoked key → API key screen with message
- All complete → avatar greeting in under 2 seconds (NFR4)
- Each setup step persists immediately (crash-safe)

## Tasks / Subtasks

1. Write failing tests for LaunchStateAssessor (AC: 1, 2, 3, 4, 5)
   - All states complete: returns "ready"
   - Missing API key: returns "needs-key"
   - Expired/revoked key: returns "needs-key" with expiry reason
   - Missing profile: returns "needs-profile"
   - Missing avatar: returns "needs-avatar"
   - Missing workspace: returns "needs-workspace"
   - Multiple missing: returns first incomplete in priority order
   - All checks run in parallel (Promise.all)
2. Implement launch-state-assessor.ts in src/main/ (AC: 1, 2, 3, 4, 5)
3. Write failing tests for setup routing logic in renderer (AC: 2, 3, 4)
   - Routes to correct setup screen based on assessed state
   - Shows expired key message when key was previously valid
   - Routes directly to main app when all complete
4. Implement SetupRouter component/hook (AC: 2, 3, 4)
5. Wire IPC channel: launch:assess-state (AC: 1)
6. Register IPC handler in appropriate handler file
7. Write performance test: all-complete path completes under 2 seconds (AC: 4)

## Dev Notes

- All 4 state checks run in parallel via `Promise.all`, not sequential
- Priority order for routing: key → profile → avatar → workspace
- NFR4: app launch to avatar-ready must be 3 seconds or less total; the state assessment itself should complete well under 2 seconds
- Each setup step already persists immediately via electron-store (crash-safe by design)

### Launch State Enum

```typescript
type LaunchState =
  | { status: 'needs-key'; reason?: 'missing' | 'expired' | 'revoked' }
  | { status: 'needs-profile' }
  | { status: 'needs-avatar' }
  | { status: 'needs-workspace' }
  | { status: 'ready' };
```

### IPC Channels

- `launch:assess-state` — runs parallel checks, returns LaunchState

### Project Structure Notes

```
src/main/
  launch-state-assessor.ts       (parallel state assessment orchestrator)
  launch-state-assessor.test.ts

src/renderer/hooks/
  useSetupRouter.ts              (hook that consumes launch state and routes)
  useSetupRouter.test.ts

src/renderer/components/setup/
  SetupRouter.tsx                (optional: component wrapper for routing logic)
  SetupRouter.test.tsx
```

### Testing Notes

- Mock all 4 dependency stores (key manager, profile store, avatar store, workspace manager)
- Test that Promise.all is used (not sequential awaits) — verify parallel execution
- Test each combination of missing states routes to correct screen
- Performance assertion: mock stores to return instantly, verify assessor completes in < 100ms

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- PRD: `_bmad-output/planning-artifacts/prd.md` — NFR4 (launch performance)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.5
