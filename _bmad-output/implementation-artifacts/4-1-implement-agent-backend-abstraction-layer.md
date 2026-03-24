# Story 4.1: Implement Agent Backend Abstraction Layer

Status: ready-for-dev

## Story
As a developer, I want a clean abstraction layer for the agent backend, so that the application is decoupled from any specific AI SDK implementation.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AgentBackend interface defines required methods
  Given the AgentBackend interface
  Then it defines startSession(config) returning AsyncIterable<AgentEvent>
  And sendMessage(sessionId, message) returning AsyncIterable<AgentEvent>
  And cancelCurrentAction() returning void
  And resumeSession(sessionId) returning AsyncIterable<AgentEvent>

Scenario: FakeAgentBackend fulfills the interface contract
  Given a FakeAgentBackend implementation
  When startSession, sendMessage, cancelCurrentAction, and resumeSession are called
  Then all methods return the expected types and behaviors
  And any code that works with FakeAgentBackend works with any real implementation

Scenario: All renderer-agent communication uses IPC
  Given the agent message router is active
  When the renderer sends a message to the agent
  Then it flows through IPC channels: agent:message, agent:action, agent:confirm
  And no direct imports from src/main/ exist in renderer code

Scenario: Shared types are used across process boundaries
  Given AgentEvent and AgentSessionConfig types
  Then they are defined in src/shared/types/ only
  And both main and renderer processes import from shared/types
```

## Tasks / Subtasks

1. **Write tests for AgentBackend interface contract** using FakeAgentBackend (AC: 1, 2)
2. **Define AgentBackend interface** in src/main/agent/agent-backend.ts (AC: 1)
3. **Define AgentEvent and AgentSessionConfig types** in src/shared/types/domain/ (AC: 1, 4)
4. **Implement FakeAgentBackend** for all non-SDK testing (AC: 2)
5. **Write tests for agent message router** — routes messages via IPC channels (AC: 3)
6. **Implement agent-message-router.ts** — orchestrates message flow between IPC and backend (AC: 3)

## Dev Notes

- `AgentBackend` is a PORT (interface). Implementations are adapters. This follows Dependency Inversion.
- `FakeAgentBackend` implements `AgentBackend` and is used in ALL tests that do not need the real SDK. If code works with the fake, it works with any real backend (Liskov Substitution).
- AgentEvent discriminated union types: `text`, `tool-call`, `tool-result`, `error`, `confirm-request`, `complete`.
- This story does NOT import `@anthropic-ai/claude-agent-sdk` — that happens in Story 4.2.
- The agent message router sits in the main process and coordinates between IPC handlers and the AgentBackend implementation.

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/main/agent/agent-backend.ts` | AgentBackend interface (port) |
| `src/main/agent/agent-backend.test.ts` | Interface contract tests via FakeAgentBackend |
| `src/main/agent/agent-message-router.ts` | Message routing orchestration |
| `src/main/agent/agent-message-router.test.ts` | Router tests |
| `src/shared/types/domain/agent-event.ts` | AgentEvent, AgentSessionConfig types |
| `test/fakes/fake-agent-backend.ts` | FakeAgentBackend test double |

### References

- PRD: FR10, FR11, FR15
- Architecture: Main process agent layer, ports and adapters
- Epics: Epic 4, Story 4.1
