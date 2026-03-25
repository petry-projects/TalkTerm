# Story 2.2: Implement User Profile Setup

Status: ready-for-dev

## Story

As a new TalkTerm user,
I want to enter my name so the avatar can greet me personally,
So that the experience feels personalized from the start.

## Acceptance Criteria (BDD)

- Setup card with "What should I call you?" and name input
- Name persisted to electron-store as local user profile (FR36)
- Profile includes: user name, avatar preference (initially empty), session history references
- App proceeds to next incomplete setup step

## Tasks / Subtasks

1. Write failing tests for UserProfileStore using electron-store — save, retrieve, update profile (AC: 2, 3)
2. Implement user-profile-store.ts in src/main/storage/ using electron-store (AC: 2, 3)
3. Write failing tests for ProfileSetup component (AC: 1, 4)
   - Renders "What should I call you?" heading and name input
   - Continue button disabled when name is empty
   - Continue button enabled when name is entered
   - On continue, sends name via IPC and proceeds to next step
4. Implement ProfileSetup component (AC: 1, 4)
5. Wire IPC channels: profile:get, profile:set (AC: 2)
6. Register IPC handlers in src/main/ipc/profile-handlers.ts

## Dev Notes

- electron-store for JSON config/profile storage (local-only, no account/login required per FR36)
- Profile data model should be extensible for future fields
- Profile is crash-safe — electron-store writes atomically

### Profile Data Model

```typescript
interface UserProfile {
  userName: string;
  avatarPreference: string | null;  // set in Story 2.3
  createdAt: string;                // ISO 8601
  updatedAt: string;                // ISO 8601
}
```

### IPC Channels

- `profile:get` — returns current UserProfile or null
- `profile:set` — saves/updates UserProfile fields

### Project Structure Notes

```
src/main/storage/
  user-profile-store.ts          (electron-store wrapper for profile)
  user-profile-store.test.ts

src/renderer/components/setup/
  ProfileSetup.tsx               (name entry screen)
  ProfileSetup.test.tsx

src/main/ipc/
  profile-handlers.ts            (IPC handler registration for profile:* channels)
  profile-handlers.test.ts

src/shared/types/domain/
  user-profile.ts                (UserProfile type definition)
```

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- PRD: `_bmad-output/planning-artifacts/prd.md` — FR36 (local user profile)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.2
