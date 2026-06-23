# Copilot Instructions — TalkTerm

## About

TalkTerm is a desktop AI agent interface (Electron + React + TypeScript) that makes CLI-based agentic workflows accessible to non-technical users through voice-enabled animated avatars, running the Claude Agent SDK in-process in the Electron main process.

## Tech Stack

- **Runtime:** Node.js 24 (bundled with Electron 41 + Chromium 144)
- **Framework:** React · Electron 41 · Vite
- **Language:** TypeScript (strict mode — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`)
- **Styling:** Tailwind CSS
- **Avatar animation:** Rive
- **Persistence:** better-sqlite3 · electron-store
- **AI backend:** Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- **Voice:** Web Speech API (STT/TTS)
- **Testing:** Vitest · React Testing Library · Playwright (E2E) · Stryker (mutation)
- **Linting:** ESLint (zero-warnings policy, flat config) · Prettier
- **Packaging:** Electron Forge

## Project Structure

Clean Architecture — dependencies point inward; inner layers never import from outer layers.

```text
src/
  shared/types/     Cross-process domain logic & ports (validators, type guards, branded-type constructors, domain events, invariant checks — pure functions, no external dependencies)
    domain/         Aggregate roots, value objects, domain events, branded types, validators
    ports/          Repository and service interfaces (extension points)
  main/             Application + Infrastructure layer (Electron main process)
    agent/          Use case: agent session lifecycle
    storage/        Infrastructure: SQLite persistence adapters
    security/       Infrastructure: API key lifecycle, admin privilege check
    ipc/            Infrastructure: IPC handler adapters
    main.ts         Composition root
  renderer/         Presentation layer (Chromium renderer process)
    components/     React UI components (avatar/, overlay/, voice/, session/, display/, setup/)
    hooks/          React hooks consuming the preload bridge
    context/        State management via useReducer
    speech/         STT/TTS abstraction implementations
  preload/
    preload.ts      contextBridge gateway — the only architectural seam between main and renderer
```

**Key architectural rule:** `src/shared/types/` contains domain logic (aggregate roots, value objects, domain events, validators, type guards, branded-type constructors, invariant checks) and ports — organized into `domain/` (pure entities and event logic) and `ports/` (repository and service interfaces). All code must be pure functions with no external dependencies or side effects. Never import from `src/main/` in renderer code or from `src/renderer/` in main code — the preload bridge (`window.electronAPI`) is the only seam, and `src/shared/types/` is the only code importable by both processes.

## Local Dev Commands

> **Note:** The Electron app scaffold (`package.json`, `src/`) has not yet been committed. These commands reflect the intended setup once the npm project is initialized and will not work until that scaffold is in place.

- Install:    `npm install`
- Dev run:    `npm run dev`
- Test:       `npm test`
- Test (watch): `npm run test:watch`
- Test (E2E): `npm run test:e2e`
- Mutation:   `npm run test:mutate`
- Lint:       `npm run lint`
- Format:     `npm run format`
- Typecheck:  `npm run typecheck`
- Build:      `npm run build`

## Environment Variables

- `ANTHROPIC_API_KEY` *(optional development override)*: The app implements BYOK via a first-run setup flow that validates and stores the key through Electron `safeStorage`. This variable is **not** required at runtime; it is only useful as a local override during development before the setup flow is implemented.

## Testing Framework

- **Runner:** Vitest (three workspaces: `main` / `renderer` / `shared`)
- **Coverage threshold:** 90% branch / function / line / statement (target; CI enforcement planned once Vitest pipeline is added)
- **Mutation testing:** Stryker — 80% minimum score (target; CI enforcement planned), 90%+ target for domain/repos/use cases
- **E2E:** Playwright with Electron support (`test/e2e/`)
- **Integration tests:** `test/integration/` using in-memory SQLite
- **TDD is mandatory:** write tests before implementation. Test against interfaces/ports — use `Fake*` doubles (e.g. `FakeAgentBackend`) and `:memory:` SQLite for repositories. Never use `.skip()` or coverage-ignore.

## Repo-Specific Overrides

- IPC channels follow `namespace:verb` naming (`agent:message`, `session:resume`, `settings:get`)
- Renderer tests must never import from `src/main/` — mock `window.electronAPI` (the preload bridge) instead
- `FakeAgentBackend` (implementing `AgentBackend`) is the test double for the Claude Agent SDK — use it rather than mocking the SDK directly
- Bounded contexts: Agent · Storage · Security · Voice · Avatar · Overlay

## Org Standards

See [petry-projects/.github — AGENTS.md](https://github.com/petry-projects/.github/blob/main/AGENTS.md) for org-wide development standards, and this repo's [AGENTS.md](../AGENTS.md) for the full project-specific implementation rules.
