# Story 8.4: Implement Accessibility Foundations

Status: ready-for-dev

## Story
As a user with accessibility needs, I want keyboard navigation and contrast compliance, so that I can use TalkTerm effectively regardless of visual or motor abilities.

## Acceptance Criteria (BDD)

```gherkin
Scenario: WCAG AA contrast ratios met
  Given the TalkTerm color palette is applied
  When contrast ratios are measured
  Then text on light backgrounds achieves 16.75:1
  And text on dark backgrounds achieves 15.3:1
  And Primary color on dark backgrounds achieves 5.2:1
  And caption text on dark backgrounds achieves 5.4:1

Scenario: Focus indicators and keyboard navigation work
  Given interactive elements are present on screen
  When the user navigates with keyboard
  Then focused elements show a 2px Primary accent (#EB8C00) border
  And Tab moves focus between elements
  And arrow keys navigate within groups
  And Enter/Space activate the focused element

Scenario: No information conveyed by color alone
  Given status indicators and feedback elements are displayed
  When conveying success, error, or warning states
  Then each state is paired with an icon or label (checkmark, X, triangle)
  And color is never the sole differentiator
```

## Tasks / Subtasks

1. **Write tests for contrast ratios** on all color combinations — verify WCAG AA compliance (AC: 1)
2. **Audit and fix any failing contrast ratios** across the application (AC: 1)
3. **Write tests for keyboard navigation** across all interactive elements — Tab, arrows, Enter/Space (AC: 2)
4. **Implement focus management** — focus trap in panels, skip navigation, 2px #EB8C00 focus ring (AC: 2)
5. **Write tests for color independence** — verify icons/labels present alongside color indicators (AC: 3)
6. **Audit all status indicators** for shape+text accompaniment — StatusIndicator, ActionCards, setup screens (AC: 3)

## Dev Notes

### Contrast Ratios (WCAG AA Targets)
- Text on light: 16.75:1
- Text on dark: 15.3:1
- Primary (#EB8C00) on dark: 5.2:1
- Caption on dark: 5.4:1

### Focus Management
- Focus ring: `outline: 2px solid #EB8C00` on all interactive elements
- Tab: moves focus between major interactive regions
- Arrow keys: navigate within component groups (e.g., within ActionCard lists, radio groups)
- Enter/Space: activate focused element
- Focus trap: when a panel or modal is open, Tab cycles within it
- Skip navigation: allow keyboard users to jump directly to center stage input

### Color Independence
- Success: green + checkmark icon (checkmark)
- Error: red + X icon (X)
- Warning: yellow + triangle icon (triangle)
- Every StatusIndicator state must have text label + icon, not just color

### Testing Strategy
- Install `@axe-core/react` or `jest-axe` for automated accessibility testing
- Use `axe` in component tests to catch WCAG violations
- Manual keyboard navigation tests as Playwright E2E tests

### Project Structure Notes
- Cross-cutting concern — touches all components
- Key components to audit: ActionCard, StatusIndicator, setup screens, overlay panels
- Global focus styles in Tailwind config or global CSS
- Consider a shared `FocusRing` utility component

### References
- UX-DR16 — WCAG AA compliance
- WCAG 2.1 AA guidelines
