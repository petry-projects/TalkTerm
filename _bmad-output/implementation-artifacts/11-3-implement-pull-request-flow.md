# Story 11.3: Implement Pull Request Flow

Status: ready-for-dev

## Story
As a TalkTerm user working in a repo, I want the agent to create a PR with my output, so that my workflow results are ready for team review without leaving TalkTerm.

## Acceptance Criteria (BDD)

```gherkin
Scenario: "Open Pull Request" creates branch, commits, pushes, and opens PR
  Given the user selects "Open Pull Request" for a workflow output
  When the PR creation flow executes
  Then a feature branch is created (e.g., brainstorming/onboarding-features)
  And the output artifact is committed to the branch
  And the branch is pushed to the remote
  And a pull request is created with a generated title and description (FR55)

Scenario: PR link displayed in confirmation view
  Given a pull request has been successfully created
  When the right panel displays the confirmation
  Then the PR URL is shown as a clickable link
  And the PR title and target branch are displayed
```

## Tasks / Subtasks

1. **Write tests for PR creation flow — branch, commit, push, PR** (AC: 1)
   - Test feature branch creation with kebab-case naming based on workflow type + topic
   - Test artifact file is committed to the new branch
   - Test branch is pushed to the remote origin
   - Test PR is created with generated title and description
   - Test error handling: no remote configured, push failure, PR creation failure

2. **Implement pr-creator.ts using git operations + GitHub API** (AC: 1)
   - Create `PrCreator` class in `src/main/agent/pr-creator.ts`
   - Branch creation: `git checkout -b <branch-name>` via child_process or simple-git
   - Branch naming: kebab-case, format `{workflow-type}/{topic-slug}` (e.g., `brainstorming/onboarding-features`)
   - Commit: stage artifact file, commit with auto-generated message
   - Push: `git push -u origin <branch-name>`
   - PR creation: via MCP GitHub integration or direct GitHub API call
   - PR description: auto-generated summary of workflow output

3. **Write tests for PR confirmation display** (AC: 2)
   - Test PR URL renders as a clickable link
   - Test PR title and target branch are displayed
   - Test success state rendering
   - Test error state rendering (PR creation failed)

4. **Implement PR success view with link** (AC: 2)
   - Create confirmation view component in right panel
   - Display PR URL as clickable external link (opens in default browser)
   - Show PR title, source branch, target branch
   - Show avatar confirmation dialogue: "Your pull request is ready for review"

## Dev Notes

### Architecture Guardrails
- Git operations execute in `src/main/agent/` — never in renderer process
- Use `child_process.execFile` for git commands (safer than `exec`) or simple-git library
- GitHub PR creation: prefer MCP GitHub integration if available; fallback to direct API
- PR creator receives workspace path and artifact content — does not access renderer state directly
- Expose PR creation via IPC channel: `writeback:create-pr`

### Key Patterns
- Branch naming: kebab-case, descriptive — `{workflow-type}/{topic-slug}`
- Git operations: sequential — create branch, stage file, commit, push, then create PR
- PR description: auto-generated summary from workflow metadata (type, topic, key outputs)
- Error handling: each git step can fail independently — report specific failure point

### Testing
- TDD: write failing tests first for git operations and confirmation UI
- Mock child_process or simple-git for git command tests
- Mock GitHub API / MCP for PR creation tests
- React Testing Library for confirmation view
- Test error paths: no git remote, authentication failure, branch name conflict

### Project Structure Notes
- `src/main/agent/pr-creator.ts` — PR creation orchestration
- `src/main/agent/pr-creator.test.ts` — co-located tests
- `src/renderer/components/display/PrConfirmationView.tsx` — PR success/failure display
- `src/renderer/components/display/PrConfirmationView.test.tsx` — co-located tests
- `src/shared/types/domain/writeback.ts` — PR result types (shared with Story 11.1)

### References
- PRD: FR55 (Pull Request Creation)
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` (Epic 11, Story 11.3)
- Depends on: Story 11.1 (writeback infrastructure), Story 11.2 (contextual defaults)
