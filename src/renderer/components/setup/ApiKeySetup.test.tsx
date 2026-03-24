// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ApiKeySetup } from './ApiKeySetup';

describe('ApiKeySetup', () => {
  it('renders heading', () => {
    render(<ApiKeySetup onValidated={vi.fn()} />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('renders input with placeholder', () => {
    render(<ApiKeySetup onValidated={vi.fn()} />);
    expect(screen.getByPlaceholderText('sk-ant-api03-...')).toBeInTheDocument();
  });

  it('has Continue button disabled initially', () => {
    render(<ApiKeySetup onValidated={vi.fn()} />);
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('shows help link', () => {
    render(<ApiKeySetup onValidated={vi.fn()} />);
    expect(screen.getByText(/how do i get an api key/i)).toBeInTheDocument();
  });

  it('shows expired message when initialState is expired', () => {
    render(<ApiKeySetup onValidated={vi.fn()} initialState="expired" />);
    expect(screen.getByText(/expired or been revoked/i)).toBeInTheDocument();
  });
});
