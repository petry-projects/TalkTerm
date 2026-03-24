# Story 6.3: Implement Document Display Mode

Status: ready-for-dev

## Story
As a TalkTerm user, I want to view completed outputs as rendered documents, so that I can review the agent's work in a readable format before saving or sharing.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Markdown document rendering
  Given the agent produces a markdown document
  Then the right panel renders it with headings, lists, and expandable sections
  And the document is scrollable

Scenario: AC2 - Verbal summary before display
  Given a document is ready for review
  Then the avatar verbally summarizes the content in 2-4 sentences
  And the right panel appears after the summary begins

Scenario: AC3 - Local file access
  Given a document is displayed
  Then the file is accessible on the local file system
  And the avatar remains visible during document review
```

## Tasks / Subtasks

1. **Write tests for `DocumentView` component** — renders markdown headings, lists, expandable sections, scrollable container (AC: 1)
2. **Implement `DocumentView` component** with a markdown renderer library (AC: 1)
3. **Write tests for verbal summary trigger** — TTS speaks summary before panel slides in (AC: 2)
4. **Implement summary-then-panel transition** — avatar speaks summary, then right panel slides in with document (AC: 2)
5. **Wire local file path display** — show file path and "Open in file manager" button (AC: 3)

## Dev Notes

- Markdown renderer: use `react-markdown` or similar lightweight library
- Expandable sections: collapsible `<details>` elements or custom accordion for long sections
- Avatar summary flow: TTS speaks 2-4 sentence summary, right panel slides in while speech is in progress or after
- Local file: display the file path with a clickable "Open in file manager" button that uses Electron `shell.showItemInFolder()`
- Avatar must remain visible in Center Stage during document review (layout state: `output-review`)

### Project Structure Notes
- `src/renderer/components/display/DocumentView.tsx` — document display mode
- `src/renderer/components/display/DocumentView.test.tsx` — co-located tests

### References
- PRD: FR24 (Expandable sections), FR25 (Local file access), FR26 (Verbal summary)
- UX Design Spec: UX-DR13 (Display modes in OutputPanel)
