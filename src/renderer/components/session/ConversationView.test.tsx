// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ConversationView } from './ConversationView';

describe('ConversationView', () => {
  it('renders avatar placeholder', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    expect(screen.getByTestId('avatar-placeholder')).toBeInTheDocument();
  });

  it('renders text input with avatar name', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    expect(screen.getByPlaceholderText(/speak to Mary/i)).toBeInTheDocument();
  });

  it('shows initial greeting in caption', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    expect(screen.getByText(/Hey DJ/i)).toBeInTheDocument();
  });

  it('shows mic button', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('transitions to thinking state when user sends message', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'Hello there{Enter}');
    expect(screen.getByLabelText(/avatar is thinking/i)).toBeInTheDocument();
  });

  it('transitions to speaking state after thinking', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'Hello{Enter}');

    await waitFor(
      () => {
        expect(screen.getByLabelText(/avatar is speaking/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
