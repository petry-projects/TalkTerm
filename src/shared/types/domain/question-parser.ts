export interface Question {
  index: number;
  title: string;
  body: string;
  suggestions: string[];
}

export interface QuestionSet {
  preamble: string;
  questions: Question[];
}

/** Regex matching lines that start a numbered item: "1. " or "1) " */
const NUMBERED_LINE_RE = /^(\d+)[.)]\s/;

/**
 * Parse agent text into structured questions.
 * Supports two formats:
 *   1. Numbered items: "1. **Title** — question?"
 *   2. Dash-list items under bold headers: "**Section:** \n - question?"
 * Returns null if fewer than 2 questions are detected.
 */
export function parseQuestions(text: string): QuestionSet | null {
  // Try numbered format first, then dash-list format
  return parseNumberedQuestions(text) ?? parseDashListQuestions(text);
}

/** Strategy 1: Numbered items like "1. **Title** — question?" */
function parseNumberedQuestions(text: string): QuestionSet | null {
  const lines = text.split('\n');

  // Find indices of lines that start numbered items
  const numberedIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && NUMBERED_LINE_RE.test(line)) {
      numberedIndices.push(i);
    }
  }

  // Threshold: need at least 2 numbered items
  if (numberedIndices.length < 2) {
    return null;
  }

  // Extract blocks for each numbered item
  const blocks: string[][] = [];
  for (let i = 0; i < numberedIndices.length; i++) {
    const start = numberedIndices[i] ?? 0;
    const nextIdx = numberedIndices[i + 1];
    const end = nextIdx !== undefined ? nextIdx : lines.length;

    // Collect lines for this block, trimming trailing blank lines
    const blockLines: string[] = [];
    for (let j = start; j < end; j++) {
      const line = lines[j] ?? '';
      // Stop if we hit a non-continuation line after the block content
      if (
        j > start &&
        line.trim() !== '' &&
        !line.startsWith('-') &&
        !line.startsWith(' ') &&
        !line.startsWith('\t')
      ) {
        // Check if this is the last block and there's trailing text
        if (i === numberedIndices.length - 1) {
          const prevLine = lines[j - 1];
          if (j > 0 && prevLine !== undefined && prevLine.trim() === '') {
            break;
          }
        }
      }
      blockLines.push(line);
    }

    blocks.push(blockLines);
  }

  // Question-ness heuristic: blocks should look like questions or labeled prompts
  // Accept if any block has: ? mark, bold **title**, or em-dash (—) separator
  const looksLikeQuestions = blocks.some((block) =>
    block.some((line) => line.includes('?') || /\*\*.+\*\*/.test(line) || line.includes('—')),
  );
  if (!looksLikeQuestions) {
    return null;
  }

  // Extract preamble: everything before the first numbered line
  const firstIdx = numberedIndices[0] ?? 0;
  const preamble = lines.slice(0, firstIdx).join('\n').trim();

  // Parse each block into a Question
  const questions: Question[] = blocks.map((blockLines, i) => {
    // Strip the number prefix from the first line
    const rawFirst = blockLines[0] ?? '';
    const firstLine = rawFirst.replace(NUMBERED_LINE_RE, '');
    const fullBody = [firstLine, ...blockLines.slice(1)].join('\n').trim();

    // Extract title
    const title = extractTitle(firstLine);

    // Extract suggestions (dash-list or asterisk-list items)
    const suggestions: string[] = [];
    for (const line of blockLines.slice(1)) {
      const listMatch = /^[-*]\s+(.+)$/.exec(line.trim());
      if (listMatch !== null) {
        const captured = listMatch[1];
        if (captured !== undefined) {
          suggestions.push(captured);
        }
      }
    }

    return {
      index: i + 1,
      title,
      body: fullBody,
      suggestions,
    };
  });

  return { preamble, questions };
}

/**
 * Strategy 2: Dash-list questions under bold section headers.
 * Detects patterns like:
 *   **Core concept:**
 *   - Is this a mobile app?
 *   - Do you have a preferred stack?
 *   **Users & roles:**
 *   - Are you thinking three user types?
 */
function parseDashListQuestions(text: string): QuestionSet | null {
  const lines = text.split('\n');

  // Find all dash-list lines that contain a question mark
  const questionLines: Array<{ lineIndex: number; text: string; section: string }> = [];
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    // Detect bold section headers: "**Title:**" or "**Title — description:**"
    const sectionMatch = /^\*\*(.+?)\*\*/.exec(trimmed);
    if (sectionMatch !== null && !trimmed.startsWith('-') && !trimmed.startsWith('*  ')) {
      const captured = sectionMatch[1];
      if (captured !== undefined) {
        currentSection = captured.replace(/:$/, '').trim();
      }
    }

    // Detect dash-list or asterisk-list items that look like questions
    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listMatch !== null) {
      const itemText = listMatch[1];
      if (itemText !== undefined && itemText.includes('?')) {
        questionLines.push({ lineIndex: i, text: itemText, section: currentSection });
      }
    }
  }

  // Threshold: need at least 2 question items
  if (questionLines.length < 2) {
    return null;
  }

  // Extract preamble: text before the first bold header or first question
  let preambleEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();
    if (/^\*\*(.+?)\*\*/.test(trimmed) || /^[-*]\s+.+\?/.test(trimmed)) {
      preambleEnd = i;
      break;
    }
  }
  const preamble = lines.slice(0, preambleEnd).join('\n').trim();

  // Convert each question line into a Question
  const questions: Question[] = questionLines.map((q, i) => {
    const title = extractTitle(q.text);
    const sectionPrefix = q.section !== '' ? `${q.section}: ` : '';
    return {
      index: i + 1,
      title: sectionPrefix + title,
      body: q.text,
      suggestions: [],
    };
  });

  return { preamble, questions };
}

/** Extract a concise title from the first line of a question block. */
function extractTitle(line: string): string {
  // Try bold text first: **Title**
  const boldMatch = /\*\*(.+?)\*\*/.exec(line);
  if (boldMatch !== null) {
    const captured = boldMatch[1];
    if (captured !== undefined) {
      return captured;
    }
  }

  // Try up to first question mark
  const qIndex = line.indexOf('?');
  if (qIndex !== -1) {
    return line.slice(0, qIndex + 1).trim();
  }

  // Try up to first em dash
  const dashIndex = line.indexOf('—');
  if (dashIndex !== -1) {
    return line.slice(0, dashIndex).trim();
  }

  // Fallback: first sentence or full line
  const periodIndex = line.indexOf('.');
  if (periodIndex !== -1 && periodIndex < line.length - 1) {
    return line.slice(0, periodIndex + 1).trim();
  }

  return line.trim();
}
