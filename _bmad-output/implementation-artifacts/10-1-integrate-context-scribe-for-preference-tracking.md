# Story 10.1: Integrate context-scribe for Preference Tracking

Status: ready-for-dev

## Story
As a TalkTerm user, I want the system to learn my preferences over time, so that repeated workflows become faster and more personalized.

## Acceptance Criteria (BDD)

```gherkin
Scenario: context-scribe integrated as preference memory engine
  Given TalkTerm is running
  When a user makes workflow choices during agent sessions
  Then those choices are recorded by context-scribe as the preference memory engine (FR51)

Scenario: Preference categories tracked
  Given context-scribe is integrated
  When a user selects workflow options, brainstorming techniques, output destinations, avatar preferences, or workflow settings
  Then each category is tracked as a distinct preference type

Scenario: Preferences scoped per agent type and workspace
  Given a user has preferences in workspace A with agent type "brainstorm"
  When the user starts a session in workspace B with agent type "brainstorm"
  Then workspace A preferences are not applied to workspace B
  And each agent type + workspace combination maintains independent preferences

Scenario: User overrides a preference by choosing differently
  Given a user has an established preference for "Guided Questions" technique
  When the user selects "Mind Map" instead
  Then the system adapts — no confirmation or undo required

Scenario: Three consistent choices establish a preference
  Given a user has no established preference for brainstorming technique
  When the user selects "Guided Questions" three consecutive times
  Then "Guided Questions" is marked as the preferred technique

Scenario: Two consecutive different choices shift a preference
  Given a user has "Guided Questions" as established preference
  When the user selects "Mind Map" two consecutive times
  Then the preference shifts to "Mind Map"
```

## Tasks / Subtasks

1. **Write tests for preference store — save, query, scope by agent+workspace** (AC: 1, 2, 3)
   - Test saving a preference record with agent type, workspace, and key
   - Test querying preferences scoped to a specific agent+workspace pair
   - Test that preferences from one scope do not leak to another
   - Test all tracked categories: workflow options, brainstorming techniques, output destinations, avatar preferences, workflow settings

2. **Implement preference-store.ts wrapping context-scribe** (AC: 1, 2, 3)
   - Create `PreferenceStore` class in `src/main/storage/preference-store.ts`
   - Wrap context-scribe API for local preference persistence
   - Implement scoping key format: `${agentType}:${workspacePath}:${preferenceKey}`
   - Define preference types: `technique-preference`, `destination-preference`, `setting-preference`

3. **Write tests for preference learning algorithm — 3-to-establish, 2-to-shift** (AC: 4, 5)
   - Test that 1 and 2 consecutive same choices do NOT establish a preference
   - Test that exactly 3 consecutive same choices DO establish a preference
   - Test that 1 consecutive different choice does NOT shift an established preference
   - Test that exactly 2 consecutive different choices DO shift a preference

4. **Implement preference learning logic** (AC: 4, 5)
   - Track consecutive choice counts per preference key
   - At 3 consecutive same choices, mark as preferred
   - At 2 consecutive different choices, shift to the new choice
   - Reset counters on preference establishment or shift

5. **Write tests for preference override** (AC: 4)
   - Test that choosing a different option is silently accepted
   - Test that override begins the "shift" counter (no extra confirmation)

6. **Wire preference tracking into ActionCard selection events** (AC: 1)
   - Listen for ActionCard selection events via IPC
   - Record each selection in the preference store with appropriate scope
   - Trigger learning algorithm on each new selection

## Dev Notes

### Architecture Guardrails
- context-scribe is an npm package the team contributes to — use it as the preference memory engine
- Preference data is stored locally only — no external transmission
- `PreferenceStore` lives in `src/main/storage/` (storage isolation rule)
- Expose preference queries to renderer via IPC channels: `preferences:get`, `preferences:clear`
- Follow DI pattern: inject `PreferenceStore` into consumers via constructor

### Key Patterns
- Scoping key: `${agentType}:${workspacePath}:${preferenceKey}`
- Preference types: `technique-preference`, `destination-preference`, `setting-preference`
- Learning algorithm: count consecutive same choices -> at 3, mark preferred; count consecutive different -> at 2, shift

### Testing
- TDD: write failing tests first for store, learning algorithm, and override behavior
- Use in-memory context-scribe instance for tests (no filesystem)
- Co-located test file: `src/main/storage/preference-store.test.ts`
- 90% coverage target on all metrics

### Project Structure Notes
- `src/main/storage/preference-store.ts` — PreferenceStore wrapping context-scribe
- `src/main/storage/preference-store.test.ts` — co-located tests
- `src/shared/types/domain/preference.ts` — preference value objects and types
- `src/shared/types/ports/preference-repository.ts` — port interface for preference storage

### References
- PRD: FR51 (Preference Memory)
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- context-scribe: npm package for preference memory
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` (Epic 10, Story 10.1)
