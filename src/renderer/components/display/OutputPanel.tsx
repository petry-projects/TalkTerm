import type { ReactElement } from 'react';
import type { DisplayMode } from '../../hooks/useDisplayMode';
import { ActivityFeed, type FeedEntry } from './ActivityFeed';
import { ClusteredCards, type CardCluster } from './ClusteredCards';
import { ComparisonTable, type ComparisonRow } from './ComparisonTable';
import { DocumentView } from './DocumentView';
import { TaskProgress, type TaskStep } from './TaskProgress';

interface OutputPanelProps {
  mode: DisplayMode;
  data: unknown;
  onClose: () => void;
}

export function OutputPanel({ mode, data, onClose }: OutputPanelProps): ReactElement | null {
  if (mode === 'none') return null;

  return (
    <div className="flex h-full w-[380px] flex-col bg-surface-muted">
      <div className="flex items-center justify-between border-b border-stage-bg p-3">
        <h2 className="text-subtitle text-text-on-dark">
          {mode === 'task-progress'
            ? 'Progress'
            : mode === 'document'
              ? 'Document'
              : mode === 'comparison-table'
                ? 'Comparison'
                : mode === 'clustered-cards'
                  ? 'Ideas'
                  : mode === 'activity-feed'
                    ? 'Activity'
                    : 'Preview'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-md p-1 text-text-muted-on-dark hover:text-text-on-dark"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {mode === 'task-progress' && (
          <TaskProgress
            steps={(data as { steps: TaskStep[] }).steps}
            {...((data as { counters?: Record<string, number> }).counters !== undefined
              ? { counters: (data as { counters: Record<string, number> }).counters }
              : {})}
          />
        )}
        {mode === 'document' && (
          <DocumentView
            markdown={(data as { markdown: string }).markdown}
            {...((data as { filePath?: string }).filePath !== undefined
              ? { filePath: (data as { filePath: string }).filePath }
              : {})}
          />
        )}
        {mode === 'comparison-table' && (
          <ComparisonTable
            rows={(data as { rows: ComparisonRow[] }).rows}
            criteria={(data as { criteria: string[] }).criteria}
          />
        )}
        {mode === 'clustered-cards' && (
          <ClusteredCards clusters={(data as { clusters: CardCluster[] }).clusters} />
        )}
        {mode === 'activity-feed' && (
          <ActivityFeed entries={(data as { entries: FeedEntry[] }).entries} visible={true} />
        )}
      </div>
    </div>
  );
}
