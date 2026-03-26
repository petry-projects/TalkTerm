// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ClusteredCards, type CardCluster } from './ClusteredCards';

const clusters: CardCluster[] = [
  {
    category: 'User Experience',
    ideas: [{ title: 'Better onboarding', priority: 'high' }, { title: 'Dark mode' }],
  },
  { category: 'Performance', ideas: [{ title: 'Caching layer' }] },
];

describe('ClusteredCards', () => {
  it('renders categories with count badges', () => {
    render(<ClusteredCards clusters={clusters} />);
    expect(screen.getByText('User Experience')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
  it('expands to show ideas', async () => {
    const user = userEvent.setup();
    render(<ClusteredCards clusters={clusters} />);
    await user.click(screen.getByText('User Experience'));
    expect(screen.getByText('Better onboarding')).toBeInTheDocument();
  });
  it('shows priority tags', async () => {
    const user = userEvent.setup();
    render(<ClusteredCards clusters={clusters} />);
    await user.click(screen.getByText('User Experience'));
    expect(screen.getByText('high')).toBeInTheDocument();
  });
});
