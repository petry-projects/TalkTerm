# Story 5.1: Implement Three-Zone Layout Shell

Status: ready-for-dev

## Story
As a TalkTerm user, I want the app layout to adapt based on workflow state, so that I see only the panels relevant to my current task without unnecessary UI clutter.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Three-zone layout structure
  Given the app is running
  Then the layout defines three zones: Left Panel (240px fixed), Center Stage (remaining, min 400px), Right Panel (380px fixed)

Scenario: AC2 - Minimum window size
  Given the app window is resized
  Then the minimum window dimensions are enforced at 800x600px

Scenario: AC3 - Conversation state (center only)
  Given the layout state is "conversation"
  Then the Center Stage takes the full width
  And the Left Panel and Right Panel are hidden

Scenario: AC4 - Decision point state (center + left)
  Given a decision point is triggered
  Then the Left Panel slides in from the left with a 200ms ease-out animation
  And the Center Stage narrows to accommodate

Scenario: AC5 - Output review state (center + left + right or center + right)
  Given output is ready for review
  Then the Right Panel slides in from the right with a 200ms ease-out animation
  And the avatar remains visible in Center Stage

Scenario: AC6 - Narrow window responsive behavior
  Given the window width is less than 1100px
  When a panel is shown
  Then panels overlay the Center Stage instead of pushing/narrowing it
```

## Tasks / Subtasks

1. **Write tests for `useLayoutState` hook** — verify all 4 layout states (`conversation`, `decision-point`, `output-review`, `output-only`) and transitions between them (AC: 1, 2, 3, 4, 5, 6)
2. **Implement `useLayoutState` hook** with `useReducer` — actions: `layout:show-decision`, `layout:show-output`, `layout:show-both`, `layout:reset` (AC: 1, 2, 3, 4, 5, 6)
3. **Write tests for `AppLayout` component** — renders three zones, correct visibility per state, responsive overlay behavior (AC: 1, 2, 3, 4, 5, 6)
4. **Implement `AppLayout` component** using CSS Grid or Flexbox with `grid-template-columns` transitions (AC: 1, 2, 3, 4, 5, 6)
5. **Write tests for panel slide animations** — 200ms ease-out slide, 100ms content fade-in after slide completes (AC: 3, 4, 5)
6. **Implement animation transitions** — CSS transitions for panel slide-in/out (AC: 3, 4, 5, 6)

## Dev Notes

- Layout state type: `'conversation' | 'decision-point' | 'output-review' | 'output-only'`
- Reducer actions follow `domain:verb` naming: `layout:show-decision`, `layout:show-output`, `layout:show-both`, `layout:reset`
- CSS approach: `grid-template-columns` with transitions on column widths, or absolute positioning for overlay mode
- Animation timing: 200ms ease-out for panel slide, 100ms content fade-in after slide completes
- Responsive breakpoint: `@media (max-width: 1100px)` switches panels to overlay mode with `z-index` layering
- Center Stage must always remain visible with minimum width of 400px
- Minimum window enforcement: set via Electron `BrowserWindow` `minWidth`/`minHeight` options

### Project Structure Notes
- `src/renderer/components/layout/AppLayout.tsx` — main layout component
- `src/renderer/components/layout/AppLayout.test.tsx` — co-located tests
- `src/renderer/hooks/useLayoutState.ts` — layout state hook
- `src/renderer/hooks/useLayoutState.test.ts` — co-located tests

### References
- UX Design Spec: UX-DR1 (Three-zone layout), UX-DR8 (Responsive behavior)
- Architecture: Three-zone layout system in `_bmad-output/planning-artifacts/architecture.md`
- PRD: FR17 (Visual feedback), FR43 (Layout states)
