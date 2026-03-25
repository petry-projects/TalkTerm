# Story 2.3: Implement Avatar Selection Screen

Status: ready-for-dev

## Story

As a new TalkTerm user,
I want to choose my avatar team member from a selection screen,
So that I can personalize my experience with the AI assistant.

## Acceptance Criteria (BDD)

- Screen shows "Choose your team member" with avatar card(s) showing preview
- Selection saved to electron-store, app proceeds to next step
- MVP: single avatar displayed with context to establish "team" mental model

## Tasks / Subtasks

1. Write failing tests for AvatarPersona domain type and persona roster in shared/types (AC: 1, 3)
   - AvatarPersona type validation
   - Persona roster returns available personas
   - MVP roster contains exactly one persona
2. Implement AvatarPersona type and persona roster (AC: 1, 3)
3. Write failing tests for AvatarSelection component (AC: 1, 2, 3)
   - Renders "Choose your team member" heading
   - Displays avatar card with name, preview, and description
   - Select button triggers selection via IPC
   - After selection, app proceeds to next setup step
   - MVP: single avatar shown with UI implying more coming
4. Implement AvatarSelection component (AC: 1, 2, 3)
5. Wire IPC channels: avatar:get-roster, avatar:select (AC: 2)
6. Register IPC handlers in src/main/ipc/avatar-handlers.ts

## Dev Notes

- Each persona has: unique name, visual design (Rive file reference), assigned TTS voice (FR5)
- MVP has one persona — UI should imply more are coming (e.g., "More team members coming soon" text or locked/grayed-out placeholder cards)
- Selection persisted to electron-store via user profile's avatarPreference field

### AvatarPersona Domain Type

```typescript
interface AvatarPersona {
  id: string;
  name: string;
  description: string;
  riveFileRef: string;        // path to .riv file
  ttsVoice: string;           // Web Speech API voice identifier
  isAvailable: boolean;       // false for "coming soon" placeholders
}
```

### IPC Channels

- `avatar:get-roster` — returns AvatarPersona[] (available + coming soon)
- `avatar:select` — saves selected persona ID to profile

### Project Structure Notes

```
src/shared/types/domain/
  avatar-persona.ts              (AvatarPersona type + persona roster)
  avatar-persona.test.ts

src/renderer/components/setup/
  AvatarSelection.tsx            (avatar selection screen)
  AvatarSelection.test.tsx

src/main/ipc/
  avatar-handlers.ts             (IPC handler registration for avatar:* channels)
  avatar-handlers.test.ts
```

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- UX Design: `_bmad-output/planning-artifacts/ux-design-specification.md`
- PRD: `_bmad-output/planning-artifacts/prd.md` — FR5 (avatar personas with distinct voices)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.3
