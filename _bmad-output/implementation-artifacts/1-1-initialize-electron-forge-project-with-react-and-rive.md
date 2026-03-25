# Story 1.1: Initialize Electron Forge Project with React and Rive

Status: ready-for-dev

## Story

As a developer,
I want the TalkTerm Electron project initialized with the correct starter template, React, Rive, and TypeScript configuration,
So that all future development has a consistent, working foundation aligned with the architecture doc.

## Acceptance Criteria (BDD)

- Given a clean project directory, When the Electron Forge project is initialized with the vite-typescript template, Then the project compiles and launches an empty Electron window
- And React, React DOM, @rive-app/react-webgl2, and TypeScript React types are installed
- And tsconfig.json includes "jsx": "react-jsx" in compiler options
- And the src/ directory structure matches: main/, renderer/, shared/types/, preload/
- And sub-directories exist: main/agent/, main/storage/, main/security/, main/ipc/, renderer/components/, renderer/hooks/, renderer/context/, renderer/speech/, renderer/types/, renderer/styles/
- And forge.config.ts is configured with makers for .dmg (macOS) and .exe/NSIS (Windows)
- And Tailwind CSS is installed and configured in the Vite renderer build pipeline with PostCSS
- And a basic global.css exists with Tailwind directives

## Tasks / Subtasks

1. Run `npx create-electron-app@latest talkterm --template=vite-typescript` (AC: 1)
2. Install React, ReactDOM, Rive, TypeScript types (AC: 2)
   - `npm install react react-dom @rive-app/react-webgl2`
   - `npm install -D @types/react @types/react-dom`
3. Configure tsconfig.json with strict mode, jsx: react-jsx, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride (AC: 3)
4. Create src/ directory structure per architecture doc (AC: 4, 5)
   - main/agent/, main/storage/, main/security/, main/ipc/
   - renderer/components/, renderer/hooks/, renderer/context/, renderer/speech/, renderer/types/, renderer/styles/
   - shared/types/domain/, shared/types/ports/
   - preload/
5. Configure forge.config.ts with dmg and NSIS makers (AC: 6)
6. Install and configure Tailwind CSS + PostCSS in Vite pipeline (AC: 7)
7. Create global.css with Tailwind directives (@tailwind base, components, utilities) (AC: 8)
8. Install dev dependencies: vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, jsdom, eslint, prettier, husky, lint-staged, typescript-eslint, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-import-x
9. Configure ESLint flat config with strict rules (no-floating-promises, strict-boolean-expressions, explicit-function-return-type, no-unused-vars, import-x/order)
10. Configure Prettier (semi: true, singleQuote: true, trailingComma: "all", printWidth: 100, tabWidth: 2)
11. Configure Husky v9 + lint-staged pre-commit hook (eslint --fix, prettier --write, tsc --noEmit, vitest related --run)
12. Verify project compiles and launches empty Electron window

## Dev Notes

- Init command: `npx create-electron-app@latest talkterm --template=vite-typescript`
- Electron 41 bundles Node.js 24 + Chromium 144
- This is the ONLY story that creates the project from scratch — all subsequent stories build on this foundation
- Must set up the complete dev tooling chain: ESLint, Prettier, Vitest, Husky, lint-staged
- Stryker Mutator configuration can be deferred to when first domain logic is written (Story 1.2+)
- Zero warnings policy: ESLint `--max-warnings 0`
- No barrel files (no index.ts re-exports) — import directly from source files

### Project Structure Notes

After this story, the directory tree should be:

```
src/
  main/
    agent/
    storage/
    security/
    ipc/
    main.ts              (composition root)
  renderer/
    components/
    hooks/
    context/
    speech/
    types/
    styles/
      global.css         (Tailwind directives)
  shared/
    types/
      domain/
      ports/
  preload/
    preload.ts
```

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- PRD: `_bmad-output/planning-artifacts/prd.md` (v2.2)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.1
