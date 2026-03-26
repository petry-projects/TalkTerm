import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

interface WorkspaceSelectionProps {
  onSelectFolder: (path: string) => void;
  onSkip: () => void;
}

function extractFolderPath(files: FileList): string | null {
  const firstFile = files[0];
  if (firstFile === undefined) {
    return null;
  }
  const relativePath = firstFile.webkitRelativePath;
  const slashIndex = relativePath.indexOf('/');
  if (slashIndex === -1) {
    return relativePath;
  }
  return relativePath.slice(0, slashIndex);
}

export function WorkspaceSelection({
  onSelectFolder,
  onSkip,
}: WorkspaceSelectionProps): ReactElement {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Auto-focus primary button on mount so Enter works immediately
  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  // After showing selected folder briefly, advance
  useEffect(() => {
    if (selectedFolder === null) {
      return;
    }
    const timer = setTimeout(() => {
      onSelectFolder(selectedFolder);
    }, 1200);
    return (): void => {
      clearTimeout(timer);
    };
  }, [selectedFolder, onSelectFolder]);

  const handleBrowseClick = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;
    if (files === null || files.length === 0) {
      return;
    }
    const folderPath = extractFolderPath(files);
    if (folderPath !== null) {
      setSelectedFolder(folderPath);
    }
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-surface-muted/80 p-10">
        <h1 className="text-center text-display text-text-on-dark">Connect a project</h1>
        <p className="text-center text-body text-text-muted-on-dark">
          Choose a local project folder so TalkTerm can work within your codebase. Or skip to get
          started with BMAD defaults.
        </p>
        {selectedFolder !== null ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-body font-semibold text-text-on-dark">Selected folder:</p>
            <p className="text-body text-primary" data-testid="selected-folder">
              {selectedFolder}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              data-testid="folder-input"
              {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            />
            <button
              ref={primaryRef}
              type="button"
              onClick={handleBrowseClick}
              className="w-full rounded-lg bg-primary py-3 text-body font-semibold text-white transition-colors hover:bg-primary-dark focus:ring-2 focus:ring-primary/50 focus:outline-none"
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
        )}
      </div>
    </div>
  );
}
