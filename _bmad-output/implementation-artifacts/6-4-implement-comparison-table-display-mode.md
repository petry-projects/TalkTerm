# Story 6.4: Implement Comparison Table Display Mode

Status: ready-for-dev

## Story
As a TalkTerm user, I want decision matrices as visual comparison tables, so that I can evaluate scored options side by side and make informed decisions.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Scored comparison table
  Given the agent produces a decision matrix
  Then the right panel shows a ComparisonTable with:
    - Scored rows with color-coded bars (green for 4-5, amber for 3, red for 1-2)
    - Expandable rows for detailed analysis
    - The winning approach highlighted with Primary accent border

Scenario: AC2 - Dual-panel approach selection
  Given the ComparisonTable is displayed
  Then the left panel simultaneously shows approach selection action cards
```

## Tasks / Subtasks

1. **Write tests for `ComparisonTable` component** — score rendering, color-coded bars, expandable rows, winner highlighting (AC: 1)
2. **Implement `ComparisonTable` display mode component** (AC: 1)
3. **Write tests for dual-panel interaction** — left panel ActionCards displayed alongside ComparisonTable (AC: 2)
4. **Wire left panel ActionCards** with ComparisonTable for approach selection (AC: 2)

## Dev Notes

- Score color mapping: 4-5 = Success `#2E7D32`, 3 = Warning `#EB8C00`, 1-2 = Error `#E0301E`
- Color-coded bars: horizontal bars whose width represents the score (out of 5) and whose color maps to the score range
- Expandable rows: click a row to toggle detailed analysis text
- Winning approach: row with highest total score gets `border-color: #EB8C00` (Primary accent)
- Left panel cards let the user select an approach directly from the comparison

### Project Structure Notes
- `src/renderer/components/display/ComparisonTable.tsx` — comparison table display mode
- `src/renderer/components/display/ComparisonTable.test.tsx` — co-located tests

### References
- UX Design Spec: UX-DR13 (Display modes in OutputPanel)
