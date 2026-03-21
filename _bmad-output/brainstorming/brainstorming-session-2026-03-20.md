---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'TalkTerm full concept review and revision'
session_goals: 'Review, stress-test, and refine the product vision'
selected_approach: 'progressive-flow'
techniques_used: ['assumption-reversal', 'six-thinking-hats', 'first-principles', 'decision-tree-mapping']
ideas_generated: 18
technique_execution_complete: true
facilitation_notes: 'User brought strong product instincts — consistently pushed toward simplicity, personality, and accessibility. Key pivot from terminal-centric to avatar-centric product identity.'
---

# TalkTerm Brainstorming Session

**Date:** 2026-03-20
**Facilitator:** BMAD Brainstorming Agent
**Participant:** Root
**Topic:** Full product concept review and revision
**Goals:** Surface blind spots, challenge assumptions, strengthen or revise core features and positioning

---

## Session Overview

### Context
TalkTerm began as a "human-centric terminal" (originally called VoxCLI) aimed at making the CLI accessible to non-technical users. This session reviewed and fundamentally revised the product concept through progressive brainstorming techniques.

---

## Phase 1: Assumption Reversal

### Assumptions Challenged

| Original Assumption | Revised Understanding |
|---|---|
| Target: non-technical CLI users | Target: non-technical users who want agent access but are locked out by CLI |
| Product: friendly terminal | Product: conversational agent workspace, CLI is invisible plumbing |
| Differentiator: voice-first input | Differentiator: voice-enabled animated avatar — the full personal experience |
| Avatar: nice UX layer | Avatar IS the product — the defensible value on top of commodity agents |
| Category: dev tool | Category: personal AI agent/companion |

### Key Insights

**[Insight #1]: The Real Problem — Agent Access Gap**
The fastest path to powerful agentic workflows is through CLI tools (Claude Code, Copilot CLI), but the CLI is a gatekeeper that locks out non-technical power users — PMs, designers, analysts — who would benefit enormously from agents.

**[Insight #2]: The CLI Already Abstracts — The Interface Is the Bottleneck**
Claude Code and Copilot already hide the tools — users don't write grep or git commands, they describe intent and the agent executes. The only thing still stuck in 1970 is the interface they're wrapped in.

**[Insight #3]: Personality as Interface — Avatar-Driven Agent Experience**
The differentiator isn't voice OR visuals — it's a unified personal experience. An animated avatar gives the agent a face, a presence. It transforms "chatting with a tool" into "working with a companion."

**[Insight #4]: The Copilot Has No Face**
Claude Code, Copilot CLI, ChatGPT — they're all text in a box. Powerful but impersonal. An animated avatar with voice creates the feeling of delegation — "I told my assistant to handle it" — not "I typed into a terminal."

**[Insight #5]: The Voice-Enabled Avatar IS the Product**
The agent backends are commodities. The avatar — personality, voice, visual presence, memory — is the moat. TalkTerm is a relationship layer on top of interchangeable agent infrastructure.

---

## Phase 2: Six Thinking Hats

| Hat | Key Finding |
|---|---|
| White (Facts) | Trust already validated by existing tools via confirm-plan pattern. 2-second latency budget. Both mobile and desktop platforms. |
| Red (Feelings) | Excitement: humanized experience, reduced friction, new users unlocked. Worry: output presentation from underlying copilot. |
| Black (Risks) | Output bottleneck solved by hide-thinking/show-decisions. Two-interface trap solved by overlay model. Backend fragmentation is real but manageable. |
| Yellow (Benefits) | Zero learning curve, emotional engagement, decision clarity, backend agnostic, market white space. |
| Green (Creativity) | Agent-specific avatars, virtual team model, avatar-as-onboarding, daily wardrobe changes. |

### Key Insights

**[Insight #6]: Trust Is Already Solved — Confirm Plan Pattern**
Users already trust agents to perform system tasks in Copilot/Claude Code. The "confirm plan" step is the established UX pattern.

**[Insight #7]: 2-Second Latency Budget**
The avatar response must feel conversational — 2 seconds max. This is a hard technical constraint that shapes architecture decisions.

**[Insight #8]: The Output Rendering Problem**
Agent backends produce rich, complex output. The core UX challenge: how does a voice-first personal agent present dense, structured output without becoming a slow narrator?

**[Insight #9]: Hide the Thinking, Show the Decision**
The avatar consumes the full agent output but only surfaces the final result + clear actionable options. No streaming thoughts, no intermediate steps, no logs.

**[Insight #10]: Overlay-Based Option Presentation**
When the agent produces options, they appear as a graphical overlay — cards, buttons, swipeable choices. Not inline text. Not a chat bubble with numbered lists.

**[Insight #11]: Video Game Dialog UX as Mental Model**
Games like Mass Effect, Firewatch, or Persona nail this pattern — a character speaks to you, options appear as visual choices, you pick, the story continues. Closer to game dialog than chat interface.

**[Insight #12]: Agent-Specific Avatars for Context Switching**
Each agent type gets its own distinct avatar/persona. When you switch tasks, the face changes. Like walking to a different colleague's desk.

**[Insight #13]: The Virtual Team Mental Model**
TalkTerm isn't one assistant — it's a team of specialists with faces. Maps directly to how BMAD already works (Mary the Analyst, Alex the Designer) — but now they have faces and voices.

**[Insight #14]: BMAD Agents Get Embodied**
BMAD already defines distinct agents with names, roles, and personalities. TalkTerm gives them bodies, faces, voices, wardrobes.

**[Insight #15]: Daily Wardrobe Changes Create Aliveness**
Small cosmetic variations make avatars feel alive. Signals the agent exists between sessions. Trivial to implement, massive emotional impact.

**[Insight #16]: BMAD as the Killer Demo**
The BMAD workflow is the perfect showcase. "Meet your team." Mary appears, introduces herself, walks you through brainstorming. User experiences the product vision in the first five minutes.

---

## Phase 3: First Principles

### Five Foundational Principles

1. **Agentic workflows are powerful but inaccessible.** The capability exists. The interface excludes most people.
2. **People work better with people than with tools.** Delegation to a persona is natural. Typing commands into a box is learned behavior.
3. **The output matters more than the process.** Users want results and decisions. They don't want to watch the machine think.
4. **Identity creates trust and retention.** A named, visible, voiced agent you recognize is one you come back to.
5. **The agent backend is commodity. The relationship layer is the product.**

### Built from Principles — Must-Haves

1. Avatar system — distinct visual personas per agent role
2. Voice I/O — bidirectional, conversational, 2-second budget
3. Decision overlay UI — graphical options, no raw output
4. Backend abstraction — plug in Claude, Copilot, Gemini, whatever
5. Agent personality framework — names, voices, visual variation, memory
6. Confirm plan pattern — user approves before execution

### Cut from Original Vision

| Original Feature | Verdict |
|---|---|
| "Safety First" Sandbox (Docker/WASM) | Cut — confirm plan pattern handles this |
| ELI5 Toggle | Cut — avatar naturally explains in plain language |
| Visual "Show Your Work" (thumbnails in chat) | Evolves into the overlay system |
| Haptic feedback | Nice-to-have, not core |
| "Explain each command" | Cut — user never sees commands |

### Emerged from Principles

- Agent roster / team concept
- Avatar customization & daily variation
- Persona-specific voice & visual identity
- Game-dialog interaction model
- BMAD as native showcase workflow

---

## Phase 4: Decision Tree

| Decision | Answer |
|---|---|
| MVP scope | Single avatar + Claude + voice + overlay UI |
| Platform first | Mobile |
| Agent backend | Claude |
| Mobile framework | Deferred to Winston (Architect) — must support path to desktop |
| Avatar technology | Deferred to Winston — start with simplest option |

### What's Decided (Product)

- One avatar, one voice, one backend, mobile
- Hide thinking, show decisions via graphical overlay
- Confirm plan pattern for trust
- Game-dialog interaction model

### What's Deferred (Technical)

- Framework and avatar tech to Winston in solution design
- Multi-avatar team is post-MVP
- Desktop is post-MVP
- Multi-backend is post-MVP

---

## Revised Product Statement

**TalkTerm** is a voice-enabled avatar agent that gives non-technical users personal, conversational access to powerful agentic workflows. It hides complexity, shows only decisions via graphical overlays, and builds a relationship through named personas with distinct looks, voices, and personalities. The agent backend is commodity infrastructure. The avatar relationship is the product.

---

## Creative Facilitation Narrative

This session began as a concept review but became a fundamental product pivot. Through assumption reversal, the product identity shifted from "friendly terminal" to "personal agent companion." The Six Thinking Hats revealed that the output rendering problem was the critical design challenge, which the user solved decisively with the hide-thinking/show-decisions model and graphical overlay pattern. First principles thinking stripped the concept to five foundational truths and cleanly separated must-haves from cut features. The decision tree locked in a tight MVP: single avatar, Claude backend, voice, overlay UI, mobile-first. Technical decisions around framework and avatar rendering were correctly deferred to the Architect (Winston) during solution design.

The user demonstrated strong product instincts throughout — consistently pulling toward simplicity, personality, and the emotional dimension of the experience. The breakthrough connection of BMAD's existing agent roster to embodied avatars created a concrete, buildable vision grounded in an existing framework.
