---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-03-20.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: mobile_app
  domain: general
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - TalkTerm

**Author:** Root
**Date:** 2026-03-20

## Executive Summary

TalkTerm is a mobile-first AI agent interface that makes the full power of CLI-based agentic workflows — tool execution, API calls, MCP integration, and system control — accessible to non-technical users through voice-enabled animated avatars. While tools like Claude Code and GitHub Copilot have proven that natural-language-driven agents can perform complex tasks autonomously, they remain locked behind terminal interfaces that exclude product managers, designers, analysts, and other knowledge workers. TalkTerm replaces the terminal with a personal, conversational companion that users select, speak to, and delegate work to — with zero learning curve.

### What Makes This Special

The agent backend is commodity infrastructure. The relationship layer is the product. ChatGPT and Claude.ai can converse but cannot execute — they lack permissions to run tools, call APIs, use MCP, or control the user's system. CLI agents can execute but exclude anyone uncomfortable with a terminal. TalkTerm is the first product that combines real agent capability with an embodied, personal interface. Users pick an avatar, start talking, and get work done.

The interaction model follows game-dialog UX — the avatar speaks context, graphical overlays present actionable options, and the user never sees a command, a log, or raw output. Each agent type has a distinct avatar persona with its own look, voice, and personality, enabling natural context switching across different tasks. The underlying agents' thinking is hidden; only final results and clear decision points surface to the user. All agent actions are logged with full traceability — providing an audit trail of what was done, when, and why, giving users and teams confidence and accountability without exposing operational complexity in the UI.

## Project Classification

- **Project Type:** Mobile application (cross-platform, mobile-first with path to desktop)
- **Domain:** General / AI agent interface
- **Complexity:** Medium — avatar rendering, voice pipeline, agent backend abstraction, and overlay UI introduce technical depth without regulatory burden
- **Project Context:** Greenfield

## Success Criteria

### User Success

- A non-technical user completes a full agent workflow and produces a real output artifact (e.g., a brainstorming document, a PRD, a research report) without technical assistance
- Users interact with specialized agent avatars conversationally and receive structured, actionable outputs — not chat transcripts
- Non-technical coworkers can use TalkTerm independently without requiring guidance from technical team members
- First completed workflow achieved within 15 minutes of starting an agent interaction

### Business Success

- Daily usage by technical users as a replacement for some terminal-based agent interactions
- Independent adoption by non-technical coworkers — measured by ability to complete workflows without help
- Community adoption measured by: number of agent runs performed and total time spent in agent conversations
- BMAD community serves as initial distribution channel and feedback loop

### Technical Success

- Agent response latency under 2 seconds for conversational feel
- Voice input accurately captured and translated to agent intent
- Avatar renders smoothly on mobile devices without battery drain or performance degradation
- Full traceability logging of all agent actions with audit trail
- Backend abstraction layer successfully translates between TalkTerm UI and Claude agent infrastructure

### Measurable Outcomes

| Metric | MVP Target |
|---|---|
| Time to first completed workflow | < 15 minutes from first agent interaction |
| Non-technical user independence | Complete workflow without technical help |
| Daily active usage (power users) | Daily replacement of some terminal interactions |
| Agent runs per user | Tracked as primary adoption metric |
| Total conversation time | Tracked as primary engagement metric |
| Response latency | < 2 seconds avatar response |

## User Journeys

### Journey 1: The Non-Technical PM — First Workflow

**Persona:** Sarah, Product Manager at a mid-size startup
**Situation:** Sarah manages a product roadmap but relies on her engineering lead to run any structured workflow — brainstorming, competitive analysis, sprint planning. She's heard about AI agents but every tool she's tried is either a chatbot that can't do anything or a terminal tool she can't use.

**Opening Scene:** Sarah downloads TalkTerm on her iPhone during her commute. The app opens to a simple screen: "Choose your assistant." She sees a friendly animated character — Mary, the Business Analyst — and taps her.

**Rising Action:** Mary greets her by voice: "Hi Sarah, I'm Mary. I specialize in research, brainstorming, and product analysis. What are you working on today?" Sarah says, "I need to brainstorm features for our new onboarding flow." Mary walks her through a structured brainstorming session — asking questions, presenting technique options as tappable overlay cards, building on Sarah's ideas. Sarah speaks naturally. Mary responds conversationally.

**Climax:** Twenty minutes in, Mary says: "We've generated 24 ideas across 4 categories. Here's the organized summary." A visual overlay shows clustered ideas with priority tags. Sarah taps to expand each cluster. She says "This is exactly what I needed" — she's produced a structured brainstorming artifact without writing a single command or asking engineering for help.

**Resolution:** Sarah shares the output document with her team. She opens TalkTerm the next morning and Mary greets her: "Morning, Sarah. Want to continue developing those onboarding ideas, or start something new?" Sarah is a daily user.

### Journey 2: The Technical User — Terminal Replacement

**Persona:** Marcus, Full-Stack Developer
**Situation:** Marcus uses Claude Code daily in his terminal. He's productive, but some tasks — brainstorming with his PM, reviewing architecture options, sprint planning — feel clunky in a text-only interface. He also can't easily share agent sessions with non-technical teammates.

**Opening Scene:** Marcus downloads TalkTerm to try running a BMAD architecture session on his phone while waiting for a build. He picks Winston, the Architect avatar.

**Rising Action:** Marcus says "I need to evaluate three approaches for our auth migration." Winston presents a structured comparison framework via overlay cards. Marcus speaks his constraints — "We need OAuth2, can't break existing sessions, and have a two-week window." Winston synthesizes options and presents trade-offs visually.

**Climax:** Winston presents a decision matrix as a graphical overlay — three approaches scored across six criteria. Marcus taps each to drill into details. He picks an approach and Winston generates an architecture decision record. Marcus realizes this was faster and clearer than the same workflow in his terminal.

**Resolution:** Marcus shares the architecture doc with Sarah (the PM) and his team. He starts using TalkTerm for collaborative agent workflows where the output needs to be shared, while keeping his terminal for code-focused tasks.

### Journey 3: The Non-Technical User — Error Recovery

**Persona:** Sarah, two weeks into using TalkTerm
**Situation:** Sarah is comfortable with TalkTerm. She asks Mary to generate a competitive analysis by pulling data from several documents she's uploaded.

**Opening Scene:** Sarah says "Analyze these three competitor PDFs and summarize their pricing models." Mary begins processing.

**Rising Action:** Mary encounters an issue — one PDF is image-based and can't be parsed. Instead of a stack trace or cryptic error, Mary says: "I was able to read two of the three documents, but 'Competitor_C_pricing.pdf' is a scanned image I can't read directly. Would you like me to proceed with the two I have, or can you provide a text version of the third?"

**Climax:** Sarah says "Go ahead with the two." Mary presents the analysis as an overlay — a comparison table with key findings. Sarah taps to expand each section.

**Resolution:** Sarah is never confused or scared. The error was handled conversationally. She trusts TalkTerm more because it explained what happened and gave her clear options instead of failing silently or dumping technical output.

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---|---|
| Sarah: First Workflow | Avatar selection, voice I/O, agent workflow execution, overlay-based options, structured output generation, onboarding-by-doing |
| Marcus: Terminal Replacement | Complex agent workflows, visual decision frameworks, output sharing, mobile agent access |
| Sarah: Error Recovery | Graceful error handling via avatar conversation, partial completion, clear user options, trust-building through transparency |

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Embodied agent interface** — First product to wrap real agentic CLI capability in an animated avatar with voice, creating a personal companion rather than a tool
- **Game-dialog interaction model** — Overlay-based decision presentation borrowed from video game dialog systems, applied to AI agent workflows
- **Relationship-layer competition** — Competing on persona, identity, and emotional engagement rather than agent reasoning capability
- **Agent democratization** — Purpose-built to extend CLI-grade agent power to non-technical users

### Market Context & Competitive Landscape

- CLI agents (Claude Code, Copilot CLI) own the technical user segment
- Chat UIs (ChatGPT, Claude.ai) own the casual conversation segment but lack execution capability
- Character.ai proved demand for AI personas but has no agent capability
- No product occupies the intersection: real agent power + embodied personal interface

### Validation Approach

- BMAD community as initial user base for non-technical workflow validation
- Measure: can a non-technical user complete a BMAD workflow independently via TalkTerm?
- Compare time-to-completion and user satisfaction vs terminal-based agent workflows

## Mobile App Specific Requirements

### Platform Requirements

- Cross-platform single codebase — specific framework deferred to Winston (Architect) during solution design
- Must support path to desktop without full rewrite
- Mobile-first design — all UX optimized for phone screen constraints
- Internet connectivity required — no offline mode
- Microphone permission required for voice input
- File system access for document output/export

### Push Notification Strategy

- Notify when long-running agent tasks complete
- Prompt to continue unfinished workflows (e.g., "Mary is waiting — you left your brainstorming session mid-way")
- Notification tone/style should match the active avatar's personality

### Store Compliance Considerations

- **Risk:** AI agent performing system-level actions may trigger App Store / Play Store review scrutiny
- **Risk:** AI-generated content policies may apply to avatar interactions and agent outputs
- **Mitigation:** Strong user-facing warnings and disclosures about AI-generated content and agent actions
- **Mitigation:** Clear permission prompts before any system-level operations
- **Action item:** Legal/compliance review of App Store and Play Store AI policies before submission — deferred to solution design phase

### Implementation Considerations

- Avatar rendering must be performant on mid-range mobile devices — no high-end GPU dependency
- Voice pipeline must handle background noise typical of mobile usage (commute, office, coffee shop)
- 2-second latency budget includes: voice capture → transcription → agent round-trip → avatar response → TTS playback
- Overlay UI must work within mobile screen constraints — no desktop-sized panels
- Session state must persist across app backgrounding and device sleep

## Product Scope & Phased Development

### MVP Strategy

**Approach:** Experience MVP — prove that the avatar + voice + overlay interaction model delivers real value to non-technical users completing agent workflows. The BMAD brainstorming workflow serves as both the initial use case and the product showcase — a non-technical user's first session IS the proof of concept.

**Resource Requirements:** Single developer. Scope must remain achievable by one person.

### MVP Feature Set (Phase 1)

**Core User Journey:** Sarah completes first BMAD brainstorming workflow → structured output artifact

**Must-Have Capabilities:**
- Single animated avatar with voice (2D if needed to meet latency budget)
- Voice input with speech-to-text
- Text-to-speech avatar responses
- Claude as agent backend
- Graphical overlay for options and decisions
- Confirm plan pattern before agent execution
- Structured output document generation
- Action traceability logging
- Mobile app (single platform OK for MVP — expand post-validation)
- BMAD workflow support (minimum: brainstorming agent)

**Explicitly NOT in MVP:**
- Multiple avatars
- Desktop support
- Multi-backend support
- Push notifications
- Avatar customization or wardrobe variation
- Offline capability
- Output sharing/export (manual file access OK)

### Phase 2: Growth

- Multiple avatar personas mapped to BMAD agent roster (Mary the Analyst, Alex the Designer, Winston the Architect)
- Push notifications for long-running tasks and session continuity
- Additional BMAD workflows (PRD creation, architecture, sprint planning)
- Desktop platform support
- Output sharing and export
- Avatar memory — learns user preferences, projects, vocabulary over time

### Phase 3: Expansion

- Additional agent backends (Copilot, Gemini)
- Daily cosmetic avatar variation (wardrobe, accessories, expressions) to create sense of aliveness
- Multi-agent handoff within workflows
- User-customizable avatar creation
- Community marketplace for agent personas and workflows
- Enterprise features (team dashboards, shared configs, audit reporting)

### Risk Mitigation

**Technical Risks:**
- *2-second latency budget is tight.* Voice → transcription → Claude → TTS → avatar chain has multiple latency sources. **Mitigation:** Downscale avatar to 2D if needed. Stream TTS so avatar begins speaking before full response. Use local/edge transcription.
- *Single developer bottleneck.* **Mitigation:** Framework choice (deferred to Winston) must prioritize developer velocity and existing ecosystem. Avoid custom solutions where off-the-shelf exists.

**Market Risks:**
- *Non-technical users may not seek out an "agent" tool.* **Mitigation:** Position as "personal AI assistant" not "agent interface." BMAD community provides warm initial audience.
- *App store compliance uncertainty.* **Mitigation:** Strong AI content warnings. Legal review before submission.

**Resource Risks:**
- *Solo developer scope creep.* **Mitigation:** MVP is ruthlessly scoped — one avatar, one backend, one workflow, one platform. Everything else is Phase 2+. No exceptions.

## Functional Requirements

### Avatar & Persona

- FR1: User can select an avatar persona from an available roster
- FR2: User can see the avatar rendered as an animated 2D character on screen
- FR3: Avatar displays contextual expressions and animations during conversation (listening, thinking, speaking)
- FR4: Avatar speaks responses aloud via text-to-speech
- FR5: Each avatar persona has a distinct visual identity and voice

### Voice Interaction

- FR6: User can speak to the avatar using device microphone
- FR7: System transcribes user speech to text in real time
- FR8: User can also input text as an alternative to voice
- FR9: System provides visual feedback when listening for voice input

### Agent Workflow Execution

- FR10: User can initiate an agent workflow through natural language conversation
- FR11: System translates user intent into agent backend actions via Claude API
- FR12: System executes multi-step agent workflows (e.g., BMAD brainstorming, PRD creation)
- FR13: Agent can read, create, and modify files on behalf of the user
- FR14: Agent can invoke tools and integrations via MCP
- FR15: System maintains conversation context throughout a workflow session
- FR16: Session state is managed by the agent workflow itself, not by the app infrastructure — the agent flow owns its own continuation state
- FR17: System provides visual feedback while the agent is working (avatar animation, progress indication)

### Decision Presentation & Confirmation

- FR18: System presents agent options and decisions as graphical overlay cards
- FR19: User can select options by tapping overlay cards or speaking a choice
- FR20: System presents a confirm plan step before executing any destructive or significant agent action
- FR21: User can approve, modify, or reject a proposed agent plan
- FR22: System hides agent intermediate thinking and only surfaces final results and decision points

### Output & Artifacts

- FR23: System generates structured output documents from completed workflows
- FR24: User can view completed output artifacts within the app
- FR25: User can access output files on the device file system
- FR26: Avatar summarizes completed work conversationally before presenting the output

### Traceability & Logging

- FR27: System logs all agent actions with timestamp, action type, and outcome
- FR28: User can view a history of agent actions performed in a session
- FR29: System maintains an audit trail of what was done, when, and why

### Session Management

- FR30: User can start a new workflow session
- FR31: User can resume an incomplete workflow session based on an agent-provided list of resumable sessions
- FR32: Session state persists across app backgrounding and device sleep
- FR33: Avatar greets returning users and offers to continue previous work or start new

### Error Handling

- FR34: System communicates errors to the user through avatar conversation in plain language
- FR35: System offers actionable recovery options when an error occurs

## Non-Functional Requirements

### Performance

- NFR1: End-to-end response latency (voice input → avatar spoken response) must be under 2 seconds
- NFR2: Avatar animation must render at minimum 30fps on mid-range mobile devices
- NFR3: Speech-to-text transcription must begin processing within 500ms of user finishing speech
- NFR4: App launch to avatar-ready state must complete within 3 seconds
- NFR5: Agent workflow progress feedback must appear within 1 second of action initiation

### Security

- NFR6: Agent backend API keys must be stored securely and never exposed to the client UI
- NFR7: Voice data must not be stored beyond the active transcription session unless user explicitly opts in
- NFR8: File system access must be scoped to user-approved directories only
- NFR9: All communication with agent backends must use encrypted transport (TLS)

### Accessibility

- NFR10: Text input must be a full-featured alternative to voice — no voice-only functionality
- NFR11: Overlay cards must meet minimum touch target sizes per platform guidelines
- NFR12: Avatar speech must be accompanied by on-screen text captions

### Integration

- NFR13: Claude API integration must handle rate limits, timeouts, and service interruptions gracefully
- NFR14: Speech-to-text and TTS services must be swappable without app-level changes
- NFR15: MCP tool integrations must follow the MCP protocol specification
