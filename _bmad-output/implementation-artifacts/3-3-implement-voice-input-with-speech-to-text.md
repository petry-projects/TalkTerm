# Story 3.3: Implement Voice Input with Speech-to-Text

Status: ready-for-dev

## Story
As a TalkTerm user, I want to speak to the avatar using my microphone, so that I can interact naturally without typing.

## Acceptance Criteria (BDD)

```gherkin
Scenario: SpeechToText interface contract
  Given a SpeechToText implementation
  Then it exposes start(), stop(), onResult callback, and onError callback
  And the Web Speech API implementation fulfills the full interface contract

Scenario: Mic button activates voice recording
  Given the mic button is visible (48px circle, Primary accent)
  When the user clicks it
  Then the button pulses with a red ring indicating active recording
  And the avatar transitions to the "listening" state
  And the StatusIndicator shows "Listening..."

Scenario: Transcription completes within performance thresholds
  Given the user has spoken for less than 15 seconds
  When 1.5 seconds of silence is detected
  Then transcription begins within 500ms of silence detection
  And the full transcription completes within 1 second

Scenario: Audio data is not persisted
  Given a voice input session is active
  When the session ends
  Then raw audio data is not stored beyond the active session
```

## Tasks / Subtasks

1. **Write tests for SpeechToText interface contract** — start, stop, onResult, onError behaviors (AC: 1)
2. **Implement WebSpeechStt** in src/renderer/speech/web-speech-stt.ts using Web Speech API (AC: 1, 3)
3. **Write tests for MicButton component** — idle, recording, error visual states (AC: 2)
4. **Implement MicButton component** — 48px circle, Primary accent, pulse animation when active (AC: 2)
5. **Write tests for voice input flow** — activate mic, transcribe speech, send to agent pipeline (AC: 3, 4)
6. **Wire STT output to agent message pipeline** via IPC

## Dev Notes

- **Architectural boundary:** ONLY `web-speech-stt.ts` uses the Web Speech API directly. All other code interacts through the `SpeechToText` interface.
- `SpeechToText` interface defined in `src/shared/types/ports/speech-to-text.ts` (port).
- Silence detection timeout: 1.5 seconds, configurable.
- Mock `SpeechRecognition` browser API in tests — it is a browser global.
- Privacy: raw audio must not be stored beyond the active session (NFR7).

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/shared/types/ports/speech-to-text.ts` | SpeechToText interface (port) |
| `src/renderer/speech/web-speech-stt.ts` | Web Speech API implementation (adapter) |
| `src/renderer/speech/web-speech-stt.test.ts` | STT implementation tests |
| `src/renderer/components/avatar/MicButton.tsx` | Microphone toggle button |
| `src/renderer/components/avatar/MicButton.test.tsx` | MicButton component tests |

### References

- PRD: FR7, FR9, NFR3, NFR7
- Architecture: Renderer speech layer, Voice bounded context
- UX Design: Mic button in interaction area
- Epics: Epic 3, Story 3.3
