# Story 8.1: Implement Session Persistence with SQLite

Status: ready-for-dev

## Story
As a TalkTerm user, I want my session state saved automatically, so that my work is preserved even if the app closes unexpectedly.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Active session persisted on close
  Given an active agent session exists
  When the app is closed, crashes, or terminates unexpectedly (FR32)
  Then the session state is persisted to SQLite

Scenario: Session record contains required fields
  Given a session is being persisted
  When the record is written to SQLite
  Then it includes session ID (SDK), workspace path, status, timestamps, avatar persona, and resume state

Scenario: Database uses correct naming conventions
  Given the SQLite schema is created
  When tables and columns are defined
  Then tables use snake_case plural naming (sessions, audit_entries)
  And columns use snake_case naming (session_id, created_at)
```

## Tasks / Subtasks

1. **Write tests for SqliteSessionRepository** — CRUD operations, queries (findById, findIncomplete, findAll), constraint enforcement with :memory: DB (AC: 1, 2, 3)
2. **Implement SqliteSessionRepository** in src/main/storage/ (AC: 1, 2, 3)
3. **Define SessionRepository interface** in src/shared/types/ports/session-repository.ts (AC: 1)
4. **Write tests for database initialization and migrations** — schema creation, table structure verification (AC: 3)
5. **Implement database-initializer.ts** with schema creation and migration support (AC: 3)
6. **Write tests for crash-safe persistence** — beforeunload/will-quit handler behavior (AC: 1)
7. **Wire session save to Electron app lifecycle events** — before-quit, will-quit, SIGTERM (AC: 1)

## Dev Notes

### Session Table Schema
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  sdk_session_id TEXT,
  workspace_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  avatar_persona TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resume_state TEXT  -- JSON blob
);
```

### Status Values
- `'active'` — session in progress
- `'paused'` — session paused (network loss, user paused)
- `'completed'` — session finished normally
- `'failed'` — session terminated with error

### Crash-Safe Persistence
- `app.on('before-quit')` — save active session state
- `app.on('will-quit')` — final save opportunity
- `process.on('SIGTERM')` — handle OS-level termination
- Use synchronous SQLite writes in shutdown handlers (better-sqlite3 is sync by default)

### Testing Strategy
- Use `:memory:` SQLite databases for all repository tests
- Test constraint enforcement (e.g., invalid status values rejected)
- Test concurrent access patterns if applicable

### Project Structure Notes
- `src/main/storage/sqlite-session-repository.ts` — repository implementation
- `src/shared/types/ports/session-repository.ts` — repository interface (port)
- `src/main/storage/database-initializer.ts` — schema creation and migrations
- ONLY `src/main/storage/` imports `better-sqlite3` (architectural boundary)

### References
- FR32 — session state saved on close/crash
- Architecture: storage isolation, repository pattern
- Naming conventions: snake_case tables (plural), snake_case columns
