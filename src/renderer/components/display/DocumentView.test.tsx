// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DocumentView } from './DocumentView';

describe('DocumentView', () => {
  it('renders markdown content', () => {
    render(<DocumentView markdown="# Hello World" />);
    expect(screen.getByText('# Hello World')).toBeInTheDocument();
  });
  it('shows file path when provided', () => {
    render(<DocumentView markdown="content" filePath="/tmp/output.md" />);
    expect(screen.getByText(/\/tmp\/output\.md/)).toBeInTheDocument();
  });
  it('does not show file path when not provided', () => {
    render(<DocumentView markdown="content" />);
    expect(screen.queryByText(/Saved to/)).not.toBeInTheDocument();
  });
});
