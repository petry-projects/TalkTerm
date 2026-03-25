# Story 8.2: Implement Session Start and Resume Flow

Status: ready-for-dev

## Story
As a returning user, I want to resume where I left off or start fresh, so that I can continue my work seamlessly or begin a new task without friction.

## Acceptance Criteria (BDD)

```gherkin
Scenario: One incomplete session found
  Given the user opens TalkTerm with one incomplete session for the workspace
  When the greeting flow runs
  Then the avatar says "Welcome back, [name]! You left your [workflow] mid-way. Want to pick up where we left off?" (FR33)
  And two ActionCards are shown: [A] Resume, [B] Start new

Scenario: Multiple incomplete sessions found
  Given the user opens TalkTerm with multiple incomplete sessions
  When the greeting flow runs
  Then the sessions are listed as ActionCards with timestamps

Scenario: No incomplete sessions found
  Given the user opens TalkTerm with no incomplete sessions
  When the greeting flow runs
  Then the avatar says "Hey [name]! What are you working on today?"
  And the text input is active and ready

Scenario: User chooses to resume
  Given the user selects Resume on an incomplete session
  When the resume flow executes
  Then the SDK session is restored via the stored session ID (FR31)
  And the layout is restored to its previous state
  And the avatar summarizes where things left off

Scenario: User chooses to start new
  Given the user selects Start new
  When the new session flow executes
  Then a fresh session is created (FR30)
```

## Tasks / Subtasks

1. **Write tests for session discovery** — 0, 1, and multiple incomplete sessions for a workspace (AC: 1, 2, 3)
2. **Implement session discovery logic** — query repository, determine greeting variant (AC: 1, 2, 3)
3. **Write tests for greeting flow with ActionCards** — correct avatar speech, correct cards for each scenario (AC: 1, 2, 3)
4. **Implement SessionGreeting component** — renders appropriate greeting and ActionCards (AC: 1, 2, 3)
5. **Write tests for session resume via SDK** — stored session ID passed to backend, layout restored, summary spoken (AC: 4)
6. **Implement resume flow** — restore SDK session, restore layout, provide avatar summary (AC: 4)
7. **Write tests for new session start** — fresh session created, clean state (AC: 5)
8. **Implement new session flow** — create new session in repository, initialize SDK (AC: 5)

## Dev Notes

### Session Discovery
- Query: `SqliteSessionRepository.findIncomplete(workspacePath)` returns sessions with status `'active'` or `'paused'`
- Sort by `updated_at` descending to show most recent first

### Greeting Variants
- 0 sessions: `"Hey [name]! What are you working on today?"` — input immediately active
- 1 session: `"Welcome back, [name]! You left your [workflow] mid-way. Want to pick up where we left off?"` — Resume/Start new cards
- N sessions: List each as ActionCard with workspace, timestamp, brief description

### Resume Flow
- Pass stored `sdk_session_id` to `AgentBackend.resumeSession()`
- Restore layout state from `resume_state` JSON in session record
- Avatar summarizes context: what was being done, what's next

### Personalization
- User name from profile (electron-store config)
- Workflow description from session metadata

### Project Structure Notes
- `src/renderer/components/session/SessionGreeting.tsx` — greeting UI component
- `src/renderer/hooks/useSessionManager.ts` — session discovery and management hook
- IPC channels: `session:find-incomplete`, `session:resume`, `session:create`

### References
- FR30 — fresh session start
- FR31 — SDK session restore via stored ID
- FR33 — personalized greeting with resume option
