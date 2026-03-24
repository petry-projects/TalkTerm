# Story 6.5: Implement Clustered Cards Display Mode

Status: ready-for-dev

## Story
As a TalkTerm user, I want brainstorming output organized as expandable category groups, so that I can browse and evaluate ideas by theme.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Clustered cards layout
  Given the agent produces categorized brainstorming output
  Then the right panel shows ClusteredCards with:
    - Expandable category groups
    - Idea cards within each group
    - Count badges showing number of ideas per category
    - Priority tags (High/Medium/Low) on individual ideas
```

## Tasks / Subtasks

1. **Write tests for `ClusteredCards` component** — category groups, expand/collapse, count badges, priority tags (AC: 1)
2. **Implement `ClusteredCards` display mode component** (AC: 1)

## Dev Notes

- Category group structure: header with category name + count badge, expandable/collapsible body containing idea cards
- Count badge: shows number of ideas in the category (e.g., "7")
- Priority tags: High (e.g., `#2E7D32` green), Medium (e.g., `#EB8C00` amber), Low (e.g., `#6B6B6B` muted) — use small pill-shaped badges
- Groups should be expandable/collapsible with smooth animation
- Default: first group expanded, rest collapsed

### Project Structure Notes
- `src/renderer/components/display/ClusteredCards.tsx` — clustered cards display mode
- `src/renderer/components/display/ClusteredCards.test.tsx` — co-located tests

### References
- UX Design Spec: UX-DR13 (Display modes in OutputPanel)
