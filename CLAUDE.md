# TalkTerm — Project Context & Implementation Rules

This file is the single source of truth for all implementation agents working on TalkTerm. It enforces SDLC best practices, coding standards, and architectural rules. Every story implementation, code review, and PR must comply with these rules.

---

## Project Overview

TalkTerm is a desktop AI agent interface (Electron + React + TypeScript) that makes CLI-based agentic workflows accessible to non-technical users through voice-enabled animated avatars. The Claude Agent SDK runs in-process in the Electron main process.

**Stack:** Electron 41 (Node.js 24 + Chromium 144) | TypeScript (strict) | React | Vite | Tailwind CSS | Rive (avatar animation) | better-sqlite3 | electron-store | Web Speech API | Claude Agent SDK

**Planning artifacts:** `_bmad-output/planning-artifacts/` contains PRD, Architecture, UX Design Specification, and Epics & Stories documents. Always consult these before implementing.

---

## 1. Test-Driven Development (TDD) — Strict

**Every story starts with a failing test.** No production code is written without a failing test that justifies it.

### TDD Workflow (Red-Green-Refactor)

1. **Red:** Write a failing test that defines the expected behavior
2. **Green:** Write the minimum production code to make the test pass
3. **Refactor:** Clean up the code while keeping tests green
4. **Repeat:** Next behavior, next failing test

### Testing Framework & Configuration

- **Framework:** Vitest (aligned with Vite build pipeline)
- **Component testing:** React Testing Library + @testing-library/user-event
- **E2E:** Playwright with Electron support
- **Test location:** Co-located next to source files with `.test.ts` / `.test.tsx` suffix
- **Integration tests:** `test/integration/` directory
- **E2E tests:** `test/e2e/` directory

### Vitest Workspace Configuration

Tests run in environment-appropriate contexts:

| Workspace | Files | Environment | Purpose |
|-----------|-------|-------------|---------|
| `main` | `src/main/**/*.test.ts` | `node` | Agent backend, storage, security, IPC handlers |
| `renderer` | `src/renderer/**/*.test.{ts,tsx}` | `jsdom` | React components, hooks, reducers |
| `shared` | `src/shared/**/*.test.ts` | `node` | Type guards, validators, domain types |

### What to Test (by Layer)

| Layer | What to Test | How |
|-------|-------------|-----|
| **Domain types** (`shared/`) | Type guards, validators, branded type constructors, invariant checks | Pure unit tests, no mocking |
| **Repositories & stores** (`main/storage/`) | CRUD operations, query correctness, constraint enforcement | Use `:memory:` SQLite databases |
| **Use cases** (`main/agent/`) | Session lifecycle, message routing, error classification | Mock repository interfaces, test against ports |
| **Security** (`main/security/`) | Admin check logic, key state machine, validation flow | Mock Electron APIs (`safeStorage`, `process`) |
| **IPC handlers** (`main/ipc/`) | Handler registration, message routing, error wrapping | Mock `mainWindow.webContents.send` |
| **React hooks** (`renderer/hooks/`) | State transitions, side effect triggers, return values | `renderHook()` from React Testing Library |
| **React reducers** (`renderer/context/`) | State transitions for every action type | Pure unit tests on reducer function |
| **React components** (`renderer/components/`) | User interactions, conditional rendering, accessibility | React Testing Library with user-event |
| **Speech abstractions** (`renderer/speech/`) | Interface compliance, state machine transitions | Mock Web Speech API globals |

### Mocking Strategy

- **Main process:** Mock Electron modules (`electron`, `safeStorage`), `better-sqlite3` (use `:memory:` DB), and `@anthropic-ai/claude-agent-sdk` (create `FakeAgentBackend` implementing `AgentBackend` interface)
- **Renderer process:** Mock the preload bridge (`window.electronAPI`) — this is the architectural seam. Never import from `src/main/` in renderer tests.
- **Shared types:** No mocking needed — pure functions only.
- **Test against interfaces, not implementations.** If code works with `FakeAgentBackend`, it works with any real backend.

### Coverage Requirements

- **Branch coverage:** 90% (enforced in CI)
- **Function coverage:** 90% (enforced in CI)
- **Line coverage:** 90% (enforced in CI)
- **Statement coverage:** 90% (enforced in CI)

Untested code paths should be justified or removed. Dead code is deleted, not excluded.

### Mutation Testing

**Tool:** Stryker Mutator (`@stryker-mutator/core` with `@stryker-mutator/vitest-runner`)

Mutation testing validates that tests actually catch bugs — not just that they execute code paths. Stryker modifies (mutates) production code and verifies that tests fail. Surviving mutants indicate weak or missing assertions.

**Requirements:**

- **Mutation score minimum:** 80% (enforced in CI)
- **Target:** 90%+ for domain logic, repositories, and use cases
- Mutation testing runs in CI on every PR (not in pre-commit — too slow)
- Surviving mutants must be investigated: either strengthen the test or justify the survival

**Stryker configuration** (`stryker.config.mjs`):

```javascript
export default {
  testRunner: 'vitest',
  mutate: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.ts',
    '!src/preload/**',           // contextBridge wiring — tested via E2E
    '!src/main/main.ts',         // composition root — tested via integration/E2E
  ],
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: {
    high: 90,
    low: 80,
    break: 80,   // CI fails below 80%
  },
  vitest: {
    configFile: 'vitest.config.ts',
  },
};
```

**What to exclude from mutation testing:**
- Composition roots (`main.ts`, `renderer.tsx`) — wiring code tested via integration/E2E
- Preload scripts — contextBridge boilerplate tested via E2E
- Type-only files (`.d.ts`, pure type exports)

**What must score 90%+:**
- Domain objects (`shared/types/domain/`)
- Repository implementations (`main/storage/`)
- Use case orchestration (`main/agent/`)
- Security logic (`main/security/`)
- React reducers and hooks with business logic

---

## 2. SOLID Principles

### Single Responsibility (S)

Each file and class has one reason to change. Each directory in `src/main/` maps to one bounded context.

```
GOOD: agent-backend.ts (interface), claude-sdk-backend.ts (implementation), agent-message-router.ts (routing)
BAD:  agent.ts (creates session + routes messages + writes audit + handles errors)
```

### Open/Closed (O)

New behaviors are added by creating new implementations, not modifying existing ones. The `AgentBackend`, `SpeechToText`, `TextToSpeech`, `SessionRepository`, and `AuditRepository` interfaces are extension points — add new implementations without changing consumers.

### Liskov Substitution (L)

Any implementation of an interface must fulfill the full contract. Validate with a `Fake*` implementation in tests — if code works with the fake, it works with any real implementation.

### Interface Segregation (I)

IPC channels are already segregated: `agent:*`, `session:*`, `settings:*`, `voice:*`. The renderer subscribes only to channels it needs. Keep interfaces focused — prefer multiple small interfaces over one large one.

### Dependency Inversion (D)

High-level modules depend on abstractions (interfaces), not implementations. Use **manual constructor injection** — no DI framework.

```typescript
// Composition root in src/main/main.ts
const db = initializeDatabase(dbPath);
const sessionRepo = new SqliteSessionRepository(db);
const auditRepo = new SqliteAuditRepository(db);
const keyManager = new SafeStorageKeyManager();
const agentBackend = new ClaudeSdkBackend(auditRepo, configStore);
```

**No DI frameworks** (TSyringe, InversifyJS, etc.). Manual wiring in `main.ts` is simpler, fully type-safe, and sufficient for this project's ~7 components.

---

## 3. Clean Architecture

Dependencies point inward. Inner layers never import from outer layers.

```
src/
  shared/types/              DOMAIN LAYER (entities, value objects, domain events)
    ├── domain/              Aggregate roots, value objects, domain events
    ├── ports/               Repository and service interfaces (ports)
    └── ...                  Shared type definitions

  main/                      APPLICATION + INFRASTRUCTURE LAYER
    ├── agent/               Use case: agent session management
    │   ├── agent-backend.ts          Port (interface)
    │   ├── claude-sdk-backend.ts     Adapter (SDK implementation)
    │   └── agent-message-router.ts   Use case orchestration
    ├── storage/             Infrastructure: persistence adapters
    │   ├── sqlite-session-repository.ts   Implements SessionRepository
    │   ├── sqlite-audit-repository.ts     Implements AuditRepository
    │   └── electron-config-store.ts       Implements ConfigStore
    ├── security/            Infrastructure: credential management
    ├── ipc/                 Infrastructure: IPC handler adapters
    └── main.ts              Composition root (wires everything)

  renderer/                  PRESENTATION LAYER
    ├── components/          React UI components
    ├── hooks/               React hooks (consume preload bridge)
    ├── context/             State management (useReducer)
    └── speech/              STT/TTS abstraction implementations

  preload/                   GATEWAY (Electron contextBridge)
    └── preload.ts           Exposes main process ports to renderer
```

### Import Rules (Enforced)

- `shared/` imports **nothing** from `main/` or `renderer/`
- `main/` imports from `shared/` only — never from `renderer/`
- `renderer/` imports from `shared/` only — never from `main/`
- `preload/` imports from `shared/` only
- Only `claude-sdk-backend.ts` may import `@anthropic-ai/claude-agent-sdk`
- Only `web-speech-*.ts` files may use Web Speech API directly
- Only `src/main/storage/` files may import `better-sqlite3` or `electron-store`

---

## 4. Domain-Driven Design (DDD)

### Bounded Contexts

| Context | Directory | Responsibility | Aggregate Root |
|---------|-----------|---------------|----------------|
| **Agent** | `main/agent/` | Session lifecycle, message routing, backend abstraction | `AgentSession` |
| **Storage** | `main/storage/` | Session persistence, audit trail, config | `Session` |
| **Security** | `main/security/` | API key lifecycle, admin privilege check | `ApiKeyState` |
| **Voice** | `renderer/speech/` | STT/TTS pipeline, barge-in state machine | `VoiceSession` |
| **Avatar** | `renderer/components/avatar/` | Animation state machine, persona mapping | `AvatarState` |
| **Overlay** | `renderer/components/overlay/` + `display/` | Action cards, output panels, display modes | `OverlayStack` |

### Aggregate Roots

An aggregate root is the entry point for all modifications to its cluster of related objects. External code interacts only with the aggregate root — never with its internal objects directly.

```typescript
// src/shared/types/domain/session.ts
export class Session {
  private constructor(
    public readonly id: SessionId,
    public readonly workspacePath: WorkspacePath,
    private _status: SessionStatus,
    private _sdkSessionId: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(workspace: WorkspacePath): Session { ... }
  resume(sdkSessionId: string): void { ... }
  pause(): void { ... }
  complete(): void { ... }
  fail(reason: string): void { ... }

  get status(): SessionStatus { return this._status; }
  get updatedAt(): Date { return this._updatedAt; }
}
```

### Value Objects (Immutable, Compared by Value)

Use branded types to prevent passing the wrong string to the wrong function:

```typescript
// src/shared/types/domain/value-objects.ts
export type SessionId = string & { readonly __brand: 'SessionId' };
export type WorkspacePath = string & { readonly __brand: 'WorkspacePath' };
export type ApiKey = string & { readonly __brand: 'ApiKey' };

export function createSessionId(raw: string): SessionId {
  if (!raw || raw.length < 8) throw new Error('Invalid session ID');
  return raw as SessionId;
}

export function createWorkspacePath(raw: string): WorkspacePath {
  if (!raw) throw new Error('Workspace path cannot be empty');
  return raw as WorkspacePath;
}
```

### Repository Interfaces (Ports)

```typescript
// src/shared/types/ports/session-repository.ts
export interface SessionRepository {
  save(session: Session): void;
  findById(id: SessionId): Session | null;
  findIncomplete(workspacePath: WorkspacePath): Session[];
  findAll(): Session[];
}

// src/shared/types/ports/audit-repository.ts
export interface AuditRepository {
  append(entry: AuditEntry): void;
  findBySession(sessionId: SessionId): AuditEntry[];
  findByDateRange(from: Date, to: Date): AuditEntry[];
}
```

### Domain Events

Domain events decouple bounded contexts. When an action in one context affects another, publish an event rather than creating a direct dependency.

```typescript
// src/shared/types/domain/events.ts
export type DomainEvent =
  | { type: 'session:created'; sessionId: SessionId; workspace: WorkspacePath }
  | { type: 'session:resumed'; sessionId: SessionId }
  | { type: 'session:completed'; sessionId: SessionId; outputPath: string }
  | { type: 'agent:action-logged'; entry: AuditEntry }
  | { type: 'agent:error-classified'; error: AgentError }
  | { type: 'preference:updated'; agentType: string; key: string; value: string };

// Simple synchronous event bus (no framework needed)
export class DomainEventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => void>>();

  on(type: DomainEvent['type'], handler: (event: DomainEvent) => void): void { ... }
  emit(event: DomainEvent): void { ... }
}
```

### Anti-Corruption Layer

The Claude Agent SDK's message types are external — do not let them leak into domain code. Map SDK messages to domain events at the boundary (`claude-sdk-backend.ts`).

```typescript
// In claude-sdk-backend.ts — the ONLY file that imports the SDK
// Map SDKMessage → AgentEvent (our domain type) at the boundary
function mapSdkMessage(msg: SDKMessage): AgentEvent { ... }
```

---

## 5. Pre-Commit Quality Checks (Thorough Gate)

### Husky v9 + lint-staged v15

**Pre-commit hook** (`.husky/pre-commit`):

```bash
#!/usr/bin/env sh
npx lint-staged && npx tsc --noEmit && npx vitest related --run
```

**lint-staged configuration** (in `package.json`):

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{css,json,md}": [
      "prettier --write"
    ]
  }
}
```

### What Runs on Every Commit

| Check | Tool | Purpose | Approximate Time |
|-------|------|---------|-----------------|
| Lint + autofix | ESLint | Catch floating promises, unused code, type issues | ~3-5s |
| Format | Prettier | Consistent formatting | <1s |
| Type check | `tsc --noEmit` | Catch type errors across full project | ~5-15s |
| Related tests | `vitest related --run` | Run tests affected by staged files | ~5-20s |

**Total: 15-40 seconds per commit.** This catches the vast majority of defects before they reach CI.

---

## 6. Code Quality Tooling

### ESLint (Flat Config)

Key rules enforced:

| Rule | Why |
|------|-----|
| `@typescript-eslint/no-floating-promises` | The #1 async bug — forgotten `await` |
| `@typescript-eslint/strict-boolean-expressions` | Prevents truthy/falsy surprises with `""`, `0`, `null` |
| `@typescript-eslint/explicit-function-return-type` | Documents intent, catches type widening |
| `@typescript-eslint/no-unused-vars` | Dead code removal (with `_` prefix exceptions) |
| `import-x/order` | Consistent import ordering: builtin → external → internal → parent → sibling |
| `import-x/no-duplicates` | No duplicate imports |
| React hooks rules | Enforce rules of hooks and exhaustive deps |

**Zero warnings policy:** `--max-warnings 0` — warnings are errors.

### Prettier

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### TypeScript Configuration

- `strict: true` — enables all strict checks
- `noUncheckedIndexedAccess: true` — forces null checks on array/object indexing
- `exactOptionalPropertyTypes: true` — distinguishes `undefined` from missing
- `noImplicitOverride: true` — requires `override` keyword

---

## 7. CI Quality Gates (GitHub Actions)

Every PR must pass ALL gates before merge:

| Gate | Command | Blocks PR? | Why |
|------|---------|-----------|-----|
| Type check | `tsc --noEmit` | Yes | Type errors are bugs |
| Lint | `eslint . --max-warnings 0` | Yes | Catches floating promises, dead code |
| Format | `prettier --check .` | Yes | Formatting is not debatable |
| Unit + component tests | `vitest run` | Yes | Regressions |
| Coverage (all metrics) | `vitest run --coverage` | Yes (90% branch/function/line/statement) | Comprehensive test coverage |
| Mutation testing | `npx stryker run` | Yes (80% score) | Tests must catch real bugs, not just execute paths |
| E2E (macOS + Windows) | `playwright test` | Yes | Cross-platform correctness |

---

## 8. Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Variables / functions | camelCase | `sessionId`, `startSession()` |
| Types / interfaces | PascalCase | `AgentBackend`, `SessionConfig` |
| React components | PascalCase | `AvatarCanvas`, `ActionCard` |
| Constants / enums | UPPER_SNAKE_CASE | `MAX_TURNS`, `AvatarState.SPEAKING` |
| General source files | kebab-case | `agent-backend.ts`, `session-store.ts` |
| React component files | PascalCase | `AvatarCanvas.tsx`, `ActionCard.tsx` |
| Test files | Co-located, `.test.ts` | `agent-backend.test.ts` next to source |
| IPC channels | `namespace:verb` | `agent:message`, `session:resume` |
| SQLite tables | snake_case, plural | `sessions`, `audit_entries` |
| SQLite columns | snake_case | `session_id`, `created_at` |
| Rive state inputs | camelCase | `isListening`, `isThinking` |
| Domain events | `context:past-tense` | `session:created`, `agent:error-classified` |
| Branded types | PascalCase | `SessionId`, `WorkspacePath`, `ApiKey` |

---

## 9. Architectural Boundaries (Hard Rules)

These are **non-negotiable** — any violation must be fixed before merge:

1. **Process boundary:** Main process NEVER imports from `src/renderer/`. Renderer NEVER imports from `src/main/`. Both import from `src/shared/types/` only.
2. **SDK isolation:** Only `claude-sdk-backend.ts` imports `@anthropic-ai/claude-agent-sdk`.
3. **Speech isolation:** Only `web-speech-stt.ts` and `web-speech-tts.ts` use Web Speech API.
4. **Storage isolation:** Only `src/main/storage/` imports `better-sqlite3` or `electron-store`.
5. **Error pipeline:** ALL errors route through the avatar conversation layer. No raw errors, stack traces, error codes, or API error text in the UI. Ever.
6. **Audit trail:** ALL agent actions logged. Logging is never skipped.
7. **State management:** `useReducer` via context for app state. No `useState` for complex state. Action names follow `domain:verb` pattern.
8. **No barrel files:** Import directly from source files. No `index.ts` re-exports.

---

## 10. Story Implementation Protocol

When implementing any story, follow this exact sequence:

1. **Read the story** from `_bmad-output/planning-artifacts/epics.md`
2. **Read referenced FRs** from the PRD for full context
3. **Read architecture decisions** relevant to the story
4. **Read UX design specs** for any UI components in the story
5. **Write failing tests** for each acceptance criterion (Red)
6. **Implement minimum code** to pass each test (Green)
7. **Refactor** while keeping tests green
8. **Verify pre-commit passes** before committing
9. **Run full test suite** to catch regressions

### Story Completion Checklist

Before marking a story as done:

- [ ] All acceptance criteria have corresponding tests
- [ ] All tests pass
- [ ] Pre-commit hook passes (lint + format + type check + related tests)
- [ ] Coverage meets 90% threshold (branch, function, line, statement)
- [ ] Mutation testing run on changed files — surviving mutants investigated
- [ ] No `any` types introduced
- [ ] No `// @ts-ignore` or `// eslint-disable` without documented justification
- [ ] Domain objects use branded types for IDs
- [ ] Repository interfaces used (not direct DB access in use cases)
- [ ] Errors routed through error pipeline (no raw errors in UI)
- [ ] IPC channels follow `namespace:verb` naming
- [ ] New files follow naming conventions
- [ ] Imports follow the architectural boundary rules

---

## 11. Development Environment

### Required Tools

- Node.js 24+ (bundled with Electron 41)
- npm (package manager)
- Git

### Key Dev Dependencies

```
vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
eslint typescript-eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-import-x
prettier husky lint-staged
@playwright/test
@stryker-mutator/core @stryker-mutator/vitest-runner
```

### npm Scripts

```
npm test          → vitest run
npm run test:watch → vitest
npm run test:e2e  → playwright test
npm run test:mutate → stryker run
npm run lint      → eslint . --max-warnings 0
npm run format    → prettier --write .
npm run typecheck → tsc --noEmit
npm run dev       → electron-forge start
npm run build     → electron-forge make
```

---

## 12. File Organization Rules

- Feature-based organization in renderer: `avatar/`, `overlay/`, `voice/`, `session/`, `display/`, `setup/`
- Concern-based organization in main: `agent/`, `storage/`, `security/`, `ipc/`
- Shared types in `src/shared/types/` — the ONLY code importable by both processes
- Domain objects in `src/shared/types/domain/` — aggregate roots, value objects, events
- Port interfaces in `src/shared/types/ports/` — repository and service contracts
- Tests co-located next to source files with `.test.ts` suffix
- Integration tests in `test/integration/`
- E2E tests in `test/e2e/`

---

## References

- **PRD:** `_bmad-output/planning-artifacts/prd.md` (v2.2)
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md`
- **UX Design:** `_bmad-output/planning-artifacts/ux-design-specification.md` (v1.5)
- **Epics & Stories:** `_bmad-output/planning-artifacts/epics.md` (12 epics, 45 stories)
- **Readiness Report:** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-24.md`
