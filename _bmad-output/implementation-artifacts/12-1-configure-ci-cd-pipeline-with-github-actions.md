# Story 12.1: Configure CI/CD Pipeline with GitHub Actions

Status: ready-for-dev

## Story
As a developer, I want automated build, test, and packaging on every push and release, so that quality is enforced automatically and releases are reproducible.

## Acceptance Criteria (BDD)

```gherkin
Scenario: Push or PR triggers CI workflow
  Given a developer pushes code or opens a pull request
  When the CI workflow runs
  Then the project builds and all tests pass on both macOS and Windows
  And all quality gates are enforced (type check, lint, format, coverage, mutation testing, E2E)

Scenario: Version tag triggers release workflow
  Given a version tag (e.g., v1.0.0) is pushed
  When the release workflow runs
  Then platform-specific packages are built (.dmg for macOS, .exe/NSIS for Windows)
  And macOS package is code-signed and notarized
  And Windows package is signed with Authenticode
  And all artifacts are published to GitHub Releases
```

## Tasks / Subtasks

1. **Write CI workflow .github/workflows/ci.yml** (AC: 1)
   - Trigger on push to all branches and pull_request events
   - Install Node.js 24, install dependencies
   - Run all quality gates: `tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`
   - Run `vitest run --coverage` with 90% threshold enforcement
   - Run `npx stryker run` with 80% mutation score enforcement
   - Run `playwright test` for E2E tests

2. **Configure matrix build: macOS + Windows** (AC: 1)
   - Matrix strategy: `macos-latest`, `windows-latest`, `ubuntu-latest`
   - Ensure native dependencies (better-sqlite3) compile on each platform
   - Cache node_modules per platform for faster builds

3. **Write release workflow .github/workflows/release.yml** (AC: 2)
   - Trigger on version tags matching `v*.*.*`
   - Build platform packages using Electron Forge
   - Upload artifacts to GitHub Releases

4. **Configure Electron Forge makers for .dmg and NSIS** (AC: 2)
   - `@electron-forge/maker-dmg` for macOS .dmg packages
   - `@electron-forge/maker-squirrel` for Windows NSIS installer
   - Configure maker options: app name, icon, signing identity references

5. **Configure code signing secrets** (AC: 2)
   - macOS: Apple Developer certificate and notarization credentials in GitHub Secrets
   - Windows: Authenticode certificate in GitHub Secrets
   - Environment variables: `APPLE_ID`, `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID`, `CSC_LINK`, `CSC_KEY_PASSWORD`
   - Windows: `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`

6. **Configure GitHub Releases publishing** (AC: 2)
   - Use `@electron-forge/publisher-github` to publish to GitHub Releases
   - Auto-generate release notes from commits since last tag
   - Mark pre-release for `v0.x.x` tags

## Dev Notes

### Architecture Guardrails
- CI gates must match those defined in CLAUDE.md Section 7 exactly
- All quality gates block PR merge — no exceptions
- Code signing secrets must never be logged or exposed in workflow output
- Workflow files live in `.github/workflows/` — standard GitHub Actions location

### Key Patterns
- CI quality gates: tsc --noEmit, eslint --max-warnings 0, prettier --check, vitest run --coverage (90%), stryker run (80% score), playwright test
- Matrix build: ubuntu-latest (Linux), macos-latest, windows-latest
- Electron Forge: `@electron-forge/maker-dmg` (macOS), `@electron-forge/maker-squirrel` (Windows)
- Code signing: macOS notarization requires Apple Developer cert; Windows requires Authenticode cert
- Secrets: stored in GitHub repository secrets, referenced via `${{ secrets.* }}`

### Testing
- CI workflow is tested by the CI run itself (self-validating)
- Release workflow: test with a pre-release tag on a feature branch first
- Validate that all quality gates actually block on failure (intentionally break one to verify)

### Project Structure Notes
- `.github/workflows/ci.yml` — CI workflow for push/PR
- `.github/workflows/release.yml` — release workflow for version tags
- `forge.config.ts` — Electron Forge configuration with makers and publishers
- Package.json scripts must align with CI commands

### References
- CLAUDE.md: Section 7 (CI Quality Gates)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` (Epic 12, Story 12.1)
- Electron Forge docs: https://www.electronforge.io/
