# Story 3.2: Implement Caption Bar and Status Indicator

Status: ready-for-dev

## Story
As a TalkTerm user, I want text captions and status indicators, so that I can follow what the avatar is saying and understand its current state at a glance.

## Acceptance Criteria (BDD)

```gherkin
Scenario: CaptionBar displays spoken text
  Given the avatar is speaking
  When TTS output text is provided
  Then the CaptionBar renders below the avatar, centered
  And it has a semi-transparent dark background (rgba(0,0,0,0.6)) with backdrop-filter blur
  And text is 14px Inter, color #F0F0F0, rounded 8px, max-width 500px
  And captions are synced with TTS output

Scenario: CaptionBar fades out after speech ends
  Given the avatar has finished speaking
  When 3 seconds have elapsed since speech ended
  Then the CaptionBar fades out (opacity 1 to 0 over 300ms)

Scenario: StatusIndicator shows listening state
  Given the avatar is in the "listening" state
  Then a compact pill is displayed below the caption
  And it shows a pulsing dot with Primary color
  And the text reads "Listening..."

Scenario: StatusIndicator shows thinking state
  Given the avatar is in the "thinking" state
  Then a compact pill is displayed with a pulsing dot at Primary 60% opacity
  And contextual text describes what the agent is doing

Scenario: StatusIndicator shows speaking state
  Given the avatar is in the "speaking" state
  Then a compact pill is displayed with a static dot in Primary Light color

Scenario: StatusIndicator is hidden in ready state
  Given the avatar is in the "ready" state
  Then the StatusIndicator is not rendered
```

## Tasks / Subtasks

1. **Write tests for CaptionBar** — renders text, syncs with TTS, fades out 3s after speech ends (AC: 1, 2)
2. **Implement CaptionBar** per UX-DR5 styling specs (AC: 1, 2)
3. **Write tests for StatusIndicator** — all four states: listening, thinking, speaking, ready/hidden (AC: 3, 4, 5, 6)
4. **Implement StatusIndicator** per UX-DR6 styling specs (AC: 3, 4, 5, 6)
5. **Wire to avatar state** via useAvatarState hook for state-driven rendering

## Dev Notes

- CaptionBar fade-out: use CSS transition on opacity (1 to 0 over 300ms), triggered by a 3-second timer after speech ends.
- StatusIndicator pulsing dot: CSS keyframe animation (scale + opacity pulse cycle).
- StatusIndicator is conditionally rendered — hidden (not rendered) in ready state.
- Both components read from the avatar state managed by useAvatarState hook (Story 3.1 dependency).

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/renderer/components/avatar/CaptionBar.tsx` | Caption text display with fade-out |
| `src/renderer/components/avatar/CaptionBar.test.tsx` | Component tests |
| `src/renderer/components/avatar/StatusIndicator.tsx` | State pill indicator |
| `src/renderer/components/avatar/StatusIndicator.test.tsx` | Component tests |

### References

- PRD: NFR12 (caption sync)
- Architecture: Renderer presentation layer
- UX Design: UX-DR5 (CaptionBar), UX-DR6 (StatusIndicator)
- Epics: Epic 3, Story 3.2
