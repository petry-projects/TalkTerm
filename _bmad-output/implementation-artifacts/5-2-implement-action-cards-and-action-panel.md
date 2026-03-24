# Story 5.2: Implement Action Cards and Action Panel

Status: ready-for-dev

## Story
As a TalkTerm user, I want clear labeled options at decision points, so that I can quickly understand and choose between available actions.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - ActionPanel layout and behavior
  Given a decision point is active
  Then the ActionPanel is 240px wide, slides from left (200ms ease-out)
  And displays a vertical card stack with 12px gap
  And has a header showing the decision context
  And is scrollable when cards overflow
  And is hidden during the agent's working state

Scenario: AC2 - ActionCard visual structure
  Given an ActionCard is rendered
  Then it shows a label badge (A/B/C) with Primary accent background (#EB8C00)
  And a title at 15px Semi-bold
  And a description at 13px Secondary color

Scenario: AC3 - ActionCard interaction states
  Given an ActionCard exists
  Then default state has #E0E0E0 border
  When the user hovers, the border changes to #EB8C00 with translateY(-2px) and shadow
  When selected, the border is #EB8C00 with outer glow
  When disabled, the card is at 50% opacity

Scenario: AC4 - Multi-modal selection
  Given action cards are displayed
  When the user clicks a card, or speaks the label via voice, or types the label
  Then the same selection handler is triggered

Scenario: AC5 - Accessibility and keyboard navigation
  Given action cards are rendered
  Then each card has role="option" and an aria-label
  And arrow keys navigate between cards
  And Enter/Space selects the focused card
  And minimum touch targets are 32x32px
```

## Tasks / Subtasks

1. **Write tests for `ActionCard` component** — all visual states (default, hover, selected, disabled), click interaction, accessibility attributes (AC: 2, 3, 4, 5)
2. **Implement `ActionCard` component** per UX-DR2 design spec (AC: 2, 3, 4, 5)
3. **Write tests for `ActionPanel` component** — layout, scrollable overflow, context header, hidden during working state (AC: 1)
4. **Implement `ActionPanel` component** per UX-DR3 design spec (AC: 1)
5. **Write tests for keyboard navigation** — arrow key focus movement, Enter/Space selection (AC: 5)
6. **Implement keyboard arrow navigation** + Enter/Space selection (AC: 5)
7. **Wire voice/text selection** from TextInput shortcut to trigger same selection handler as click (AC: 4)

## Dev Notes

- Card data type in `src/shared/types/`: `{ label: string; title: string; description: string; disabled?: boolean }`
- Hover style: `transform: translateY(-2px)` + `box-shadow` elevation
- Selected style: `border-color: #EB8C00` + `box-shadow` outer glow
- Focus style: `2px solid #EB8C00` border (keyboard focus indicator)
- Default border: `#E0E0E0`
- Disabled: `opacity: 0.5`, pointer-events disabled
- Label badge background: Primary accent `#EB8C00`, white text
- Panel slides in with same 200ms ease-out as layout shell (Story 5.1)

### Project Structure Notes
- `src/renderer/components/overlay/ActionCard.tsx` — individual card component
- `src/renderer/components/overlay/ActionCard.test.tsx` — co-located tests
- `src/renderer/components/overlay/ActionPanel.tsx` — panel container component
- `src/renderer/components/overlay/ActionPanel.test.tsx` — co-located tests

### References
- UX Design Spec: UX-DR2 (ActionCard design), UX-DR3 (ActionPanel layout), UX-DR16 (Interaction patterns)
- PRD: NFR11 (Accessibility — 32x32px min touch targets)
