# Story 6.1: Implement Multi-Step Workflow Execution

Status: ready-for-dev

## Story
As a TalkTerm user, I want to run complete multi-step workflows like BMAD brainstorming, so that I can accomplish complex tasks through guided conversational interaction.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Multi-step workflow execution
  Given the user describes their intent
  When the agent processes the request
  Then it executes a multi-step workflow including questions, guidance, and structured steps

Scenario: AC2 - Visual feedback during agent work
  Given the agent is executing a workflow
  Then the avatar shows the "thinking" state
  And the StatusIndicator displays contextual text (e.g., "Analyzing your ideas...")
  And the UI is never blank or frozen during processing

Scenario: AC3 - BMAD brainstorming workflow
  Given the user initiates a BMAD brainstorming session
  Then the agent executes: technique selection -> conversation -> idea generation -> organization -> output document
```

## Tasks / Subtasks

1. **Write tests for workflow orchestration** in agent backend — multi-step message flow, step transitions (AC: 1)
2. **Implement workflow execution flow** in `claude-sdk-backend.ts` — handle multi-step SDK interactions (AC: 1)
3. **Write tests for visual feedback** during agent work — avatar thinking state, StatusIndicator text updates (AC: 2)
4. **Wire avatar thinking state + StatusIndicator** — any tool-call message triggers thinking animation and contextual status text (AC: 2)
5. **Write integration test for BMAD brainstorming** end-to-end flow (AC: 3)

## Dev Notes

- "Multi-step workflow" = agent with BMAD skills/system prompt executing a sequence of steps; the SDK handles actual workflow logic
- Our responsibility is to present the workflow correctly: route messages, show visual feedback, display results
- Visual feedback: any tool-call message triggers avatar thinking state + StatusIndicator with contextual text like "Analyzing your ideas...", "Generating concepts...", etc.
- Continuous progress animation during long-running steps (NFR1c) — never let the UI appear frozen
- The agent backend maps SDK message types to domain events; renderer subscribes to those events

### Project Structure Notes
- `src/main/agent/claude-sdk-backend.ts` — workflow execution wiring
- `src/main/agent/claude-sdk-backend.test.ts` — co-located tests
- Renderer state management wires avatar state + StatusIndicator updates

### References
- PRD: FR12 (Multi-step workflows), FR17 (Visual feedback), NFR1c (Progress animation)
- Architecture: Agent backend pattern, SDK message mapping
