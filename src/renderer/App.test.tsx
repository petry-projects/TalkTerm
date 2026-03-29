// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the auth choice as first screen', () => {
    render(<App />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('shows both auth method options on initial load', () => {
    render(<App />);
    expect(screen.getByText(/Claude Pro \/ Max Subscription/)).toBeInTheDocument();
    expect(screen.getByText(/Anthropic API Key/)).toBeInTheDocument();
  });
});
