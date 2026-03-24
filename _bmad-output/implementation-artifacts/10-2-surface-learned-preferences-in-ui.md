# Story 10.2: Surface Learned Preferences in UI

Status: ready-for-dev

## Story
As a returning TalkTerm user, I want preferred options highlighted automatically, so that I can quickly confirm my usual choice or pick something different.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Preferred ActionCard displays "Your usual" badge
  Given a user has an established preference for "Guided Questions"
  When ActionCards are rendered for brainstorming technique selection
  Then the "Guided Questions" card displays a "Your usual" badge (Primary Light #FFB600 pill, dark text #1A1A1A)
  And the card has a pre-selected border (#EB8C00)

Scenario: Avatar references preferences naturally
  Given a user has an established preference for "Guided Questions"
  When the avatar presents technique options
  Then the avatar says something like "Last 3 times you went with Guided Questions — want that again?"
  And the phrasing is natural and conversational — never robotic or formulaic

Scenario: "Forget my preferences" voice command clears preferences
  Given a user has established preferences for the current agent type
  When the user says "forget my preferences"
  Then all preferences for the current agent type are cleared
  And the avatar confirms: e.g., "Done — I've cleared your preferences. We'll start fresh."
```

## Tasks / Subtasks

1. **Write tests for "Your usual" badge rendering on preferred card** (AC: 1)
   - Test that badge appears only on the card matching the established preference
   - Test badge styling: bg #FFB600, text #1A1A1A, pill shape
   - Test pre-selected border: #EB8C00 on the preferred card
   - Test that non-preferred cards render without badge or pre-selection

2. **Implement preference badge and pre-selection in ActionCard** (AC: 1)
   - Add `isPreferred` prop to ActionCard component
   - Render "Your usual" pill badge top-right when `isPreferred` is true
   - Apply pre-selected border state (#EB8C00) to preferred card
   - User can still select a different card (pre-selection is not locked)

3. **Write tests for avatar preference verbal cue** (AC: 2)
   - Test that when a preference exists, the avatar dialogue includes a reference to it
   - Test that the phrasing is natural (not a template with raw variable insertion)
   - Test that when no preference exists, no preference cue is included

4. **Implement preference-aware avatar dialogue** (AC: 2)
   - Query PreferenceStore for current context before presenting options
   - Generate natural preference reference in avatar script
   - Include preference name and approximate usage count in dialogue

5. **Write tests for "forget preferences" command** (AC: 3)
   - Test that "forget my preferences" triggers preference clear
   - Test that only current agent type preferences are cleared (not all)
   - Test avatar confirmation dialogue after clearing

6. **Implement preference reset command handler** (AC: 3)
   - Detect "forget" + "preferences" keywords in user voice/text input
   - Call `PreferenceStore.clearForAgentType(agentType)` via IPC
   - Trigger avatar confirmation response

## Dev Notes

### Architecture Guardrails
- ActionCard updates stay in `src/renderer/components/overlay/ActionCard.tsx`
- Preference data accessed via `usePreferences` hook calling IPC `preferences:get`
- Voice command parsing in renderer — route clear action through IPC `preferences:clear`
- Never import from `src/main/` in renderer — use preload bridge

### Key Patterns
- Badge: small pill positioned top-right of ActionCard, bg #FFB600, text #1A1A1A, content "Your usual"
- Pre-selection: preferred card starts with selected border state (#EB8C00) but user can override
- Voice command parsing: detect "forget" + "preferences" in user input text
- Avatar dialogue: natural language, not templated — vary phrasing across invocations

### Testing
- TDD: write failing tests first for badge rendering, dialogue, and command handling
- React Testing Library for ActionCard badge tests
- Mock `window.electronAPI` for preference IPC calls in renderer tests
- Co-located test files next to source

### Project Structure Notes
- `src/renderer/components/overlay/ActionCard.tsx` — add badge and pre-selection
- `src/renderer/hooks/usePreferences.ts` — new hook for querying preferences via IPC
- `src/renderer/hooks/usePreferences.test.ts` — co-located tests
- `src/main/ipc/preferences-handler.ts` — IPC handler for preferences:get, preferences:clear

### References
- UX Design: UX-DR14 (Preference Memory)
- PRD: FR51 (Preference Memory)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` (Epic 10, Story 10.2)
- Depends on: Story 10.1 (PreferenceStore must exist)
