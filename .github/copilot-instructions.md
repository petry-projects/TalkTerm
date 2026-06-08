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

```
src/
  shared/types/     Domain layer — entities, value objects, port interfaces (importable by both processes)
    domain/         Aggregate roots, branded types, domain events
    ports/          Repository and service interfaces
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

DDD bounded contexts: **Agent**, **Storage**, **Security**, **Voice**, **Avatar**, **Overlay**. Use branded types (`SessionId`, `WorkspacePath`, `ApiKey`) to prevent wrong-string bugs. Never import from `src/main/` in renderer code or from `src/renderer/` in main code — the preload bridge (`window.electronAPI`) is the only seam, and `src/shared/` is the only code importable by both processes.

## Local Dev Commands

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

## Required Environment Variables

- `ANTHROPIC_API_KEY`: Anthropic API key for the Claude Agent SDK (stored via Electron `safeStorage` after first-run setup; not required in the environment for production use)

## Testing Framework

- **Runner:** Vitest (three workspaces: `main` / `renderer` / `shared`)
- **Coverage threshold:** 90% branch / function / line / statement (CI gate)
- **Mutation testing:** Stryker — 80% minimum score (CI gate), 90%+ target for domain/repos/use cases
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
