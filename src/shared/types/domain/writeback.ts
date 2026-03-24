export type WritebackTarget =
  | { type: 'local-file'; filePath: string }
  | { type: 'pull-request'; repoPath: string; branchName: string; prTitle: string }
  | { type: 'ado-work-item'; workItemId: string; project: string }
  | { type: 'mcp-system'; systemName: string; targetPath: string };

export type SessionOrigin = 'ado-work-item' | 'git-repo' | 'local-files';

export function getDefaultWritebackType(origin: SessionOrigin): WritebackTarget['type'] {
  switch (origin) {
    case 'ado-work-item':
      return 'ado-work-item';
    case 'git-repo':
      return 'pull-request';
    case 'local-files':
      return 'local-file';
  }
}
