# Story 6.6: Implement Activity Feed Display Mode

Status: ready-for-dev

## Story
As a technical user, I want an optional streaming agent action log, so that I can observe what the agent is doing in real time for transparency and debugging.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Streaming action log
  Given the activity feed is visible
  Then it displays a streaming text log of agent actions in real time
  And each entry shows a timestamp, action type, and brief description

Scenario: AC2 - Opt-in visibility
  Given the activity feed exists
  Then it is hidden by default
  And becomes visible when the user opts in via settings or voice command
```

## Tasks / Subtasks

1. **Write tests for `ActivityFeed` component** — streaming log updates, entry format, toggle visibility, auto-scroll (AC: 1, 2)
2. **Implement `ActivityFeed` display mode component** (AC: 1, 2)

## Dev Notes

- Log entry format: `[HH:MM:SS] action-type: brief description`
- Hidden by default — toggled via user preference in settings or a voice command like "show activity log"
- Auto-scroll to bottom on new entries; pause auto-scroll if user scrolls up manually
- Resume auto-scroll when user scrolls back to bottom
- Keep a reasonable buffer (e.g., last 500 entries) to avoid memory growth

### Project Structure Notes
- `src/renderer/components/display/ActivityFeed.tsx` — activity feed display mode
- `src/renderer/components/display/ActivityFeed.test.tsx` — co-located tests

### References
- UX Design Spec: UX-DR13 (Display modes in OutputPanel)
