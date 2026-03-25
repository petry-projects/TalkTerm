# Story 3.4: Implement Text Input as Co-Equal Alternative

Status: ready-for-dev

## Story
As a TalkTerm user, I want to type or paste text as a full alternative to voice, so that I can interact in whichever way is most convenient.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Text input field is visually co-equal with mic button
  Given the interaction area is visible
  Then a full-width text field is displayed next to the mic button
  And the placeholder reads "Type, paste, or speak to [avatar name]..."
  And the field has equal visual prominence to the mic button

Scenario: Enter sends message, Shift+Enter inserts newline
  Given the text input has content
  When the user presses Enter
  Then the message is sent to the agent pipeline
  When the user presses Shift+Enter
  Then a newline is inserted and the message is not sent

Scenario: Text input auto-expands up to 4 lines
  Given the user is typing multi-line content
  When the content exceeds one line
  Then the input field expands automatically
  And it expands up to a maximum of 4 lines
  And scrolls internally beyond 4 lines

Scenario: Paste shows brief toast
  Given the text input is focused
  When the user pastes content via Ctrl/Cmd+V
  Then a "Pasted" toast appears for 1 second

Scenario: Single character selects ActionCard when cards are visible
  Given ActionCards are visible in the left panel
  When the user types a single letter or number and presses Enter
  Then the corresponding ActionCard is selected by its label shortcut
```

## Tasks / Subtasks

1. **Write tests for TextInput component** — send on Enter, newline on Shift+Enter, paste behavior, auto-expand (AC: 1, 2, 3)
2. **Implement TextInput component** per UX-DR9 specs (AC: 1, 2, 3)
3. **Write tests for ActionCard shortcut selection** — single char input selects card (AC: 5)
4. **Implement card shortcut logic** — when cards visible, single char + Enter selects by label (AC: 5)
5. **Write tests for paste toast** — appears on paste, disappears after 1s (AC: 4)

## Dev Notes

- Focus border color: Primary accent `#EB8C00`.
- Auto-expand: controlled height based on content, up to `4 * lineHeight`, then internal scroll.
- ActionCard shortcut: when the left panel has action cards visible, typing a single character (matching a card label) and pressing Enter selects that card instead of sending a message.
- Every workflow available via voice must also be available via text (NFR10) — this is a parity requirement.

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/renderer/components/avatar/TextInput.tsx` | Text/paste input field |
| `src/renderer/components/avatar/TextInput.test.tsx` | Component tests |

### References

- PRD: FR8, NFR10
- Architecture: Renderer presentation layer
- UX Design: UX-DR9 (text input), Screen 04
- Epics: Epic 3, Story 3.4
