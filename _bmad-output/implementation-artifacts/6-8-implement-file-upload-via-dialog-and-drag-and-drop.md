# Story 6.8: Implement File Upload via Dialog and Drag-and-Drop

Status: ready-for-dev

## Story
As a TalkTerm user, I want to provide documents by browsing or dragging files, so that I can give the agent reference materials for workflow processing.

## Acceptance Criteria (BDD)

```gherkin
Scenario: AC1 - File upload methods
  Given the user wants to provide a file
  Then they can use the system file dialog to browse and select files
  Or they can drag and drop files onto the center stage area
  And accepted file types include PDF, TXT, and DOCX

Scenario: AC2 - Files available to agent
  Given files are uploaded via dialog or drag-and-drop
  Then the file paths are made available to the agent for workflow processing
```

## Tasks / Subtasks

1. **Write tests for file upload handler** — system dialog trigger, drag-and-drop events, file type filtering (AC: 1)
2. **Implement file dialog** via Electron `dialog.showOpenDialog` with file type filters for PDF, TXT, DOCX (AC: 1)
3. **Implement drag-and-drop zone** in renderer — HTML5 drag events on center stage area (AC: 1)
4. **Write tests for file handoff to agent** — uploaded file paths passed to SDK session context (AC: 2)
5. **Wire uploaded file paths to SDK session context** — agent receives paths and uses built-in Read tool for file content (AC: 2)

## Dev Notes

- File dialog: Electron `dialog.showOpenDialog` with filters `[{ name: 'Documents', extensions: ['pdf', 'txt', 'docx'] }]`
- Drag-and-drop: HTML5 `dragenter`, `dragover`, `dragleave`, `drop` events on the center stage area
- Visual feedback during drag: highlight drop zone border (e.g., dashed `#EB8C00` border)
- IPC channels: `file:upload-dialog` (renderer requests dialog), `file:drop` (renderer sends dropped file paths)
- Pass file paths to SDK — the Claude Agent SDK has a built-in Read tool that can access local file content
- Validate file existence and type in the main process before passing to agent

### Project Structure Notes
- `src/main/ipc/file-upload-handler.ts` — IPC handler for file dialog and path validation
- `src/main/ipc/file-upload-handler.test.ts` — co-located tests
- `src/renderer/components/avatar/FileDropZone.tsx` — drag-and-drop zone component
- `src/renderer/components/avatar/FileDropZone.test.tsx` — co-located tests

### References
- PRD: FR16 (File upload support for PDF, TXT, DOCX)
