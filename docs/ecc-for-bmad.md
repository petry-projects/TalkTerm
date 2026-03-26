# ECC for BMad — Integration Guide

How to run [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) (ECC) alongside the [BMad Method](https://github.com/bmadcode/bmad-method) for projects that use BMad's SDLC agent workflow with ECC's runtime harness, hooks, and rules.

---

## Why Both?

BMad and ECC serve different, complementary roles:

| Concern | BMad | ECC |
|---------|------|-----|
| **SDLC workflow** | Agents (PM, Architect, Dev, QA, etc.), story lifecycle, sprint planning | Not involved — no competing orchestration |
| **Project-specific rules** | `CLAUDE.md` — architecture, DDD, domain boundaries, testing strategy | Not involved — doesn't override project rules |
| **Language/coding rules** | Not provided | `~/.claude/rules/` — TypeScript, React, security, git workflow, patterns |
| **Runtime hooks** | Not provided | Session persistence, `--no-verify` blocker, quality gates, compaction, cost tracking |
| **Slash commands** | BMad skills (`/bmad-dev-story`, `/bmad-sprint-planning`, etc.) | ECC commands (`/tdd`, `/code-review`, `/verify`, `/save-session`, `/plan`, etc.) |
| **Agents** | 10 role-based agents (analyst, architect, dev, PM, QA, SM, etc.) | 28 task-based agents (code-reviewer, e2e-runner, build-error-resolver, etc.) |

**The integration principle:** BMad owns the *what* (requirements, stories, acceptance criteria). ECC owns the *how* (coding standards, runtime safety, session management). They share the same `~/.claude/` namespace without conflict because BMad skills install to the **project** (`.claude/skills/`) while ECC installs to the **user home** (`~/.claude/`).

---

## Architecture

```
~/.claude/                          ← ECC (user-level, global)
├── plugin.json                     ← ECC plugin manifest
├── settings.json                   ← User settings (permissions, plugins)
├── rules/
│   ├── common/                     ← Language-agnostic rules (9 files)
│   │   ├── coding-style.md
│   │   ├── testing.md
│   │   ├── security.md
│   │   ├── git-workflow.md
│   │   ├── patterns.md
│   │   ├── performance.md
│   │   ├── development-workflow.md
│   │   ├── agents.md
│   │   └── hooks.md
│   └── typescript/                 ← TS-specific rules (5 files)
│       ├── coding-style.md
│       ├── testing.md
│       ├── security.md
│       ├── patterns.md
│       └── hooks.md
├── hooks/
│   └── hooks.json                  ← 28 hooks across 7 lifecycle events
├── scripts/hooks/                  ← Hook implementations (29 scripts)
├── agents/                         ← 28 task-based agents
├── commands/                       ← 60 slash commands
├── skills/                         ← ECC skills (merged with BMad skills at runtime)
│   ├── tdd-workflow/
│   ├── verification-loop/
│   ├── strategic-compact/
│   ├── continuous-learning-v2/
│   ├── eval-harness/
│   ├── coding-standards/
│   ├── frontend-patterns/
│   ├── backend-patterns/
│   ├── e2e-testing/
│   ├── bmad-*/                     ← BMad skills appear here too (merged at runtime)
│   └── ...
└── ecc/
    └── install-state.json          ← Tracks installed modules for updates

<project>/                          ← BMad (project-level)
├── CLAUDE.md                       ← Project rules (architecture, DDD, testing strategy)
├── .claude/
│   └── skills/                     ← 45 BMad skills (project-scoped)
│       ├── bmad-dev-story/
│       ├── bmad-sprint-planning/
│       ├── bmad-create-architecture/
│       └── ...
└── _bmad-output/
    └── planning-artifacts/         ← PRD, Architecture, UX, Epics
```

### Namespace Separation

- **Rules:** ECC rules live at `~/.claude/rules/`. Project-specific rules belong in `CLAUDE.md` or `.claude/rules/` (project-level). Claude Code loads both — project rules take precedence.
- **Skills:** BMad skills install to `<project>/.claude/skills/bmad-*/`. ECC skills install to `~/.claude/skills/`. Both show up in the skills list. No name collisions (BMad prefixes with `bmad-`).
- **Hooks:** ECC hooks live at `~/.claude/hooks/hooks.json`. BMad doesn't use hooks. No conflict.
- **Commands:** ECC commands at `~/.claude/commands/`. BMad doesn't install commands. No conflict.

---

## Setup (Reproducible)

### Prerequisites

- Claude Code CLI installed
- BMad Method already installed in the project (skills in `.claude/skills/bmad-*/`)
- Node.js 18+
- Git

### Step 1: Clone ECC

```bash
cd ~
git clone https://github.com/affaan-m/everything-claude-code.git
cd everything-claude-code
npm install
```

### Step 2: Selective Install — Core + TypeScript

```bash
# From the ECC repo directory:
node scripts/install-apply.js --profile core --with lang:typescript
```

This installs 7 modules to `~/.claude/`:

| Module | What It Installs |
|--------|-----------------|
| `rules-core` | Common + all language rules to `~/.claude/rules/` |
| `agents-core` | 28 agents to `~/.claude/agents/` |
| `commands-core` | 60 commands to `~/.claude/commands/` |
| `hooks-runtime` | hooks.json + 29 hook scripts |
| `platform-configs` | Plugin manifest, package manager detection |
| `framework-language` | TypeScript, React, backend, frontend skills |
| `workflow-quality` | TDD, verification, eval, compaction, continuous learning skills |

**Dry-run first** (recommended):

```bash
node scripts/install-apply.js --profile core --with lang:typescript --dry-run
```

### Step 3: Verify Installation

```bash
# Check rules
ls ~/.claude/rules/common/ ~/.claude/rules/typescript/

# Check hooks
cat ~/.claude/hooks/hooks.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
for k, v in d.get('hooks', {}).items():
    print(f'{k}: {len(v)} hooks')
"

# Check agents and commands
ls ~/.claude/agents/ | wc -l    # expect 28
ls ~/.claude/commands/ | wc -l  # expect 60

# Check hook scripts
ls ~/.claude/scripts/hooks/ | wc -l  # expect 29
```

### Step 4: Run AgentShield Security Scan

```bash
npx ecc-agentshield scan --path <project-dir> --verbose
```

This scans your CLAUDE.md and project config for security issues (prompt injection risks, overly permissive tool authorizations, secrets exposure). Expect Grade A on a clean BMad project.

### Step 5: Slim Down CLAUDE.md (Optional but Recommended)

With ECC providing general coding/testing/security rules globally, your project's `CLAUDE.md` can focus on what's unique to the project:

- Project overview and stack
- Architecture (Clean Architecture layers, bounded contexts, import rules)
- Domain-Driven Design specifics (aggregate roots, branded types, ports)
- Testing strategy specific to the project (Vitest workspaces, mocking strategy)
- CI gates and thresholds

Remove or compress sections that duplicate ECC's rules:
- General TypeScript best practices → covered by `~/.claude/rules/typescript/`
- General coding style → covered by `~/.claude/rules/common/coding-style.md`
- General testing philosophy → covered by `~/.claude/rules/common/testing.md`
- General security rules → covered by `~/.claude/rules/common/security.md`
- General git workflow → covered by `~/.claude/rules/common/git-workflow.md`

On the TalkTerm project, this reduced CLAUDE.md from 22.2KB / 547 lines to 11.7KB / 256 lines.

---

## What You Get

### ECC Hooks (28 hooks, 7 lifecycle events)

| Event | Count | Key Hooks |
|-------|-------|-----------|
| `PreToolUse` | 11 | `--no-verify` blocker, config protection, strategic compaction suggestions, MCP health check |
| `PostToolUse` | 8 | PR logger, quality gate, auto-format, TypeScript check, console.log warning |
| `PreCompact` | 1 | Save state before context compaction |
| `SessionStart` | 1 | Load previous context, detect package manager |
| `Stop` | 5 | Session persistence, pattern extraction, cost tracking, console.log audit |
| `PostToolUseFailure` | 1 | MCP server health tracking and reconnect |
| `SessionEnd` | 1 | Lifecycle marker and cleanup |

### Hook Runtime Controls

```bash
# Set strictness level (default: standard)
export ECC_HOOK_PROFILE=standard    # minimal | standard | strict

# Disable specific hooks by ID
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"
```

### Key Slash Commands (from ECC)

| Command | Purpose |
|---------|---------|
| `/save-session` | Save current session state for later resumption |
| `/resume-session` | Load saved session state and continue |
| `/tdd` | Enforce TDD workflow (write tests first) |
| `/code-review` | Multi-layer code review |
| `/verify` | Run verification loop |
| `/plan` | Create implementation plan |
| `/e2e` | Generate and run Playwright E2E tests |
| `/build-fix` | Fix build errors incrementally |
| `/eval` | Run evaluation harness |
| `/context-budget` | Analyze context window usage |

### Key Slash Commands (from BMad)

| Command | Purpose |
|---------|---------|
| `/bmad-dev-story` | Implement a story from spec file |
| `/bmad-sprint-planning` | Generate sprint plan from epics |
| `/bmad-sprint-status` | Check sprint progress |
| `/bmad-code-review` | Adversarial code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) |
| `/bmad-create-story` | Create next story with full context |
| `/bmad-correct-course` | Manage sprint changes |

---

## Updating ECC

```bash
cd ~/everything-claude-code
git pull
npm install
node scripts/install-apply.js --profile core --with lang:typescript
```

The install-state at `~/.claude/ecc/install-state.json` tracks what's installed for incremental updates.

---

## Troubleshooting

### BMad and ECC skills both show in skills list

This is expected. They coexist. BMad skills are prefixed with `bmad-`. ECC skills use descriptive names (`tdd-workflow`, `verification-loop`, etc.). No collisions.

### Hooks not firing

1. Check `~/.claude/hooks/hooks.json` exists
2. Check `~/.claude/plugin.json` exists (needed for `${CLAUDE_PLUGIN_ROOT}` resolution)
3. Verify scripts exist: `ls ~/.claude/scripts/hooks/run-with-flags.js`
4. Check hook profile: `echo $ECC_HOOK_PROFILE` (default: `standard`)

### Rules from ECC conflict with CLAUDE.md

Project-level rules in CLAUDE.md take precedence over user-level rules in `~/.claude/rules/`. If ECC's general TypeScript rules say one thing and your CLAUDE.md says another, CLAUDE.md wins.

### Too many hooks slowing things down

Use environment variables to disable specific hooks:

```bash
export ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:format,stop:desktop-notify"
```

Or switch to minimal profile:

```bash
export ECC_HOOK_PROFILE=minimal
```

---

## Version Info

This guide was written against:

- **ECC:** v1.9.0-113-g678fb6f (git HEAD as of 2026-03-26)
- **BMad Method:** installed via `npx bmad-method` (45 skills)
- **Claude Code:** v2.1.81+
- **Install profile:** `core` + `lang:typescript`
- **Install target:** `claude` (user home at `~/.claude/`)
- **AgentShield scan result:** Grade A (100/100)
