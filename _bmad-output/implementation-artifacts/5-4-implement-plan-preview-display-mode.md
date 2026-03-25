# Story 5.4: Implement Plan Preview Display Mode

Status: ready-for-dev

## Story
As a TalkTerm user, I want to see the agent's proposed approach before it starts, so that I can approve, modify, or redirect the plan before any work begins.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Plan preview content
  Given the agent proposes a plan
  Then the right panel shows PlanPreview with:
    - Numbered steps with descriptions
    - Estimated scope for each step
    - Approach summary

Scenario: AC2 - Dual-panel plan interaction
  Given the PlanPreview is displayed in the right panel
  Then the left panel simultaneously shows action cards:
    - [A] Approve plan
    - [B] Modify
    - [C] Different approach

Scenario: AC3 - Plan approval transition
  Given the user approves the plan
  Then the PlanPreview transitions to TaskProgress display mode
  And visual feedback appears within 1 second
```

## Tasks / Subtasks

1. **Write tests for `PlanPreview` component** — renders numbered steps, descriptions, estimated scope, approach summary (AC: 1)
2. **Implement `PlanPreview` display mode component** (AC: 1)
3. **Write tests for plan approval flow** with ActionCards in left panel (AC: 2)
4. **Implement dual-panel plan interaction** — left panel cards + right panel preview (AC: 2)
5. **Write tests for PlanPreview to TaskProgress transition** — crossfade animation, timing (AC: 3)
6. **Implement transition animation** — right panel content crossfade from PlanPreview to TaskProgress (AC: 3)

## Dev Notes

- Plan data type: `{ steps: Array<{ number: number; description: string; estimatedScope: string }>; approach: string }`
- Transition: right panel content crossfade from PlanPreview to TaskProgress on approval
- This is one of 6 display modes rendered in the OutputPanel (see Story 6.7)
- Feedback within 1 second of approval (NFR5 responsiveness requirement)
- Left panel cards use ActionCard component from Story 5.2

### Project Structure Notes
- `src/renderer/components/display/PlanPreview.tsx` — plan preview display mode
- `src/renderer/components/display/PlanPreview.test.tsx` — co-located tests

### References
- PRD: FR44 (Plan preview display)
- UX Design Spec: UX-DR13 (Display modes in OutputPanel)
- NFR5: Visual feedback within 1 second
