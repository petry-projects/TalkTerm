---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-multi-agent-review-enhancement']
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-03-20.md']
validationReport: '_bmad-output/planning-artifacts/prd-validation-report.md'
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
revisionHistory:
  - date: '2026-03-20'
    revision: 'v1.1 — Multi-agent review enhancement: fixed 15/20-min contradiction, added FR16 (file upload), FR36 (user identity), FR37 (barge-in), FR38 (network recovery); hardened 10 FR measurability specs; hardened 8 NFR measurement specs; decomposed latency NFR; added conversation privacy NFR16; removed implementation leakage (FR11, NFR13, NFR14); fixed store compliance gate; annotated Journey 2 Phase 2 references; added API key model; quantified business success metrics'
---

# Product Requirements Document - TalkTerm

**Author:** Root
**Date:** 2026-03-20

## Executive Summary

TalkTerm is a mobile-first AI agent interface that makes the full power of CLI-based agentic workflows — tool execution, API calls, MCP integration, and system control — accessible to non-technical users through voice-enabled animated avatars. While tools like Claude Code and GitHub Copilot have proven that natural-language-driven agents can perform complex tasks autonomously, these tools remain locked behind terminal interfaces that exclude product managers, designers, analysts, and other knowledge workers. TalkTerm replaces the terminal with a personal, conversational companion that users select, speak to, and delegate work to — with zero learning curve.

The agent backend is commodity infrastructure. The relationship layer is the product. ChatGPT and Claude.ai can converse but cannot execute — they lack permissions to run tools, call APIs, use MCP, or control the user's system. CLI agents can execute but exclude anyone uncomfortable with a terminal. TalkTerm is the first product that combines real agent capability with an embodied, personal interface. Users pick an avatar, start talking, and get work done.

The interaction model follows game-dialog UX — the avatar speaks context, graphical overlays present actionable options, and the user never sees a command, a log, or raw output. Each agent type has a distinct avatar persona with its own look, voice, and personality, enabling natural context switching across different tasks. The underlying agents' thinking is hidden; only final results and clear decision points surface to the user. All agent actions are logged with full traceability — providing an audit trail of what was done, when, and why, giving users and teams confidence and accountability without exposing operational complexity in the UI.

## Success Criteria

### User Success

- A non-technical user completes a full agent workflow and produces a real output artifact (e.g., a brainstorming document, a PRD, a research report) without technical assistance
- Users interact with specialized agent avatars conversationally and receive structured, actionable outputs — not chat transcripts
- Non-technical coworkers can use TalkTerm independently without requiring guidance from technical team members
- First completed workflow achieved within 25 minutes of starting an agent interaction

### Business Success

- Daily usage by technical users as a replacement for some terminal-based agent interactions (target: ≥1 TalkTerm session/day for power users within 30 days of first use)
- Independent adoption by non-technical coworkers — measured by ability to complete workflows without help (target: ≥3 non-technical users completing workflows independently within 60 days of launch)
- Community adoption measured by: number of agent runs performed and total time spent in agent conversations (target: ≥100 agent runs in first month post-launch)
- BMAD community serves as initial distribution channel and feedback loop; secondary channel via direct outreach to non-technical coworkers of BMAD users

### Technical Success

- Avatar acknowledges user input within 1 second of speech completion (conversational responsiveness)
- First spoken response segment begins within 3 seconds for standard conversational turns (via streaming TTS)
- Voice input accurately captured and transcribed with intent intact for natural speech patterns
- Avatar renders smoothly on supported mobile devices without causing thermal throttling or >20% battery drain per hour
- Full traceability logging of all agent actions with audit trail accessible in-session
- AI agent backend abstraction layer isolates UI from backend implementation — backend is swappable without UI changes

### Measurable Outcomes

| Metric | MVP Target |
|---|---|
| Time to first completed workflow | ≤ 25 minutes from first agent interaction |
| Non-technical user independence | Complete workflow without technical help |
| Daily active usage (power users) | ≥1 TalkTerm session/day within 30 days of first use |
| Agent runs in first month | ≥100 total runs post-launch |
| Total conversation time | Tracked as primary engagement metric |
| Input acknowledgement latency | ≤1 second from speech completion |
| First response segment latency | ≤3 seconds for conversational turns |

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

**Opening Scene:** Marcus downloads TalkTerm to try running a BMAD architecture session on his phone while waiting for a build. He picks the available avatar — a technical-focused persona.

**Rising Action:** Marcus says "I need to evaluate three approaches for our auth migration." The avatar presents a structured comparison framework via overlay cards. Marcus speaks his constraints — "We need OAuth2, can't break existing sessions, and have a two-week window." The avatar synthesizes options and presents trade-offs visually.

**Climax:** The avatar presents a decision matrix as a graphical overlay — three approaches scored across six criteria. Marcus taps each to drill into details. He picks an approach and the avatar generates an architecture decision record. Marcus realizes this was faster and clearer than the same workflow in his terminal.

**Resolution:** Marcus shares the architecture doc (via device file system) with Sarah (the PM) and his team. He starts using TalkTerm for structured agent workflows where the output needs to be shared, while keeping his terminal for code-focused tasks.

*Scope notes: Named specialist avatars (e.g., Winston the Architect) are Phase 2 — this journey illustrates the architecture workflow interaction model, achievable with a single avatar in MVP. Output sharing/export is Phase 2; manual file access is available in MVP.*

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

## Competitive Landscape & Validation

### Market Context

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

- Cross-platform single codebase — specific framework deferred to architecture phase
- Must support path to desktop without full rewrite
- Mobile-first design — all UX optimized for phone screen constraints
- Internet connectivity required — no offline mode
- Required device permissions: microphone (voice input), file system read/write (document I/O), network access (agent backend), push notifications (Phase 2 — task completion alerts)
- Minimum supported OS: iOS 16+ / Android 12+ (or equivalent — to be confirmed in architecture phase)

### Push Notification Strategy

- Notify when long-running agent tasks complete
- Prompt to continue unfinished workflows (e.g., "Mary is waiting — you left your brainstorming session mid-way")
- Notification tone/style should match the active avatar's personality

### Store Compliance Considerations

- **Risk:** AI agent performing system-level actions may trigger App Store / Play Store review scrutiny under guideline 1.2 (User-Generated Content) and 5.1.1 (Data Collection)
- **Risk:** AI-generated content policies may apply to avatar interactions and agent outputs
- **Mitigation:** Strong user-facing warnings and disclosures about AI-generated content and agent actions
- **Mitigation:** Clear permission prompts before any system-level operations
- **Gate (not deferred):** App Store and Play Store AI policy compliance review must be completed before UX design begins — store rejection risk is existential to the mobile-first strategy and cannot be discovered at submission time

### Implementation Considerations

- Avatar rendering must be performant on mid-range mobile devices (3-year-old flagship equivalent or newer) — no high-end GPU dependency
- Voice pipeline must handle background noise typical of mobile usage (commute, office, coffee shop)
- Latency strategy: acknowledgement (≤1s) via immediate avatar animation state change; first response (≤3s) via streaming TTS, with avatar speaking before full response is generated. Long-running agent steps show progress animation with no response-time SLA; the user is never shown a blank or frozen state.
- Overlay UI must work within mobile screen constraints — no desktop-sized panels
- Session state must persist to durable storage before any app suspension (backgrounding or OS termination) — backgrounding is not termination; iOS/Android may kill processes without warning
- Speech-to-text and TTS services must be configurable via abstraction layer — swappable without app-level code changes (architecture constraint; not an NFR)

## Product Scope & Phased Development

### MVP Strategy

**Approach:** Experience MVP — prove that the avatar + voice + overlay interaction model delivers real value to non-technical users completing agent workflows. The BMAD brainstorming workflow serves as both the initial use case and the product showcase — a non-technical user's first session IS the proof of concept.

**Resource Requirements:** Single developer. Scope must remain achievable by one person.

**API Key Model (MVP):** Users provide their own AI agent backend API key (BYOK — Bring Your Own Key). Key is stored per NFR6. This avoids per-session API cost burden on the developer and defers monetization to post-validation. Hosted subscription model (developer absorbs API costs) is a Phase 2 decision once usage patterns are understood.

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

- **Multi-backend:** Additional AI agent backends (Copilot, Gemini) and multi-agent handoff within workflows
- **Avatar aliveness:** Daily cosmetic variation (wardrobe, accessories, expressions) and user-customizable avatar creation
- **Community:** Marketplace for agent personas and workflows
- **Enterprise:** Team dashboards, shared configs, advanced audit reporting

### Risk Mitigation

**Technical Risks:**
- *Response latency has multiple pipeline sources.* **Mitigation:** See Implementation Considerations latency strategy (acknowledgement/first-response split with streaming TTS). Downscale avatar to 2D if rendering budget requires it.
- *Single developer bottleneck.* **Mitigation:** Framework choice (deferred to architecture phase) must prioritize developer velocity and existing ecosystem. Avoid custom solutions where off-the-shelf exists.

**Market Risks:**
- *Non-technical users may not seek out an "agent" tool.* **Mitigation:** Position as "personal AI assistant" not "agent interface." BMAD community provides warm initial audience.
- *App store compliance uncertainty.* **Mitigation:** Strong AI content warnings. Legal review before submission.

**Resource Risks:**
- *Solo developer scope creep.* **Mitigation:** MVP is ruthlessly scoped — one avatar, one backend, one workflow, one platform. Everything else is Phase 2+. No exceptions.

## Functional Requirements

### Avatar & Persona

- FR1: User can select an avatar persona from an available roster
- FR2: Avatar renders as an animated 2D character on screen with smooth motion (no static images)
- FR3: Avatar displays distinct animation states for each conversational mode: listening, thinking, and speaking
- FR4: Avatar speaks responses aloud using synthesized voice output
- FR5: Each avatar persona has a unique character name, visual design, and assigned voice — no two personas share the same combination of these attributes

### Voice Interaction

- FR6: User can speak to the avatar using device microphone
- FR7: System begins transcribing user speech within 500ms of silence detection; transcription completes within 1 second for utterances under 15 seconds
- FR8: User can input text as a full-featured alternative to voice — all workflow interactions available via text input
- FR9: System displays a distinct visual indicator (e.g., animated microphone icon) while actively capturing voice input

### Agent Workflow Execution

- FR10: User can initiate an agent workflow through natural language conversation
- FR11: System translates user intent into AI agent backend actions and executes them on the user's behalf
- FR12: System executes multi-step agent workflows (e.g., BMAD brainstorming, PRD creation)
- FR13: Agent can read, create, and modify files on behalf of the user
- FR14: Agent can invoke tools and integrations via MCP
- FR15: System maintains conversation context throughout a workflow session
- FR16: User can provide input documents (PDF, TXT, DOCX files) to the agent for use in workflow processing, via device file picker or share-sheet
- FR17: System provides visual feedback while the agent is working (avatar animation, progress indication)

### Decision Presentation & Confirmation

- FR18: System presents agent options and decisions as graphical overlay cards
- FR19: User can select options by tapping overlay cards or speaking a choice
- FR20: System presents a confirmation prompt before any agent action that creates, modifies, or deletes files, invokes external APIs, or performs any operation that is not reversible
- FR21: User can approve, modify, or reject a proposed agent plan; the modified plan is re-presented for confirmation before execution
- FR22: System hides agent intermediate thinking and only surfaces final results and decision points

### Output & Artifacts

- FR23: System generates structured output documents from completed workflows
- FR24: User can view completed output artifacts within the app
- FR25: User can access output files on the device file system
- FR26: Avatar verbally summarizes completed workflow output in 2–4 sentences before transitioning to the output display overlay

### Traceability & Logging

- FR27: System logs all agent actions with timestamp, action type, and outcome
- FR28: User can view a history of agent actions performed in a session
- FR29: System maintains an audit trail recording: timestamp, action type, outcome, and the user intent or workflow step that triggered each action

### Session Management

- FR30: User can start a new workflow session
- FR31: User can resume an incomplete workflow session based on an agent-provided list of resumable sessions
- FR32: Session state is persisted to durable local storage before any app suspension event (backgrounding, device sleep, or OS-initiated process termination)
- FR33: Avatar greets returning users by name (from local profile) and offers to continue the most recent incomplete session or start a new one
- FR36: System identifies and persists a user profile locally on-device (no account or login required for MVP); profile stores: user name, avatar preference, and session history references

### Error Handling

- FR34: System communicates errors through avatar conversation using non-technical language; error messages must not contain stack traces, error codes, agent internal logs, or raw API error text
- FR35: When an error occurs, system presents 2–3 concrete recovery options via overlay within the same conversational turn as the error message

### Voice Interaction — Additional Behaviors

- FR37: When the user speaks during avatar audio playback, system stops playback and captures the new user input (barge-in support)
- FR38: When network connectivity is lost mid-session, system pauses the active workflow, displays a connectivity error via text overlay, and resumes the session automatically when connectivity is restored without requiring the user to restart

## Non-Functional Requirements

### Performance

- NFR1a: Avatar input acknowledgement (animation state change to "listening") must occur within 1 second of speech completion for 95th percentile of interactions, as measured by in-app telemetry
- NFR1b: First spoken response segment must begin within 3 seconds of speech completion for standard conversational turns (non-tool-call responses), achieved via streaming TTS, for 95th percentile of interactions
- NFR1c: Long-running agent steps (multi-tool-call sequences) must show continuous progress animation with no response-time SLA — user is never shown a blank or frozen state
- NFR2: Avatar animation must render at minimum 30fps on devices equivalent to or newer than a 3-year-old flagship (e.g., iPhone 12 / Samsung Galaxy S21 class) as measured by frame timing during standard conversation
- NFR3: Speech-to-text transcription must begin processing within 500ms of user finishing speech, measured from silence detection
- NFR4: App launch to avatar-ready state (avatar visible and responsive) must complete within 3 seconds on 95th percentile of supported devices, measured from cold launch
- NFR5: Agent workflow progress feedback (avatar animation change or overlay indicator) must appear within 1 second of user input confirmation, measured from tap/voice confirmation event

### Security

- NFR6: Agent backend API keys must be stored in the device OS keychain (iOS Keychain / Android Keystore); must never be stored in plaintext, exposed in client-side code, or included in logs
- NFR7: Raw voice audio must not be stored beyond the active transcription session unless user explicitly opts in; this opt-in must be a separate, clearly labeled consent action
- NFR8: File system access must be scoped to user-approved directories only; agent may not access directories outside user-granted scope
- NFR9: All communication with agent backends and third-party services must use TLS 1.2 or higher
- NFR16: Conversation transcripts transmitted to the AI agent backend are not persisted by TalkTerm beyond the active session; the AI backend's data handling policy must be disclosed to the user before first use in a plain-language summary screen

### Accessibility

- NFR10: Text input must be a full-featured alternative to voice — no voice-only functionality
- NFR11: Overlay cards must meet minimum touch target sizes: 44×44pt on iOS (per Apple HIG) and 48×48dp on Android (per Material Design guidelines)
- NFR12: Avatar speech must be accompanied by on-screen text captions

### Integration

- NFR13: AI agent backend integration must retry failed requests up to 3 times with exponential backoff; must surface a user-facing error via FR34 after 10 seconds of unresponsiveness; rate limit responses must trigger a "service busy" avatar message with an estimated wait, not a silent failure
- NFR15: MCP tool integrations must follow the MCP protocol specification
