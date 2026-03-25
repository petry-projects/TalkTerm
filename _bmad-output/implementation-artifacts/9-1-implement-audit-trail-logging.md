# Story 9.1: Implement Audit Trail Logging

Status: ready-for-dev

## Story
As a TalkTerm user, I want all agent actions logged with full context, so that I have a complete record of what the agent did and why.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Every agent action creates an audit entry
  Given an agent action occurs (tool call, user approval, agent plan, error)
  When the action is processed
  Then an audit entry is written to SQLite with:
    auto-increment ID, session_id (FK), timestamp (ISO 8601),
    action_type, outcome (success/failure/cancelled),
    user_intent, and details (JSON) (FR27, FR29)

Scenario: Logging is never skipped
  Given any agent action occurs in the system
  When the action completes (success, failure, or cancellation)
  Then an audit entry is always created — logging is never skipped
```

## Tasks / Subtasks

1. **Write tests for SqliteAuditRepository** — append entry, query by session, query by date range, with :memory: DB (AC: 1)
2. **Implement SqliteAuditRepository** in src/main/storage/ (AC: 1)
3. **Define AuditRepository interface** in src/shared/types/ports/audit-repository.ts (AC: 1)
4. **Define AuditEntry domain type** in src/shared/types/domain/audit-entry.ts (AC: 1)
5. **Write tests for audit logging integration with agent backend** — verify every tool call and result produces an entry (AC: 2)
6. **Wire audit logging into agent message pipeline** — intercept every SDK message, create audit entry (AC: 2)

## Dev Notes

### Audit Table Schema
```sql
CREATE TABLE audit_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  action_type TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'cancelled')),
  user_intent TEXT,
  details TEXT  -- JSON blob
);
```

### Action Type Format
- `tool:bash` — agent executed a bash command
- `tool:edit` — agent edited a file
- `tool:write` — agent wrote a file
- `tool:read` — agent read a file
- `user:approve` — user approved an action
- `user:reject` — user rejected an action
- `agent:plan` — agent described its plan
- `agent:error` — agent encountered an error

### Integration Points
- Wire into `claude-sdk-backend.ts`: for each SDK message/tool call, create an audit entry
- Use the AuditRepository port — inject via constructor
- Ensure logging wraps around the action (log intent before, outcome after)
- Logging failures should not break the main workflow — log the logging failure separately

### Testing Strategy
- Use `:memory:` SQLite for repository tests
- Mock AuditRepository in backend integration tests to verify calls
- Test that every code path through the agent pipeline calls `append()`

### Project Structure Notes
- `src/main/storage/sqlite-audit-repository.ts` — repository implementation
- `src/shared/types/ports/audit-repository.ts` — repository interface (port)
- `src/shared/types/domain/audit-entry.ts` — AuditEntry domain type
- ONLY `src/main/storage/` imports `better-sqlite3` (architectural boundary)

### References
- FR27 — all agent actions logged
- FR28 — action history viewable
- FR29 — full context in audit entries
- Architecture: audit trail requirement — logging never skipped
