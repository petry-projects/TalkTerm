---
description: Enforces IPC channel naming conventions for Electron
globs: ["src/**/*.ts"]
---

# IPC Channel Naming Rules

## Pattern

All IPC channels MUST follow the `namespace:verb` pattern:

```
<bounded-context>:<action>
```

## Examples

| Channel | Purpose |
|---------|---------|
| `agent:message` | Send message to Claude agent |
| `agent:stream` | Stream agent response chunks |
| `agent:cancel` | Cancel in-progress agent request |
| `session:create` | Create new conversation session |
| `session:resume` | Resume existing session |
| `session:list` | List available sessions |
| `storage:save` | Persist data to SQLite |
| `voice:start` | Begin speech recognition |
| `voice:stop` | Stop speech recognition |
| `avatar:state` | Update avatar animation state |
| `overlay:toggle` | Toggle overlay visibility |

## Rules

- Namespace MUST match the bounded context name (lowercase)
- Verb MUST be a single imperative word (e.g., `create`, `list`, `update`, `delete`, `start`, `stop`)
- No nested namespaces (e.g., `agent:session:create` is invalid — use `session:create`)
- Channel names are defined as string literal types in `src/shared/ipc-channels.ts`
- Both main and renderer must reference the same channel constant — never use raw strings
