# Story 3.5: Implement Text-to-Speech with Avatar Voice Output

Status: ready-for-dev

## Story
As a TalkTerm user, I want the avatar to speak responses aloud, so that I can listen to answers hands-free.

## Acceptance Criteria (BDD)

```gherkin
Scenario: TextToSpeech interface contract
  Given a TextToSpeech implementation
  Then it exposes speak(text), stop(), and onEnd callback
  And the Web Speech API SpeechSynthesis implementation fulfills the contract

Scenario: Agent response triggers spoken output
  Given the agent returns a text response
  When the response is received
  Then the avatar transitions to the "speaking" state
  And the text is spoken aloud via TTS
  And captions are synced with the spoken output

Scenario: Streaming TTS starts within performance threshold
  Given the agent begins streaming a response
  When the first sentence is complete
  Then TTS begins speaking the first segment within 3 seconds

Scenario: Each persona has a unique voice
  Given multiple personas are configured
  When each persona speaks
  Then each uses its own assigned SpeechSynthesisVoice
```

## Tasks / Subtasks

1. **Write tests for TextToSpeech interface contract** — speak, stop, onEnd behaviors (AC: 1)
2. **Implement WebSpeechTts** in src/renderer/speech/web-speech-tts.ts using SpeechSynthesis API (AC: 1, 2, 3)
3. **Write tests for TTS integration** — triggers avatar speaking state, syncs captions (AC: 2, 3)
4. **Implement voice assignment per persona** — map persona to SpeechSynthesisVoice by name/lang (AC: 4)
5. **Wire TTS output to CaptionBar** for synchronized caption display

## Dev Notes

- **Architectural boundary:** ONLY `web-speech-tts.ts` uses the SpeechSynthesis API directly. All other code interacts through the `TextToSpeech` interface.
- `TextToSpeech` interface defined in `src/shared/types/ports/text-to-speech.ts` (port).
- Streaming TTS: break agent response into sentence chunks, start speaking the first chunk immediately while subsequent chunks queue. First segment must begin within 3 seconds (NFR1b).
- Voice assignment: map each persona to a `SpeechSynthesisVoice` by name and language. Store mapping in config.
- Mock SpeechSynthesis in tests — it is a browser global.

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/shared/types/ports/text-to-speech.ts` | TextToSpeech interface (port) |
| `src/renderer/speech/web-speech-tts.ts` | Web Speech SpeechSynthesis implementation (adapter) |
| `src/renderer/speech/web-speech-tts.test.ts` | TTS implementation tests |

### References

- PRD: FR4, FR5, NFR1b, NFR12
- Architecture: Renderer speech layer, Voice bounded context
- UX Design: Caption sync, persona voice assignment
- Epics: Epic 3, Story 3.5
