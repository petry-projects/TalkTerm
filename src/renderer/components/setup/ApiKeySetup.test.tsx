// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('auto-focuses the input on mount', () => {
    render(<ApiKeySetup onValidated={vi.fn()} />);
    expect(screen.getByPlaceholderText('sk-ant-api03-...')).toHaveFocus();
  });

  it('shows Validate API Key button on load, disabled', () => {
    render(<ApiKeySetup onValidated={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /validate api key/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('enables Validate API Key button when input is provided', async () => {
    const user = userEvent.setup();
    render(<ApiKeySetup onValidated={vi.fn()} />);
    const input = screen.getByPlaceholderText('sk-ant-api03-...');
    await user.type(input, 'some-key');
    expect(screen.getByRole('button', { name: /validate api key/i })).toBeEnabled();
  });

  it('triggers validation on Enter key press', async () => {
    const onValidated = vi.fn();
    const user = userEvent.setup();
    render(<ApiKeySetup onValidated={onValidated} />);

    const input = screen.getByPlaceholderText('sk-ant-api03-...');
    await user.type(input, 'sk-ant-api03-test-key{Enter}');

    await waitFor(
      () => {
        expect(screen.getByText(/key verified/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    await waitFor(
      () => {
        expect(onValidated).toHaveBeenCalledWith('sk-ant-api03-test-key');
      },
      { timeout: 3000 },
    );
  }, 10000);

  it('shows link to create API key', () => {
    render(<ApiKeySetup onValidated={vi.fn()} />);
    expect(screen.getByText(/create a free api key/i)).toBeInTheDocument();
  });

  it('explains API keys are separate from subscriptions', () => {
    render(<ApiKeySetup onValidated={vi.fn()} />);
    expect(screen.getByText(/separate from Claude Pro\/Max subscriptions/i)).toBeInTheDocument();
  });

  it('shows expired message when initialState is expired', () => {
    render(<ApiKeySetup onValidated={vi.fn()} initialState="expired" />);
    expect(screen.getByText(/expired or been revoked/i)).toBeInTheDocument();
  });

  it('shows env key detected screen when detectedEnvKey is true', () => {
    render(<ApiKeySetup onValidated={vi.fn()} detectedEnvKey={true} />);
    expect(screen.getByText(/found an existing api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use existing key/i })).toBeInTheDocument();
  });

  it('calls onValidated with ENV_KEY when using detected key', async () => {
    const onValidated = vi.fn();
    const user = userEvent.setup();
    render(<ApiKeySetup onValidated={onValidated} detectedEnvKey={true} />);
    await user.click(screen.getByRole('button', { name: /use existing key/i }));
    expect(onValidated).toHaveBeenCalledWith('ENV_KEY');
  });

  it('calls onValidated with ENV_KEY on Enter when env key detected', async () => {
    const onValidated = vi.fn();
    const user = userEvent.setup();
    render(<ApiKeySetup onValidated={onValidated} detectedEnvKey={true} />);
    await user.keyboard('{Enter}');
    expect(onValidated).toHaveBeenCalledWith('ENV_KEY');
  });

  it('offers option to enter different key when env key detected', () => {
    render(<ApiKeySetup onValidated={vi.fn()} detectedEnvKey={true} />);
    expect(screen.getByText(/enter a different key/i)).toBeInTheDocument();
  });

  it('auto-advances after clicking Validate API Key with valid key', async () => {
    const onValidated = vi.fn();
    const user = userEvent.setup();
    render(<ApiKeySetup onValidated={onValidated} />);

    const input = screen.getByPlaceholderText('sk-ant-api03-...');
    await user.type(input, 'sk-ant-api03-test-key');
    await user.click(screen.getByRole('button', { name: /validate api key/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/key verified/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(screen.getByText(/continuing/i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(onValidated).toHaveBeenCalledWith('sk-ant-api03-test-key');
      },
      { timeout: 3000 },
    );
  }, 10000);

  it('does not auto-advance for invalid keys', async () => {
    const onValidated = vi.fn();
    const user = userEvent.setup();
    render(<ApiKeySetup onValidated={onValidated} />);

    const input = screen.getByPlaceholderText('sk-ant-api03-...');
    await user.type(input, 'invalid-key');
    await user.click(screen.getByRole('button', { name: /validate api key/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/didn't work/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    expect(onValidated).not.toHaveBeenCalled();
  }, 10000);

  it('shows Validate API Key button again after failed validation for retry', async () => {
    const user = userEvent.setup();
    render(<ApiKeySetup onValidated={vi.fn()} />);

    const input = screen.getByPlaceholderText('sk-ant-api03-...');
    await user.type(input, 'invalid-key');
    await user.click(screen.getByRole('button', { name: /validate api key/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/didn't work/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const btn = screen.getByRole('button', { name: /validate api key/i });
    expect(btn).toBeEnabled();
  }, 10000);
});
