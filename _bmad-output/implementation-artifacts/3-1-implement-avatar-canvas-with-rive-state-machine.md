# Story 3.1: Implement Avatar Canvas with Rive State Machine

Status: ready-for-dev

## Story
As a TalkTerm user, I want to see an animated avatar character on screen that responds with smooth motion, so that I feel like I'm interacting with a living companion.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Avatar renders centered on dark background
  Given the app has loaded
  When the AvatarCanvas component mounts
  Then a Rive WebGL2 canvas is displayed centered in the upper center stage
  And the background color is #1A1A1A

Scenario: Avatar transitions between states smoothly
  Given the avatar is in the "ready" state
  When the avatar state changes to "listening"
  Then the Rive state machine transitions smoothly with no visual jumps
  And this holds for all transitions: ready, listening, thinking, speaking

Scenario: Avatar maintains performance on older hardware
  Given the avatar is rendering
  When measured on a 5-year-old desktop GPU
  Then the frame rate remains at or above 30fps

Scenario: useAvatarState hook maps to Rive inputs
  Given the useAvatarState hook is active
  When setInputState is called with "isListening", true
  Then the Rive state machine input "isListening" is set to true
  And the same applies for "isThinking" and "isSpeaking"
```

## Tasks / Subtasks

1. **Write tests for useAvatarState hook** — verify state transitions between ready, listening, thinking, speaking (AC: 2, 4)
2. **Implement useAvatarState hook** — maps app states to Rive state machine inputs: isListening, isThinking, isSpeaking (AC: 2, 4)
3. **Write tests for AvatarCanvas component** — renders Rive canvas, responds to state changes, centers in upper stage area (AC: 1, 2)
4. **Implement AvatarCanvas with @rive-app/react-webgl2** — WebGL2 rendering, dark background, centered layout (AC: 1, 2, 4)
5. **Create placeholder .riv file** with 4 states (ready, listening, thinking, speaking) for dev and testing
6. **Performance test** — verify 30fps rendering target is met (AC: 3)

## Dev Notes

- Use `@rive-app/react-webgl2` for WebGL2 rendering in Chromium 144 (Electron 41).
- Rive state machine inputs follow camelCase naming: `isListening`, `isThinking`, `isSpeaking`.
- The avatar is the emotional core of TalkTerm — smoothness of transitions is critical. No jumps between states.
- A placeholder `.riv` file with the 4 states is needed for development and testing; real art assets come later.
- Mock `@rive-app/react-webgl2` in component tests — test that the correct Rive inputs are set for each state.

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/renderer/components/avatar/AvatarCanvas.tsx` | Rive WebGL2 avatar component |
| `src/renderer/components/avatar/AvatarCanvas.test.tsx` | Component tests |
| `src/renderer/hooks/useAvatarState.ts` | Hook mapping app state to Rive inputs |
| `src/renderer/hooks/useAvatarState.test.ts` | Hook tests |
| `assets/avatar-placeholder.riv` | Placeholder Rive file with 4 states |

### References

- PRD: FR4, FR5, NFR2
- Architecture: Renderer layer, Rive integration
- UX Design: Avatar presence area, upper center stage
- Epics: Epic 3, Story 3.1
