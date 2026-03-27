---
description: Enforces consistent error handling across architectural boundaries
globs: ["src/**/*.ts", "src/**/*.tsx"]
---

# Error Pipeline Rules

## Error Classification

All errors MUST be classified into one of these categories:

| Category | Description | User-Facing |
|----------|-------------|-------------|
| `DomainError` | Business rule violation | Yes — explain what went wrong |
| `ApplicationError` | Use case or orchestration failure | Yes — generic message |
| `InfrastructureError` | External system failure (DB, API, IPC) | No — log and show fallback |
| `UnexpectedError` | Programming bug or unknown failure | No — log and show generic error |

## Error Wrapping at Boundaries

When an error crosses an architectural boundary, it MUST be wrapped:

1. **Infrastructure → Application**: Catch infrastructure exceptions, wrap in `ApplicationError` with context
2. **Application → Presentation**: Catch application errors, map to user-facing messages
3. **IPC boundary**: Errors crossing IPC must be serializable — use plain objects with `type`, `message`, and `context` fields

## Rules

- Never swallow errors silently — always log or propagate
- Never expose stack traces to the renderer process
- Never throw raw `Error` — always use typed error classes
- Domain errors carry enough context for the user to correct their action
- Infrastructure errors include the operation that failed and a correlation ID for debugging
- All error handlers must be tested — including the error paths
