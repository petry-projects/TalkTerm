import type { ReactElement } from 'react';

interface WorkspaceSelectionProps {
  onSelectFolder: () => void;
  onSkip: () => void;
}

export function WorkspaceSelection({
  onSelectFolder,
  onSkip,
}: WorkspaceSelectionProps): ReactElement {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-surface-muted/80 p-10">
        <h1 className="text-center text-display text-text-on-dark">Connect a project</h1>
        <p className="text-center text-body text-text-muted-on-dark">
          Choose a local project folder so TalkTerm can work within your codebase. Or skip to get
          started with BMAD defaults.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onSelectFolder}
            className="w-full rounded-lg bg-primary py-3 text-body font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Browse Folder
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full rounded-lg border border-text-muted-on-dark py-3 text-body text-text-muted-on-dark transition-colors hover:border-text-on-dark hover:text-text-on-dark"
          >
            Skip — use BMAD defaults
          </button>
        </div>
      </div>
    </div>
  );
}
