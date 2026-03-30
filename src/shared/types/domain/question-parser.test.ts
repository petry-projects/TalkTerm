import { describe, it, expect } from 'vitest';
import { parseQuestions } from './question-parser';

describe('parseQuestions', () => {
  // --- Detection threshold ---

  it('returns null for text with no numbered questions', () => {
    const result = parseQuestions('Just a regular response with no questions.');
    expect(result).toBeNull();
  });

  it('returns null for text with only one numbered question', () => {
    const result = parseQuestions(
      'Here is my thought:\n1. **Platform** — What platform are you targeting?',
    );
    expect(result).toBeNull();
  });

  it('returns a QuestionSet for text with two or more numbered questions', () => {
    const text = '1. **Platform** — What platform?\n2. **Scope** — What scope?';
    const result = parseQuestions(text);
    expect(result).not.toBeNull();
    expect(result?.questions).toHaveLength(2);
  });

  // --- Preamble extraction ---

  it('extracts preamble text before the first numbered question', () => {
    const text =
      "That's a great idea! A few questions:\n1. **Platform** — iOS or Android?\n2. **Scope** — MVP or full?";
    const result = parseQuestions(text);
    expect(result?.preamble).toBe("That's a great idea! A few questions:");
  });

  it('returns empty preamble when text starts with a numbered question', () => {
    const text = '1. **Platform** — iOS or Android?\n2. **Scope** — MVP or full?';
    const result = parseQuestions(text);
    expect(result?.preamble).toBe('');
  });

  // --- Question title extraction ---

  it('extracts title from bold text', () => {
    const text = '1. **Platform** — Are you thinking mobile or web?\n2. **Scope** — MVP or full?';
    const result = parseQuestions(text);
    expect(result?.questions[0]?.title).toBe('Platform');
    expect(result?.questions[1]?.title).toBe('Scope');
  });

  it('extracts title from first sentence when no bold text', () => {
    const text = '1. What platform are you targeting?\n2. What is your preferred tech stack?';
    const result = parseQuestions(text);
    expect(result?.questions[0]?.title).toContain('platform');
  });

  it('extracts title up to question mark when no bold or dash', () => {
    const text = '1. Are you thinking mobile?\n2. What scope do you want?';
    const result = parseQuestions(text);
    expect(result?.questions[0]?.title).toBeTruthy();
    expect(result?.questions[1]?.title).toBeTruthy();
  });

  // --- Question body extraction ---

  it('extracts the full question body including sub-items', () => {
    const text = [
      'Some preamble.',
      '1. **Core features** — What are the must-haves? For example:',
      '- Competition discovery',
      '- Coach messaging',
      '- Video sharing',
      '2. **Scope** — MVP or full?',
    ].join('\n');
    const result = parseQuestions(text);
    expect(result?.questions[0]?.body).toContain('Competition discovery');
    expect(result?.questions[0]?.body).toContain('Coach messaging');
    expect(result?.questions[0]?.body).toContain('Video sharing');
  });

  // --- Suggestion parsing ---

  it('parses dash-list items as suggestions', () => {
    const text = [
      '1. **Features** — What do you need?',
      '- Competition discovery',
      '- Coach messaging',
      '- Video sharing',
      '2. **Scope** — MVP?',
    ].join('\n');
    const result = parseQuestions(text);
    expect(result?.questions[0]?.suggestions).toEqual([
      'Competition discovery',
      'Coach messaging',
      'Video sharing',
    ]);
  });

  it('parses asterisk-list items as suggestions', () => {
    const text = [
      '1. **Features** — What do you need?',
      '* Competition discovery',
      '* Coach messaging',
      '2. **Scope** — MVP?',
    ].join('\n');
    const result = parseQuestions(text);
    expect(result?.questions[0]?.suggestions).toEqual(['Competition discovery', 'Coach messaging']);
  });

  it('returns empty suggestions when question has no list items', () => {
    const text = '1. **Platform** — iOS or Android?\n2. **Scope** — MVP or full?';
    const result = parseQuestions(text);
    expect(result?.questions[0]?.suggestions).toEqual([]);
    expect(result?.questions[1]?.suggestions).toEqual([]);
  });

  // --- Index tracking ---

  it('assigns correct 1-based index to each question', () => {
    const text = '1. First?\n2. Second?\n3. Third?';
    const result = parseQuestions(text);
    expect(result?.questions[0]?.index).toBe(1);
    expect(result?.questions[1]?.index).toBe(2);
    expect(result?.questions[2]?.index).toBe(3);
  });

  // --- Real-world agent response ---

  it('parses a realistic multi-question agent response', () => {
    const text = [
      "That's a fun concept! Before I start planning anything out, I'd love to understand more about what you're envisioning. A few questions:",
      '1. **Platform** — Are you thinking mobile (iOS, Android, or both), web app, or all of the above?',
      '2. **Core features** — Beyond connecting twirlers with competitions and coaches, what are the must-haves for a first version? For example:',
      '- Competition discovery/registration',
      '- Coach-student messaging',
      '- Practice tracking or video sharing',
      '- Scoring/results',
      '- Profiles for twirlers and coaches',
      '3. **Tech preferences** — Do you have a preferred tech stack, or are you open to recommendations?',
      '4. **Scope** — Are you looking for a full implementation plan, a prototype/MVP, or more of a high-level architecture overview to start?',
      "5. **Users** — Who's the primary audience? Competitive twirlers, recreational, coaches, competition organizers, or all of the above?",
      "Let me know where your head's at and I'll put together a solid plan!",
    ].join('\n');

    const result = parseQuestions(text);
    expect(result).not.toBeNull();
    expect(result?.preamble).toContain('fun concept');
    expect(result?.questions).toHaveLength(5);
    expect(result?.questions[0]?.title).toBe('Platform');
    expect(result?.questions[1]?.title).toBe('Core features');
    expect(result?.questions[1]?.suggestions).toContain('Competition discovery/registration');
    expect(result?.questions[1]?.suggestions).toContain('Coach-student messaging');
    expect(result?.questions[2]?.title).toBe('Tech preferences');
    expect(result?.questions[3]?.title).toBe('Scope');
    expect(result?.questions[4]?.title).toBe('Users');
  });

  // --- Edge cases ---

  it('handles questions numbered with parentheses like "1)"', () => {
    const text = '1) First question?\n2) Second question?';
    const result = parseQuestions(text);
    expect(result).not.toBeNull();
    expect(result?.questions).toHaveLength(2);
  });

  it('handles trailing text after the last question', () => {
    const text = [
      '1. **A** — Question A?',
      '2. **B** — Question B?',
      'Let me know your thoughts!',
    ].join('\n');
    const result = parseQuestions(text);
    expect(result?.questions).toHaveLength(2);
    // Trailing text should not create a third question
  });

  it('returns null for numbered list that is not questions', () => {
    const text = 'Here are the steps:\n1. Install Node.js\n2. Run npm install\n3. Start the app';
    const result = parseQuestions(text);
    // Non-question numbered items (no ? mark, no bold interrogative) — parser should return null
    expect(result).toBeNull();
  });
});
