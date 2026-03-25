# Story 7.2: Implement Network Loss Detection and Auto-Recovery

Status: ready-for-dev

## Story
As a TalkTerm user, I want the app to handle network issues automatically, so that my workflow is not disrupted by temporary connectivity problems.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Network lost mid-session pauses workflow
  Given an active agent session is in progress
  When network connectivity is lost
  Then the workflow pauses and no agent actions are attempted
  And the avatar displays a connectivity error via text overlay ("Connection issue")
  And the StatusIndicator shows Danger color

Scenario: Network restored resumes session automatically
  Given the workflow is paused due to network loss
  When network connectivity is restored
  Then the session resumes automatically without requiring a restart (FR38)
  And the avatar says "We're back — picking up where we left off"
```

## Tasks / Subtasks

1. **Write tests for network monitor** — online/offline detection, event emission (AC: 1)
2. **Implement network-monitor.ts** — detect connectivity changes (AC: 1)
3. **Write tests for workflow pause/resume on connectivity change** — verify agent stops sending, queues input, resumes correctly (AC: 1, 2)
4. **Implement pause/resume logic in agent session manager** — pause on offline, resume on online (AC: 1, 2)
5. **Write tests for StatusIndicator network error state** — static dot, "Connection issue", Danger color (AC: 1)
6. **Wire network state to StatusIndicator and avatar speech** — connect monitor events to UI (AC: 1, 2)

## Dev Notes

### Network Detection Strategy
- Renderer-side: `navigator.onLine` + `window.addEventListener('online'/'offline')` for immediate detection
- Alternatively main-side: Electron `net` module for more reliable detection
- Consider both: renderer detects quickly, main process validates before resuming

### Pause Behavior
- Stop sending messages to SDK backend
- Queue any pending user input (voice or text)
- Do not discard in-flight requests — let them timeout naturally

### Resume Behavior
- Verify connectivity with a lightweight check before resuming
- Reconnect to SDK session (session ID preserved)
- Replay queued user messages in order
- Avatar announces recovery: "We're back — picking up where we left off"

### StatusIndicator Error State
- Static dot (no animation)
- Text: "Connection issue"
- Color: Danger (#E0301E)

### Project Structure Notes
- `src/main/agent/network-monitor.ts` (or `src/renderer/hooks/useNetworkStatus.ts` if renderer-side)
- Agent session manager in `src/main/agent/` — add pause/resume capability
- StatusIndicator component updates in `src/renderer/components/`

### References
- FR38 — auto-resume without restart
- StatusIndicator design — Danger color (#E0301E), static dot
