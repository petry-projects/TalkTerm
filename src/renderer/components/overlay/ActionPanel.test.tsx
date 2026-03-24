// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { ActionCardData } from './ActionCard';
import { ActionPanel } from './ActionPanel';

const mockCards: ActionCardData[] = [
  { label: 'A', title: 'Option A', description: 'First' },
  { label: 'B', title: 'Option B', description: 'Second' },
  { label: 'C', title: 'Option C', description: 'Third' },
];

describe('ActionPanel', () => {
  it('renders title', () => {
    render(<ActionPanel title="Choose an approach" cards={mockCards} onSelect={vi.fn()} />);
    expect(screen.getByText('Choose an approach')).toBeInTheDocument();
  });

  it('renders all cards', () => {
    render(<ActionPanel title="Choose" cards={mockCards} onSelect={vi.fn()} />);
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('calls onSelect when a card is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ActionPanel title="Choose" cards={mockCards} onSelect={onSelect} />);
    await user.click(screen.getByText('Option B'));
    expect(onSelect).toHaveBeenCalledWith('B');
  });

  it('has 240px width', () => {
    const { container } = render(
      <ActionPanel title="Choose" cards={mockCards} onSelect={vi.fn()} />,
    );
    const panel = container.firstChild as HTMLElement;
    expect(panel.classList.contains('w-[240px]')).toBe(true);
  });
});
