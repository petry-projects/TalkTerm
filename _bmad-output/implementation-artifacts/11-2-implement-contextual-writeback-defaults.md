# Story 11.2: Implement Contextual Writeback Defaults

Status: ready-for-dev

## Story
As a TalkTerm user, I want the save method to default based on my session context, so that the most relevant output destination is always the easiest to choose.

## Acceptance Criteria (BDD)

```gherkin
Scenario: ADO work item origin defaults to "Update Work Item"
  Given the session originated from an Azure DevOps work item
  When the output save options are presented
  Then "Update Work Item" is the primary ActionCard, pre-filled with the source work item (FR54, FR56)
  And alternative options ("Save to File", "Send to...") are available as secondary cards

Scenario: Git repo workspace defaults to "Open Pull Request"
  Given the workspace is a git repository
  When the output save options are presented
  Then "Open Pull Request" is the primary ActionCard (FR54)
  And "Commit & Push" and "Save locally" are available as alternative cards

Scenario: Local files or BMAD workspace defaults to "Save to File"
  Given the workspace is a plain directory (no git, no ADO link)
  When the output save options are presented
  Then "Save to File" is the primary ActionCard (FR54)
  And "Send to..." is available as an alternative card for the system picker
```

## Tasks / Subtasks

1. **Write tests for session origin detection — ADO, repo, local** (AC: 1, 2, 3)
   - Test detection of ADO origin: MCP connection present with originating work item
   - Test detection of git repo: `.git` directory exists in workspace path
   - Test detection of local/plain directory: no git, no ADO connection
   - Test precedence: ADO origin takes priority over git repo detection
   - Test edge case: git repo WITH ADO origin (ADO takes priority)

2. **Implement session-origin-detector.ts** (AC: 1, 2, 3)
   - Create `SessionOriginDetector` class in `src/main/agent/session-origin-detector.ts`
   - Check for ADO MCP connection with originating work item context
   - Check for `.git` directory in workspace path
   - Return origin type: `ado-work-item` | `git-repo` | `local-directory`
   - Include origin metadata (e.g., work item ID, repo remote URL)

3. **Write tests for contextual default card ordering** (AC: 1, 2, 3)
   - Test ADO origin: "Update Work Item" is primary, alternatives are secondary
   - Test git repo: "Open Pull Request" is primary, "Commit & Push" and "Save locally" are secondary
   - Test local directory: "Save to File" is primary, "Send to..." is secondary
   - Test that all three paths are always available regardless of origin (just ordering changes)

4. **Implement contextual writeback ActionCards** (AC: 1, 2, 3)
   - Query `SessionOriginDetector` for current session origin
   - Order ActionCards with detected-origin option as primary (first, pre-selected)
   - Ensure all save paths remain available as secondary options
   - Pre-fill origin-specific fields (e.g., work item ID for ADO)

## Dev Notes

### Architecture Guardrails
- `SessionOriginDetector` lives in `src/main/agent/` — it queries filesystem and MCP state
- Detection logic must not import from `src/renderer/`
- Expose origin detection via IPC channel: `session:detect-origin`
- ActionCard ordering is a renderer concern — receives origin data via IPC and orders cards accordingly

### Key Patterns
- Session origin detection: check workspace type (git repo? ADO linked? plain directory?)
- Git detection: check for `.git` directory in workspace path using `fs.existsSync`
- ADO detection: check for ADO MCP connection with originating work item metadata
- All three save paths are always available — only the primary/default changes based on context
- Precedence: ADO origin > git repo > local directory

### Testing
- TDD: write failing tests first for origin detection and card ordering
- Mock filesystem for `.git` directory detection
- Mock MCP state for ADO connection detection
- React Testing Library for ActionCard ordering tests in renderer

### Project Structure Notes
- `src/main/agent/session-origin-detector.ts` — origin detection logic
- `src/main/agent/session-origin-detector.test.ts` — co-located tests
- `src/shared/types/domain/session-origin.ts` — origin type definitions
- Renderer updates to writeback ActionCard container for ordering logic

### References
- PRD: FR54 (Contextual Defaults), FR56 (ADO Pre-fill)
- UX Design: UX-DR15 (Contextual Writeback)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` (Epic 11, Story 11.2)
- Depends on: Story 11.1 (writeback infrastructure)
