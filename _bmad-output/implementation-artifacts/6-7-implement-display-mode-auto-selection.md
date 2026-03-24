# Story 6.7: Implement Display Mode Auto-Selection

Status: ready-for-dev

## Story
As a TalkTerm user, I want the right panel to automatically show the right view, so that I do not have to manually switch between display modes.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Auto-select display mode based on content type
  Given agent output is received
  Then the useDisplayMode hook selects the correct display mode:
    | Content Type         | Display Mode     |
    | Workflow status      | TaskProgress     |
    | Plan proposal        | PlanPreview      |
    | Markdown document    | DocumentView     |
    | Scored matrix        | ComparisonTable  |
    | Categorized ideas    | ClusteredCards   |
    | Action log           | ActivityFeed     |
  And the OutputPanel renders the selected display mode component
```

## Tasks / Subtasks

1. **Write tests for `useDisplayMode` hook** — all content type to display mode mappings (AC: 1)
2. **Implement `useDisplayMode` hook** — inspect agent message metadata/structure to determine content type and return appropriate mode (AC: 1)
3. **Write tests for `OutputPanel`** — renders correct display mode component based on hook output (AC: 1)
4. **Implement `OutputPanel`** with dynamic mode switching — uses `useDisplayMode` to select and render the appropriate display component (AC: 1)

## Dev Notes

- Content type detection: inspect agent message metadata or structure to determine what kind of output is being presented
- Display mode type: `'task-progress' | 'plan-preview' | 'document' | 'comparison-table' | 'clustered-cards' | 'activity-feed'`
- OutputPanel is a container component that renders the active display mode component
- Transition between modes: crossfade or simple swap (consistent with PlanPreview -> TaskProgress transition from Story 5.4)
- The hook should be reactive — when agent messages change, the display mode updates accordingly

### Project Structure Notes
- `src/renderer/hooks/useDisplayMode.ts` — display mode selection hook
- `src/renderer/hooks/useDisplayMode.test.ts` — co-located tests
- `src/renderer/components/display/OutputPanel.tsx` — container for display modes
- `src/renderer/components/display/OutputPanel.test.tsx` — co-located tests

### References
- PRD: FR45 (Auto-selection of display modes)
- UX Design Spec: UX-DR4 (Output panel behavior), UX-DR13 (Display modes)
