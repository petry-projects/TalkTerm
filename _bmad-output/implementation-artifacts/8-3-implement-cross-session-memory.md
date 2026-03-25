# Story 8.3: Implement Cross-Session Memory

Status: ready-for-dev

## Story
As a TalkTerm user, I want the avatar to remember past work, so that conversations feel continuous and the agent can reference prior decisions and context.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Avatar has access to full session history
  Given multiple completed sessions exist for a workspace
  When a new session starts
  Then the avatar has full history via SDK session persistence (FR46)

Scenario: Avatar references past work naturally
  Given memory context from previous sessions is available
  When the avatar communicates with the user
  Then it references past work naturally, e.g. "Last week you chose incremental migration — want to check?" (FR47)

Scenario: Lightweight memory index stored in SQLite
  Given a session completes
  When memory extraction runs
  Then key decisions, project vocabulary, and user preferences are stored in a memory index
  And this index enables fast greeting personalization

Scenario: Full transcripts not persisted
  Given privacy requirements (NFR16)
  When session data is stored
  Then full transcripts are NOT persisted beyond the active session
  And only structured memory summaries are retained
```

## Tasks / Subtasks

1. **Write tests for memory index store** — save and query decisions, vocabulary, preferences (AC: 3)
2. **Implement memory-index-store.ts** in src/main/storage/ (AC: 3)
3. **Write tests for memory extraction from completed sessions** — correct extraction of decisions, terms, preferences; verify no transcript storage (AC: 3, 4)
4. **Implement memory extraction logic** — scan session outputs for key decisions, vocabulary, preferences (AC: 3, 4)
5. **Write tests for natural memory reference in conversation** — memory context provided to SDK, references appear (AC: 2)
6. **Configure SDK with memory context for session initialization** — pass memory summaries as system context (AC: 1, 2)

## Dev Notes

### Memory Index Table Schema
```sql
CREATE TABLE memory_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('decision', 'vocabulary', 'preference')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### Memory Types
- `decision` — key choices made during a session (e.g., "chose incremental migration over big-bang")
- `vocabulary` — project-specific terms the user introduced (e.g., "TalkTerm", "action cards")
- `preference` — user preferences observed (e.g., "prefers verbose explanations", "likes TypeScript strict mode")

### Memory Extraction
- Runs at session completion (status → `'completed'`)
- Scans session output for key decisions, new terms, expressed preferences
- Stores structured summaries only — never full verbatim transcripts (privacy, NFR16)

### SDK Integration
- On new session start, query memory index for workspace
- Format memory summaries as system context for SDK initialization
- SDK session persistence (FR46) handles full conversation history on Anthropic's side

### Project Structure Notes
- `src/main/storage/memory-index-store.ts` — memory index repository
- Memory extraction logic in `src/main/agent/` or `src/main/storage/`
- ONLY `src/main/storage/` imports `better-sqlite3`

### References
- FR46 — SDK session persistence for full history
- FR47 — natural references to past work
- NFR16 — transcripts not persisted beyond active session
