# Story 4.4: Enable Agent File Operations and MCP Tool Invocation

Status: ready-for-dev

## Story
As a TalkTerm user, I want the agent to read, create, and modify files and use tools on my behalf, so that I can accomplish real work through natural language.

## Acceptance Criteria (BDD)

```gherkin
Scenario: SDK built-in tools operate within workspace
  Given a session is active with a configured workspace directory
  When the agent uses built-in tools (Read, Edit, Write, Glob, Grep, Bash)
  Then all operations are scoped to the workspace directory
  And no file access occurs outside the workspace boundary

Scenario: MCP tools are invoked per protocol
  Given MCP servers are configured for the workspace
  When the agent invokes an MCP tool
  Then the tool is called following the MCP protocol
  And results are returned to the agent for processing

Scenario: Natural language translates to agent actions
  Given the user provides a natural language request
  When the agent processes the request
  Then it determines the appropriate file operations or tool invocations
  And executes them within the workspace context
```

## Tasks / Subtasks

1. **Write tests for workspace-scoped file operations** — verify tools respect workspace boundary (AC: 1)
2. **Configure SDK workspace directory context** — set workingDirectory in session config (AC: 1)
3. **Write tests for MCP tool invocation** — verify MCP protocol compliance (AC: 2)
4. **Configure SDK MCP server support** — enable MCP servers per workspace configuration (AC: 2)
5. **Write tests for intent-to-action translation** — natural language produces correct tool calls (AC: 3)
6. **Verify file system scoping** — confirm no operations escape workspace boundary (NFR8)

## Dev Notes

- The SDK provides built-in tools (Read, Edit, Write, Glob, Grep, Bash) — no custom tool implementation is needed for file operations.
- MCP support is built into the SDK — configure MCP servers per workspace in the SDK session config.
- Workspace scoping: set `workingDirectory` in the SDK session configuration. This constrains all file operations to the workspace.
- This story is primarily **configuration and integration testing**, not new production code. The SDK does the heavy lifting; we verify correct configuration and boundary enforcement.
- File system scoping (NFR8) is a security requirement — test that attempts to access files outside the workspace are rejected.

### Project Structure Notes

| File | Purpose |
|------|---------|
| `src/main/agent/claude-sdk-backend.ts` | SDK configuration (workspace dir, MCP servers) |
| `src/main/agent/claude-sdk-backend.test.ts` | Integration tests for tool scoping |

### References

- PRD: FR10, FR11, FR13, FR14, NFR8, NFR15
- Architecture: Main process agent layer, workspace scoping, MCP integration
- Epics: Epic 4, Story 4.4
