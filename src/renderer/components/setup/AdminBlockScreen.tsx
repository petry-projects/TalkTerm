import type { ReactElement } from 'react';

interface AdminBlockScreenProps {
  platform: string;
  instructions: string;
  onRetry: () => void;
  onQuit: () => void;
}

export function AdminBlockScreen({
  instructions,
  onRetry,
  onQuit,
}: AdminBlockScreenProps): ReactElement {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
      <div className="flex max-w-md flex-col items-center gap-6 px-8 text-center">
        <div data-testid="warning-icon" className="text-[48px] text-danger">
          ⚠
        </div>

        <h1 className="text-display text-text-on-dark">TalkTerm needs admin privileges</h1>

        <p className="text-body text-text-muted-on-dark">
          TalkTerm needs administrator access to run shell commands, access the file system, and use
          MCP tools through the Claude Agent SDK.
        </p>

        <div className="w-full rounded-lg bg-surface-muted p-4 text-left">
          <pre className="whitespace-pre-wrap font-mono text-small text-text-on-dark">
            {instructions}
          </pre>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-primary px-6 py-2 text-body font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onQuit}
            className="rounded-lg border border-text-muted-on-dark px-6 py-2 text-body text-text-muted-on-dark transition-colors hover:border-text-on-dark hover:text-text-on-dark"
          >
            Quit
          </button>
        </div>
      </div>
    </div>
  );
}
