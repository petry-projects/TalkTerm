// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ComparisonTable, type ComparisonRow } from './ComparisonTable';

const rows: ComparisonRow[] = [
  {
    name: 'Approach A',
    scores: { speed: 4, cost: 3 },
    details: 'Detailed analysis',
    isWinner: true,
  },
  { name: 'Approach B', scores: { speed: 2, cost: 5 } },
];

describe('ComparisonTable', () => {
  it('renders all rows', () => {
    render(<ComparisonTable rows={rows} criteria={['speed', 'cost']} />);
    expect(screen.getByText('Approach A')).toBeInTheDocument();
    expect(screen.getByText('Approach B')).toBeInTheDocument();
  });
  it('expands details on click', async () => {
    const user = userEvent.setup();
    render(<ComparisonTable rows={rows} criteria={['speed', 'cost']} />);
    await user.click(screen.getByText('Approach A'));
    expect(screen.getByText('Detailed analysis')).toBeInTheDocument();
  });
});
