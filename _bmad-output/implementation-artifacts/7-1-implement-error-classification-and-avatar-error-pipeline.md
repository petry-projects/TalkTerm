# Story 7.1: Implement Error Classification and Avatar Error Pipeline

Status: ready-for-dev

## Story
As a TalkTerm user, I want errors explained in plain language with clear options, so that I can understand what went wrong and how to recover without needing technical knowledge.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Error from any source is classified and wrapped
  Given an error occurs from any source (SDK, STT, TTS, file system, SQLite)
  When the error reaches the error pipeline
  Then it is classified as recoverable or fatal
  And wrapped as AgentError { userMessage, options: RecoveryOption[] }
  And sent to the renderer via IPC agent:error

Scenario: Avatar speaks error and recovery cards appear
  Given an AgentError is received in the renderer
  When the error display flow triggers
  Then the avatar speaks the userMessage in non-technical language (FR34)
  And the left panel shows 2-3 recovery ActionCards (FR35)

Scenario: No raw technical details shown to user
  Given any error occurs in the system
  When the error is presented to the user
  Then no stack traces, error codes, internal logs, or raw API text are ever shown

Scenario: AI backend unresponsive triggers retry with backoff
  Given the AI backend is unresponsive
  When a request fails
  Then the system retries 3 times with exponential backoff within 10 seconds (NFR13)
  And if all retries fail, a "service busy" message is displayed
```

## Tasks / Subtasks

1. **Write tests for error classifier** — cover all error sources (SDK, STT, TTS, file system, SQLite), verify recoverable/fatal classification (AC: 1)
2. **Implement error-classifier.ts** in src/main/agent/ — classify errors by source and severity (AC: 1)
3. **Define AgentError and RecoveryOption types** in src/shared/types/domain/agent-error.ts (AC: 1)
4. **Write tests for error-to-user-message mapping** — verify friendly language output, no technical leakage (AC: 1, 3)
5. **Implement user-message-mapper.ts** — translates classified errors to plain-language user messages (AC: 1, 3)
6. **Write tests for error display flow in renderer** — avatar speaks, recovery cards render, no raw errors (AC: 2, 3)
7. **Implement ErrorRecovery component** — avatar speaks userMessage + left panel recovery ActionCards (AC: 2)
8. **Write tests for retry with exponential backoff** — verify 3 retries, timing, fallback message (AC: 4)
9. **Implement retry logic in SDK backend** — exponential backoff in claude-sdk-backend.ts (AC: 4)

## Dev Notes

### Error Classification Categories
- `network-error` — connectivity, timeout, DNS failures
- `auth-error` — invalid/expired API key
- `rate-limit` — API rate limiting (HTTP 429)
- `file-permission` — file system access denied
- `sdk-error` — Claude Agent SDK errors
- `stt-error` — speech-to-text failures
- `tts-error` — text-to-speech failures
- `unknown` — unclassified errors (always fatal)

### Domain Types
- `AgentError`: `{ type: ErrorCategory, severity: 'recoverable' | 'fatal', userMessage: string, options: RecoveryOption[] }`
- `RecoveryOption`: `{ label: string, action: string, description: string }`

### User Message Examples
- Network error: "I'm having trouble reaching the service — let me try again" (NOT "HTTP 429 Too Many Requests")
- Auth error: "There's an issue with your API key — let's check that" (NOT "401 Unauthorized")
- STT error: "I didn't catch that — could you try again?" (NOT "SpeechRecognition error: no-speech")

### Exponential Backoff
- Retry delays: 1s, 2s, 4s (total ~7s, within 10s window)
- After 3 failures: surface "service busy" message with retry/cancel options

### Project Structure Notes
- `src/main/agent/error-classifier.ts` — error classification logic
- `src/main/agent/user-message-mapper.ts` — error-to-friendly-message mapping
- `src/shared/types/domain/agent-error.ts` — AgentError, RecoveryOption, ErrorCategory types
- `src/renderer/components/overlay/ErrorRecovery.tsx` — error display component
- IPC channel: `agent:error`

### References
- UX-DR17, UX-DR18 — avatar-driven error communication, no error dialogs or red banners
- FR34 — non-technical error language
- FR35 — recovery option cards
- NFR13 — retry within 10s
- Architecture: error pipeline section
