# Story 5.3: Implement Confirm Plan Pattern for Destructive Actions

Status: ready-for-dev

## Story
As a TalkTerm user, I want to review and approve actions that modify files or call external services, so that I maintain control over destructive operations performed by the agent.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - Destructive action detection
  Given the SDK issues a tool call
  When the action involves file create/modify/delete, external API calls, or irreversible operations
  Then the confirmation flow is triggered instead of immediate execution

Scenario: AC2 - Confirmation UI presentation
  Given a destructive action is detected
  Then the avatar verbally describes the proposed action
  And the left panel shows three action cards:
    - Approve (Primary style)
    - Modify (Ghost + border style)
    - Cancel (Ghost muted style)

Scenario: AC3 - Approve path
  Given the confirmation cards are displayed
  When the user selects "Approve"
  Then the action is forwarded to the SDK permission callback
  And the action executes normally

Scenario: AC4 - Modify path
  Given the confirmation cards are displayed
  When the user selects "Modify"
  Then the user can edit the proposed plan
  And the modified plan is re-presented for confirmation

Scenario: AC5 - Cancel path
  Given the confirmation cards are displayed
  When the user selects "Cancel"
  Then the action is not executed
  And the avatar offers alternative approaches
```

## Tasks / Subtasks

1. **Write tests for destructive action classifier** — identify file mutations, external API calls, irreversible operations (AC: 1)
2. **Implement action classifier** in main process — categorize tool calls as safe vs. destructive (AC: 1)
3. **Write tests for confirm-plan UI flow** — all three paths: approve, modify, cancel (AC: 2, 3, 4, 5)
4. **Implement `ConfirmPlan` component** — avatar description + three action cards in left panel (AC: 2, 3, 4, 5)
5. **Write tests for SDK permission callback integration** — approve forwards to callback, cancel rejects (AC: 3)
6. **Wire IPC: `agent:confirm` channel** — SDK tool-call triggers main classification, IPC to renderer for user choice, response back to SDK callback (AC: 3)

## Dev Notes

- Destructive actions: file create/modify/delete, external API calls, irreversible operations
- SDK permission control: use `allowedTools` for safe tools, `permission` callback for destructive ones
- IPC flow: SDK tool-call in main process -> main classifies action -> IPC `agent:confirm` to renderer -> renderer shows ActionCards -> user selects -> IPC response back -> SDK permission callback resolves
- Modify flow: user edits plan text in a text area -> re-submit for confirmation -> loop until approved or cancelled
- The action classifier lives in the main process (no SDK types leak to renderer)
- Card styles: Approve = Primary filled, Modify = Ghost with border, Cancel = Ghost muted

### Project Structure Notes
- `src/main/agent/action-classifier.ts` — destructive action classification logic
- `src/main/agent/action-classifier.test.ts` — co-located tests
- `src/renderer/components/overlay/ConfirmPlan.tsx` — confirmation UI component
- `src/renderer/components/overlay/ConfirmPlan.test.tsx` — co-located tests

### References
- PRD: FR20 (Destructive action confirmation), FR21 (Plan modification)
- Architecture: SDK permission callback pattern in agent backend
