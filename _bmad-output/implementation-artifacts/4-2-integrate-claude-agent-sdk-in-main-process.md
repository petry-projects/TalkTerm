# Story 4.2: Integrate Claude Agent SDK in Main Process

Status: ready-for-dev

## Story
As a TalkTerm user, I want natural language conversations processed by Claude Agent SDK, so that I get intelligent, context-aware responses from the AI agent.

## Acceptance Criteria (BDD)

```gherkin
Scenario: SDK runs in-process with decrypted API key
  Given the user has a stored API key
  When a session starts
  Then the SDK is initialized in the Electron Node.js main process
  And the API key is decrypted from safeStorage for use

Scenario: SDK streams typed messages via AsyncGenerator
  Given a session is active
  When a query is sent to the SDK
  Then SDK query() returns an AsyncGenerator<SDKMessage> streaming typed messages

Scenario: SDK messages are forwarded to renderer via IPC
  Given the SDK is streaming messages
  When each SDKMessage is received
  Then it is forwarded to the renderer via mainWindow.webContents.send("agent:message", message)

Scenario: Message types drive avatar state
  Given the renderer receives agent messages
  Then system messages set avatar to ready
  And assistant text messages set avatar to speaking
  And tool-call messages set avatar to thinking
  And result success messages trigger summarizing
  And error messages trigger error recovery flow

Scenario: Conversation context is maintained and thinking is hidden
  Given a session is active
  When multiple exchanges occur
  Then conversation context is maintained throughout the session
  And intermediate thinking/reasoning is not displayed to the user
```

## Tasks / Subtasks

1. **Write tests for ClaudeSdkBackend** implementing AgentBackend interface (AC: 1, 2, 3)
2. **Implement claude-sdk-backend.ts** — the ONLY file that imports `@anthropic-ai/claude-agent-sdk` (AC: 1, 2)
3. **Write tests for SDK message to AgentEvent mapping** — all message types (AC: 4)
4. **Implement anti-corruption layer:** `mapSdkMessage()` function mapping SDKMessage to AgentEvent (AC: 4, 5)
5. **Wire API key decryption** from SafeStorageKeyManager (AC: 1)
6. **Configure SDK parameters:** maxTurns, maxBudgetUsd, settingSources, allowedTools (AC: 5)

## Dev Notes

- **Architectural boundary:** `claude-sdk-backend.ts` is the ONLY file that imports `@anthropic-ai/claude-agent-sdk`. SDK types must never leak beyond this file.
- Anti-corruption layer: `mapSdkMessage()` converts SDK-specific message types into domain `AgentEvent` types at the boundary. Domain code never sees SDK types.
- SDK configuration: `allowedTools` for auto-approved tools, permission callbacks for FR20 confirmation flow.
- `settingSources: ["project"]` loads CLAUDE.md, skills, and hooks from the workspace directory.
- Session persistence: store SDK session ID in SQLite for session resume (FR31).
- In tests, use `FakeAgentBackend` (from Story 4.1) for all non-SDK integration tests. Mock the SDK module for unit tests of `ClaudeSdkBackend` itself.

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/main/agent/claude-sdk-backend.ts` | SDK adapter (ONLY SDK import point) |
| `src/main/agent/claude-sdk-backend.test.ts` | SDK backend tests (mock SDK module) |

### References

- PRD: FR4, FR15, FR20, FR22, FR31
- Architecture: Main process agent layer, anti-corruption layer, SDK isolation boundary
- Epics: Epic 4, Story 4.2
