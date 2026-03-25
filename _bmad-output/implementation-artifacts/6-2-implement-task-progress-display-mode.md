# Story 6.2: Implement Task Progress Display Mode

Status: ready-for-dev

## Story
As a TalkTerm user, I want live progress during multi-step workflows, so that I can see what the agent has completed, what it is working on, and what remains.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - TaskProgress display content
  Given a workflow is in progress
  Then the right panel shows TaskProgress with:
    - Steps with status icons: completed (checkmark, green), in-progress (filled circle, amber pulse), pending (open circle, muted)
    - A progress bar showing completion percentage
    - Elapsed time per step
    - Live counters (e.g., "18 ideas generated")

Scenario: AC2 - Real-time updates from SDK stream
  Given the TaskProgress display is visible
  When the SDK message stream emits progress updates
  Then step statuses, progress bar, and counters update in real time
```

## Tasks / Subtasks

1. **Write tests for `TaskProgress` component** — all step states (pending, in-progress, completed, failed), progress bar percentage, elapsed time, live counters (AC: 1)
2. **Implement `TaskProgress` display mode component** (AC: 1)
3. **Write tests for real-time update** from SDK message stream — step transitions, counter increments (AC: 2)
4. **Wire SDK messages to TaskProgress state updates** via IPC and context reducer (AC: 2)

## Dev Notes

- Step status type: `'pending' | 'in-progress' | 'completed' | 'failed'`
- Status icon colors: completed = `#2E7D32` (green checkmark), in-progress = `#EB8C00` (amber pulsing circle), pending = `#6B6B6B` (muted open circle), failed = `#E0301E` (red X)
- Progress bar: `(completedSteps / totalSteps) * 100`
- Live counters: driven by agent messages (e.g., "18 ideas generated", "3 files analyzed")
- In-progress icon should have a CSS pulse animation

### Project Structure Notes
- `src/renderer/components/display/TaskProgress.tsx` — task progress display mode
- `src/renderer/components/display/TaskProgress.test.tsx` — co-located tests

### References
- PRD: FR43 (Live progress display)
- UX Design Spec: UX-DR13 (Display modes in OutputPanel)
