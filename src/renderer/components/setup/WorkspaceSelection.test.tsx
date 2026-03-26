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

  it('does not call onSelectFolder immediately when Browse is clicked', async () => {
    const onSelectFolder = vi.fn();
    const user = userEvent.setup();
    render(<WorkspaceSelection onSelectFolder={onSelectFolder} onSkip={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /browse/i }));
    expect(onSelectFolder).not.toHaveBeenCalled();
  });

  it('has a hidden file input with webkitdirectory attribute', () => {
    render(<WorkspaceSelection onSelectFolder={vi.fn()} onSkip={vi.fn()} />);
    const input = screen.getByTestId('folder-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveClass('hidden');
  });

  it('shows selected folder name after file input change', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSelectFolder = vi.fn();
    render(<WorkspaceSelection onSelectFolder={onSelectFolder} onSkip={vi.fn()} />);

    const input = screen.getByTestId('folder-input');
    const file = new File([''], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'my-project/test.txt' });

    const fileList = {
      0: file,
      length: 1,
      item: (index: number): File | null => (index === 0 ? file : null),
      [Symbol.iterator]: function* (): Generator<File> {
        yield file;
      },
    } as unknown as FileList;

    Object.defineProperty(input, 'files', { value: fileList, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(await screen.findByTestId('selected-folder')).toHaveTextContent('my-project');
    // Browse button should be hidden after selection
    expect(screen.queryByRole('button', { name: /browse/i })).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('calls onSelectFolder with path after delay', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSelectFolder = vi.fn();
    render(<WorkspaceSelection onSelectFolder={onSelectFolder} onSkip={vi.fn()} />);

    const input = screen.getByTestId('folder-input');
    const file = new File([''], 'index.ts', { type: 'text/plain' });
    Object.defineProperty(file, 'webkitRelativePath', { value: 'my-project/index.ts' });

    const fileList = {
      0: file,
      length: 1,
      item: (index: number): File | null => (index === 0 ? file : null),
      [Symbol.iterator]: function* (): Generator<File> {
        yield file;
      },
    } as unknown as FileList;

    Object.defineProperty(input, 'files', { value: fileList, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onSelectFolder).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1200);

    expect(onSelectFolder).toHaveBeenCalledOnce();
    expect(onSelectFolder).toHaveBeenCalledWith('my-project');

    vi.useRealTimers();
  });
});
