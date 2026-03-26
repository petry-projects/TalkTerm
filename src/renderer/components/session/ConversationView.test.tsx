// @vitest-environment jsdom
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SpeechToTextResult } from '../../../shared/types/ports/speech-to-text';
import { ConversationView } from './ConversationView';

// Mock STT and TTS modules
const mockSttStart = vi.fn();
const mockSttStop = vi.fn();
const mockTtsSpeak = vi.fn();
const mockTtsStop = vi.fn();

let mockSttInstance: {
  start: typeof mockSttStart;
  stop: typeof mockSttStop;
  onResult: ((result: SpeechToTextResult) => void) | null;
  onError: ((error: Error) => void) | null;
  onEnd: (() => void) | null;
  isListening: boolean;
};

let mockTtsInstance: {
  speak: typeof mockTtsSpeak;
  stop: typeof mockTtsStop;
  onEnd: (() => void) | null;
  isSpeaking: boolean;
};

vi.mock('../../speech/web-speech-stt', () => ({
  WebSpeechStt: vi.fn().mockImplementation(() => {
    mockSttInstance = {
      start: mockSttStart,
      stop: mockSttStop,
      onResult: null,
      onError: null,
      onEnd: null,
      isListening: false,
    };
    return mockSttInstance;
  }),
}));

vi.mock('../../speech/web-speech-tts', () => ({
  WebSpeechTts: vi.fn().mockImplementation(() => {
    mockTtsInstance = {
      speak: mockTtsSpeak,
      stop: mockTtsStop,
      onEnd: null,
      isSpeaking: false,
    };
    return mockTtsInstance;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

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
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'Hello there{Enter}');
    expect(screen.getByLabelText(/avatar is thinking/i)).toBeInTheDocument();
  });

  it('transitions to speaking state after thinking and calls TTS', async () => {
    vi.useRealTimers();
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

    expect(mockTtsSpeak).toHaveBeenCalled();
  });

  it('shows a demo response instead of hardcoded text', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'Hello{Enter}');

    await waitFor(
      () => {
        expect(screen.getByText(/full version/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('starts STT when mic button is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(mockSttStart).toHaveBeenCalledOnce();
  });

  it('sets avatar to listening when mic is clicked', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(screen.getByLabelText(/avatar is listening/i)).toBeInTheDocument();
  });

  it('stops STT when mic button is clicked while listening', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);

    // Start listening
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    // Simulate that STT is now listening
    mockSttInstance.isListening = true;
    // Stop listening
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    expect(mockSttStop).toHaveBeenCalled();
  });

  it('populates input with final STT result', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    // Simulate final STT result
    act(() => {
      mockSttInstance.onResult?.({ transcript: 'hello world', isFinal: true });
    });

    const input = screen.getByPlaceholderText(/speak to Mary/i);
    expect(input).toHaveValue('hello world');
  });

  it('shows interim STT result in caption', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    act(() => {
      mockSttInstance.onResult?.({ transcript: 'hello', isFinal: false });
    });

    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows friendly error when STT fails', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    act(() => {
      mockSttInstance.onError?.(new Error('Speech recognition error: network'));
    });

    expect(screen.getByText(/could not hear you/i)).toBeInTheDocument();
  });

  it('returns avatar to ready when TTS finishes', async () => {
    vi.useRealTimers();
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

    // Simulate TTS finishing
    act(() => {
      mockTtsInstance.onEnd?.();
    });

    expect(screen.getByLabelText(/avatar is ready/i)).toBeInTheDocument();
  });

  it('cleans up STT and TTS on unmount', () => {
    const { unmount } = render(<ConversationView userName="DJ" avatarName="Mary" />);
    unmount();
    expect(mockSttStop).toHaveBeenCalled();
    expect(mockTtsStop).toHaveBeenCalled();
  });
});
