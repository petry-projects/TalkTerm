# Story 9.2: Implement Session Action History Viewer

Status: ready-for-dev

## Story
As a TalkTerm user, I want to view a history of agent actions from my session, so that I can review what the agent did, verify its work, and understand the sequence of events.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AuditLog displays chronological action list
  Given a session has audit entries
  When the AuditLog component is rendered
  Then it displays a chronological list of actions with timestamps, action types, and outcomes (FR28)

Scenario: AuditLog is scrollable and filterable
  Given the AuditLog is displayed with many entries
  When the user interacts with the log
  Then the list is scrollable
  And the user can filter by action type and outcome
```

## Tasks / Subtasks

1. **Write tests for AuditLog component** — renders entries chronologically, supports scrolling, displays timestamps/types/outcomes (AC: 1, 2)
2. **Implement AuditLog component** in src/renderer/components/session/ (AC: 1, 2)
3. **Write tests for filter controls** — filter by action type (dropdown), filter by outcome (success/failure/all) (AC: 2)
4. **Implement filter UI** — action type dropdown, outcome toggle (AC: 2)
5. **Wire IPC channel** — `audit:get-session-history(sessionId)` returns `AuditEntry[]` (AC: 1)

## Dev Notes

### AuditLog Display Format
- List or table layout: `timestamp | action_type | outcome | brief description`
- Timestamps: human-readable format (e.g., "2:34 PM" or "14:34:12")
- Action types: display with readable labels (e.g., "tool:bash" → "Bash Command")
- Outcomes: styled distinctly — success (green + checkmark), failure (red + X), cancelled (grey + dash)
- Brief description: extracted from `details` JSON or `user_intent` field

### Filter Controls
- Action type: dropdown with all observed action types + "All" option
- Outcome: toggle group — All | Success | Failure | Cancelled
- Filters apply immediately (no submit button)

### IPC Channel
- Channel: `audit:get-session-history`
- Request: `{ sessionId: string }`
- Response: `AuditEntry[]` (sorted by timestamp ascending)
- Handler registered in `src/main/ipc/`

### Accessibility
- Scrollable region with proper `role="log"` or `role="list"` ARIA attributes
- Filter controls keyboard-accessible
- Outcome icons paired with text labels (not color alone, per Story 8.4)

### Project Structure Notes
- `src/renderer/components/session/AuditLog.tsx` — main component
- IPC handler in `src/main/ipc/` for `audit:get-session-history`
- Consumes AuditEntry type from `src/shared/types/domain/audit-entry.ts`
- Could be accessible from Activity Feed or a dedicated panel view

### References
- FR28 — action history viewable by user
- Story 9.1 — provides the AuditRepository and AuditEntry types this story consumes
