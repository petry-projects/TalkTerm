/**
 * Content-type detection and markdown parsing utilities for the conversation display layer.
 */

export type ContentType = 'document' | 'comparison-table' | 'plan' | 'clustered-cards' | 'text';

/** Minimum character length to qualify as a document. */
const DOCUMENT_THRESHOLD = 600;

/** Detect whether a block of text qualifies as long-form document content. */
export function isDocumentContent(text: string): boolean {
  return text.length >= DOCUMENT_THRESHOLD;
}

/**
 * Heuristic content-type detection for agent output.
 * Returns the most likely rendering mode for the given markdown text.
 */
export function detectContentType(text: string): ContentType {
  // Check for markdown table patterns (pipe-delimited rows)
  const tableLineCount = (text.match(/^\|.+\|$/gm) ?? []).length;
  if (tableLineCount >= 3) {
    return 'comparison-table';
  }

  // Check for plan-like content (numbered steps with headings or checkboxes)
  const planIndicators = (text.match(/^(\d+[.)]\s|[-*]\s\[[ x]\])/gm) ?? []).length;
  if (planIndicators >= 3) {
    return 'plan';
  }

  // Check for clustered/categorized content (multiple bold headers with list items)
  const boldHeaders = (text.match(/^\*\*.+\*\*/gm) ?? []).length;
  const listItems = (text.match(/^\s*[-*]\s+/gm) ?? []).length;
  if (boldHeaders >= 2 && listItems >= 4) {
    return 'clustered-cards';
  }

  // Long content → document
  if (isDocumentContent(text)) {
    return 'document';
  }

  return 'text';
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

/** Parse a markdown table into structured header + row data. */
export function parseMarkdownTable(text: string): TableData {
  const lines = text.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const parseCells = (line: string): string[] =>
    line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '' && !/^-+$/.test(c));

  const headers = parseCells(lines[0] ?? '');
  // Skip the separator line (index 1)
  const rows = lines.slice(2).map(parseCells);
  return { headers, rows };
}

export interface PlanStep {
  title: string;
  description: string;
  done: boolean;
}

/** Parse plan/checklist content into structured steps. */
export function parsePlanContent(text: string): PlanStep[] {
  const steps: PlanStep[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const match = /^\s*(?:\d+[.)]\s+|[-*]\s+)(?:\[([x ])\]\s+)?(.+)$/i.exec(line);
    if (match !== null) {
      const done = match[1]?.toLowerCase() === 'x';
      const content = match[2] ?? '';
      const dashIdx = content.indexOf('—');
      const title = dashIdx !== -1 ? content.slice(0, dashIdx).trim() : content.trim();
      const description = dashIdx !== -1 ? content.slice(dashIdx + 1).trim() : '';
      steps.push({ title, description, done });
    }
  }
  return steps;
}

export interface ClusteredGroup {
  heading: string;
  items: string[];
}

/** Parse bold-header + list-item clusters into structured groups. */
export function parseClusteredContent(text: string): ClusteredGroup[] {
  const groups: ClusteredGroup[] = [];
  let current: ClusteredGroup | null = null;
  const lines = text.split('\n');

  for (const line of lines) {
    const headerMatch = /^\*\*(.+?)\*\*/.exec(line.trim());
    if (headerMatch !== null && !line.trim().startsWith('-')) {
      if (current !== null) {
        groups.push(current);
      }
      current = { heading: headerMatch[1] ?? '', items: [] };
      continue;
    }
    const itemMatch = /^\s*[-*]\s+(.+)$/.exec(line);
    if (itemMatch !== null && current !== null) {
      current.items.push(itemMatch[1] ?? '');
    }
  }
  if (current !== null) {
    groups.push(current);
  }
  return groups;
}
