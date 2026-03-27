---
description: Hard constraints on code quality — no exceptions
globs: ["**/*.ts", "**/*.tsx", "**/*.js"]
---

# No Shortcuts Rules

## TypeScript Strict Mode

- `strict: true` in tsconfig — non-negotiable
- No `any` types — use `unknown` and narrow with type guards
- No `@ts-ignore` or `@ts-expect-error` without an accompanying issue link
- No non-null assertions (`!`) unless the invariant is documented

## Zero Warnings Policy

- ESLint must produce zero warnings, not just zero errors
- No `eslint-disable` comments without a linked issue explaining why
- All rules apply equally to production and test code

## Formatting

- Prettier handles all formatting — no manual formatting overrides
- Run `npx prettier --write .` before every commit
- Pre-commit hooks (Husky + lint-staged) enforce this in local development

## Code Quality

- No `console.log` in production code — use the structured logger
- No magic numbers — extract to named constants
- No default exports — use named exports exclusively
- No circular dependencies
- No barrel files (`index.ts` re-exports) unless they are the public API of a bounded context
