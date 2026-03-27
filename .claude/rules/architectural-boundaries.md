---
description: Enforces Clean Architecture dependency rules and layer boundaries
globs: ["src/**/*.ts", "src/**/*.tsx"]
---

# Architectural Boundary Rules

## Dependency Direction

Dependencies MUST point inward — never outward:

```
Infrastructure → Application → Domain
     ↑               ↑           ↑
  Adapters      Use Cases    Entities
                             Value Objects
                             Domain Events
```

## Import Rules

### Domain Layer (innermost)
- MUST NOT import from Application or Infrastructure
- MUST NOT import from external libraries (except pure utility types)
- CAN import from other domain modules within the same bounded context

### Application Layer
- CAN import from Domain
- MUST NOT import from Infrastructure
- Defines port interfaces that Infrastructure implements

### Infrastructure Layer (outermost)
- CAN import from Application and Domain
- Implements ports defined by Application layer
- Contains all external dependencies (Electron, SQLite, file system, etc.)

## Electron Process Boundaries

- **Main process** code MUST NOT be imported by **renderer process**
- **Renderer process** code MUST NOT be imported by **main process**
- **Shared types** (`src/shared/`) are the ONLY cross-process imports allowed
- IPC is the ONLY communication channel between processes

## Bounded Context Isolation

Each bounded context (Agent, Storage, Security, Voice, Avatar, Overlay) owns its domain model. Cross-context communication MUST use domain events or application-level orchestration — never direct imports of another context's domain internals.
