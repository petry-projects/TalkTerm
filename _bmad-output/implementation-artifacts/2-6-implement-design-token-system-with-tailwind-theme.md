# Story 2.6: Implement Design Token System with Tailwind Theme

Status: ready-for-dev

## Story

As a developer building TalkTerm UI components,
I want the design token system configured as Tailwind theme extensions,
So that all UI components use consistent colors, typography, spacing, and animation timing from day one.

## Acceptance Criteria (BDD)

- PwC Flame palette: Primary Tangerine #EB8C00, Primary Light #FFB600, Primary Dark #D04A02, Accent Rose #DB536A, Danger Red #E0301E
- Stage/surface: Stage Background #1A1A1A, Surface #FFFFFF, Surface Elevated #F5F5F5, Surface Muted #2A2A2A
- Semantic: Success #2E7D32, Warning #EB8C00, Error #E0301E, Info #1565C0
- Text: Primary #1A1A1A, Secondary #6B6B6B, On Dark #F0F0F0, Muted on Dark #A0A0A0
- Inter font with type scale (Display 28px through Caption 12px)
- 4px base spacing unit
- Custom animation timing for overlay transitions

## Tasks / Subtasks

1. Write failing tests verifying Tailwind theme tokens resolve correctly (AC: 1, 2, 3, 4, 5, 6, 7)
   - Test that custom color classes generate correct CSS values
   - Test that typography scale classes exist and map to correct sizes/weights
   - Test that animation timing custom properties are defined
2. Configure tailwind.config.ts with all design tokens (AC: 1, 2, 3, 4, 5, 6, 7)
   - Extend colors with PwC Flame palette
   - Extend colors with stage/surface tokens
   - Extend colors with semantic tokens
   - Extend colors with text tokens
   - Configure font family with Inter
   - Configure font size scale with line heights and weights
   - Configure animation/transition timing
3. Install and configure Inter font via @fontsource/inter (AC: 5)
4. Create CSS custom properties for animation timing in global.css (AC: 7)
5. Create a token verification test page or visual snapshot test to confirm correctness

## Dev Notes

- All tokens configured as Tailwind theme extensions in tailwind.config.ts
- Inter font via `@fontsource/inter` package (self-hosted, no external CDN dependency)
- Tailwind already uses 4px base spacing — no custom configuration needed for spacing (AC: 6)

### Color Tokens

| Token | Tailwind Class | Hex |
|-------|---------------|-----|
| Primary Tangerine | `primary` | #EB8C00 |
| Primary Light | `primary-light` | #FFB600 |
| Primary Dark | `primary-dark` | #D04A02 |
| Accent Rose | `accent-rose` | #DB536A |
| Danger Red | `danger` | #E0301E |
| Stage Background | `stage` | #1A1A1A |
| Surface | `surface` | #FFFFFF |
| Surface Elevated | `surface-elevated` | #F5F5F5 |
| Surface Muted | `surface-muted` | #2A2A2A |
| Success | `success` | #2E7D32 |
| Warning | `warning` | #EB8C00 |
| Error | `error` | #E0301E |
| Info | `info` | #1565C0 |
| Text Primary | `text-primary` | #1A1A1A |
| Text Secondary | `text-secondary` | #6B6B6B |
| Text On Dark | `text-on-dark` | #F0F0F0 |
| Text Muted on Dark | `text-muted-dark` | #A0A0A0 |

### Type Scale

| Name | Size | Weight | Line Height |
|------|------|--------|-------------|
| Display | 28px | 700 | 1.2 |
| Title | 20px | 600 | 1.3 |
| Subtitle | 17px | 600 | 1.4 |
| Body | 15px | 400 | 1.5 |
| Small | 13px | 400 | 1.5 |
| Caption | 12px | 400 | 1.5 |

### Animation Timing

- Panel slides: 200ms ease-out
- Content fade-in: 100ms ease-in
- Avatar state transitions: 300ms ease-in-out

### Project Structure Notes

```
tailwind.config.ts               (all design tokens as theme extensions)

src/renderer/styles/
  global.css                     (Tailwind directives + CSS custom properties for animations + Inter font import)
```

### Testing Notes

- Test token resolution by rendering components with token classes and asserting computed styles
- Alternatively, test the tailwind.config.ts export object directly to verify all tokens are defined
- Visual regression testing can be added later with Playwright screenshots

### References

- UX Design: `_bmad-output/planning-artifacts/ux-design-specification.md` (UX-DR7 Design Tokens, UX-DR8 Typography)
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.6
