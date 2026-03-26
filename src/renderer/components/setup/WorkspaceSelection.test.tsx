// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceSelection } from './WorkspaceSelection';

describe('WorkspaceSelection', () => {
  it('renders heading', () => {
    render(<WorkspaceSelection onSelectFolder={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText(/connect a project/i)).toBeInTheDocument();
  });

  it('has a Browse Folder button', () => {
    render(<WorkspaceSelection onSelectFolder={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument();
  });

  it('auto-focuses Browse Folder button on mount', () => {
    render(<WorkspaceSelection onSelectFolder={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole('button', { name: /browse/i })).toHaveFocus();
  });

  it('has a Skip button', () => {
    render(<WorkspaceSelection onSelectFolder={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
  });

  it('calls onSkip when Skip is clicked', async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceSelection onSelectFolder={vi.fn()} onSkip={onSkip} />);
    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('calls onSelectFolder when Browse is clicked', async () => {
    const onSelectFolder = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceSelection onSelectFolder={onSelectFolder} onSkip={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /browse/i }));
    expect(onSelectFolder).toHaveBeenCalledOnce();
  });

  it('calls onSelectFolder on Enter when Browse button is focused', async () => {
    const onSelectFolder = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceSelection onSelectFolder={onSelectFolder} onSkip={vi.fn()} />);
    // Button is auto-focused, so Enter should trigger it
    await user.keyboard('{Enter}');
    expect(onSelectFolder).toHaveBeenCalledOnce();
  });
});
