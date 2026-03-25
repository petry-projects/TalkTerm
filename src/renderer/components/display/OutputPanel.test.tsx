// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OutputPanel } from './OutputPanel';

describe('OutputPanel', () => {
  it('renders nothing when mode is none', () => {
    const { container } = render(<OutputPanel mode="none" data={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders document view', () => {
    render(<OutputPanel mode="document" data={{ markdown: '# Hello' }} onClose={vi.fn()} />);
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('# Hello')).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<OutputPanel mode="document" data={{ markdown: 'test' }} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<OutputPanel mode="document" data={{ markdown: 'test' }} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders task progress', () => {
    const data = { steps: [{ name: 'Step 1', status: 'completed' as const }] };
    render(<OutputPanel mode="task-progress" data={data} onClose={vi.fn()} />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });
});
