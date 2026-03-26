// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the API key setup as first screen', () => {
    render(<App />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('shows Validate API Key button on initial load', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /validate api key/i })).toBeInTheDocument();
  });
});
