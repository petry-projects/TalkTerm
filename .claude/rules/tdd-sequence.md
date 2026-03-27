---
description: Enforces TDD workflow for all story implementations
globs: ["src/**/*.ts", "src/**/*.tsx"]
---

# TDD Sequence Rules

## Mandatory TDD Workflow

Every implementation MUST follow this sequence — no exceptions:

1. **Red** — Write a failing test that defines the expected behavior
2. **Green** — Write the minimum code to make the test pass
3. **Refactor** — Clean up while keeping tests green

## Story Implementation Protocol

1. Read the story file and acceptance criteria
2. Identify the bounded context and affected aggregates
3. Write unit tests for domain logic first
4. Implement domain layer to pass tests
5. Write integration tests for use cases
6. Implement application layer to pass tests
7. Write tests for adapters/infrastructure
8. Implement infrastructure layer to pass tests
9. Run full test suite — all tests must pass
10. Verify coverage meets 90% threshold
11. Run Stryker mutation testing — must meet 80% minimum

## Hard Constraints

- Never write implementation code before a failing test exists
- Never skip the refactor step
- Never commit with failing tests
- Never reduce coverage below 90%
- Never reduce mutation score below 80%
