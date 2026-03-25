# Story 3.6: Implement Barge-In Support

Status: ready-for-dev

## Story
As a TalkTerm user, I want to interrupt the avatar while it's speaking, so that I can redirect the conversation without waiting.

## Acceptance Criteria (BDD)

```gherkin
Scenario: User voice interrupts TTS playback
  Given the avatar is speaking via TTS
  When the user begins speaking (STT detects voice)
  Then TTS playback stops immediately
  And the avatar transitions from "speaking" to "listening"

Scenario: User speech is captured after barge-in
  Given TTS was interrupted by user voice
  When the user speaks
  Then the speech is captured and transcribed normally

Scenario: Conversation continues with new input
  Given the user interrupted and provided new input
  When transcription completes
  Then the new input is sent to the agent pipeline
  And the conversation continues from the new input
```

## Tasks / Subtasks

1. **Write tests for barge-in state machine** — speaking + voice_detected triggers stop_tts and transition to listening (AC: 1, 2, 3)
2. **Implement barge-in logic** in voice pipeline controller (AC: 1, 2)
3. **Write tests for TTS cancellation on voice detection** — TTS.stop() called immediately (AC: 1)
4. **Implement TTS cancel + STT activate flow** — coordinate stop, transition, capture, transcribe (AC: 1, 3, 4)

## Dev Notes

- Barge-in flow: STT detects voice input while TTS is active, immediately calls `TTS.stop()`, transitions avatar to listening state, then proceeds with normal STT transcription flow.
- State machine transitions: `speaking + voice_detected` -> `stop_tts` -> `listening` -> `transcribing` -> `processing`.
- This is the voice pipeline state machine that coordinates STT, TTS, and avatar state together.
- The barge-in controller depends on both STT (Story 3.3) and TTS (Story 3.5) being implemented.

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/renderer/speech/barge-in-controller.ts` | Voice pipeline state machine coordinating barge-in |
| `src/renderer/speech/barge-in-controller.test.ts` | Barge-in state machine tests |

### References

- PRD: FR37
- Architecture: Renderer speech layer, Voice bounded context (VoiceSession aggregate)
- UX Design: Barge-in interaction pattern
- Epics: Epic 3, Story 3.6
