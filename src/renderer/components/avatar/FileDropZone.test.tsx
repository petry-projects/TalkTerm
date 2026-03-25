// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileDropZone } from './FileDropZone';

describe('FileDropZone', () => {
  it('renders children', () => {
    render(
      <FileDropZone onFilesDropped={vi.fn()}>
        <div>Content</div>
      </FileDropZone>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('has data-testid for targeting', () => {
    render(
      <FileDropZone onFilesDropped={vi.fn()}>
        <div>Content</div>
      </FileDropZone>,
    );
    expect(screen.getByTestId('file-drop-zone')).toBeInTheDocument();
  });
});
