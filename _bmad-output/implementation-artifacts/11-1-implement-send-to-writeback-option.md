# Story 11.1: Implement "Send to..." Writeback Option

Status: ready-for-dev

## Story
As a TalkTerm user, I want to send workflow output to a connected external system, so that my results land directly where I need them without manual copy-paste.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Output artifact shows "Send to..." option
  Given a workflow has produced an output artifact
  When the output is displayed in the right panel
  Then a "Send to..." option is available alongside the local file save option (FR48)

Scenario: Available external systems discovered via MCP
  Given the user selects "Send to..."
  When the left panel renders the system picker
  Then available systems are discovered via MCP protocol (e.g., ADO, GitHub) (FR49)
  And only systems with active MCP connections are shown

Scenario: Target picker with system-specific options and content preview
  Given the user selects a target system (e.g., Azure DevOps)
  When the right panel renders the target picker
  Then system-specific options are shown (e.g., project, board, item type for ADO)
  And a content preview is displayed formatted for the target system

Scenario: Writeback confirmation follows confirm-plan pattern
  Given the user has selected a target and reviewed the preview
  When the confirmation step is reached
  Then the avatar describes what will be sent and where (FR50)
  And ActionCards are presented: "Approve & Send", "Change target", "Cancel"
```

## Tasks / Subtasks

1. **Write tests for writeback system discovery via MCP** (AC: 1, 2)
   - Test that available MCP servers are queried for writeback capabilities
   - Test that only servers with write capabilities are returned
   - Test that disconnected/unavailable servers are excluded
   - Test empty state when no MCP integrations are available

2. **Implement writeback-discovery.ts — query available MCP integrations** (AC: 2)
   - Create `WritebackDiscovery` class in `src/main/agent/writeback-discovery.ts`
   - Query Claude Agent SDK for available MCP servers and their capabilities
   - Filter for servers that support write operations
   - Return typed list of available writeback targets

3. **Write tests for target picker UI** (AC: 3)
   - Test that system-specific options render correctly for ADO (project, board, item type)
   - Test that system-specific options render correctly for GitHub (repo, path)
   - Test that selecting options updates the target configuration
   - Test accessibility of picker controls

4. **Implement WritebackTargetPicker component** (AC: 3)
   - Create `WritebackTargetPicker.tsx` in `src/renderer/components/display/`
   - Render system-specific option fields based on selected target type
   - ADO: project selector, board selector, item type selector
   - GitHub: repository selector, file path input

5. **Write tests for content preview formatting** (AC: 3)
   - Test markdown-to-ADO-HTML conversion
   - Test markdown-to-GitHub-markdown pass-through with metadata
   - Test preview truncation for large artifacts
   - Test that preview updates when target system changes

6. **Implement content formatter per target system** (AC: 3)
   - Create formatters for each target system type
   - ADO: markdown to ADO-compatible HTML
   - GitHub: markdown with PR/issue metadata headers
   - Preview component renders formatted output

7. **Write tests for writeback confirmation flow** (AC: 4)
   - Test that avatar describes the writeback action (what + where)
   - Test that three ActionCards render: "Approve & Send", "Change target", "Cancel"
   - Test "Approve & Send" triggers the writeback execution
   - Test "Change target" returns to target picker
   - Test "Cancel" dismisses the writeback flow

8. **Implement writeback confirmation with confirm-plan pattern** (AC: 4)
   - Reuse confirm-plan pattern from Story 5.3
   - Avatar dialogue: describe artifact name, target system, target location
   - ActionCards: Approve & Send, Change target, Cancel
   - On approve: execute writeback via MCP, show success/failure result

## Dev Notes

### Architecture Guardrails
- MCP discovery logic in `src/main/agent/` — queries SDK for MCP server capabilities
- WritebackTargetPicker is a renderer component — accesses main process via IPC only
- Content formatting can live in `src/shared/` if pure, or `src/main/agent/` if it needs SDK context
- Follow confirm-plan pattern established in Story 5.3

### Key Patterns
- MCP discovery: query SDK for available MCP servers → filter by write capability → return typed targets
- Target picker varies by system: ADO -> project/board/item-type, GitHub -> repo/path
- Content preview: format markdown to target-specific format (ADO HTML, GitHub markdown, etc.)
- Confirmation: reuse confirm-plan pattern (FR50) — avatar narrates, cards confirm

### Testing
- TDD: write failing tests first for discovery, UI, formatting, and confirmation
- Mock MCP server responses for discovery tests
- React Testing Library for WritebackTargetPicker and confirmation UI
- Mock `window.electronAPI` for all renderer-to-main IPC calls

### Project Structure Notes
- `src/main/agent/writeback-discovery.ts` — MCP integration discovery
- `src/main/agent/writeback-discovery.test.ts` — co-located tests
- `src/renderer/components/display/WritebackTargetPicker.tsx` — target picker UI
- `src/renderer/components/display/WritebackTargetPicker.test.tsx` — co-located tests
- `src/shared/types/domain/writeback.ts` — writeback target types, formatter types

### References
- PRD: FR48 (Send to...), FR49 (System Picker), FR50 (Confirm Plan)
- UX Design: UX-DR15 (Contextual Writeback)
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` (Epic 11, Story 11.1)
- Depends on: Story 5.3 (confirm-plan pattern)
