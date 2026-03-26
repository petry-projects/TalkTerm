// @vitest-environment jsdom
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  // Mock speechSynthesis for jsdom (not available natively)
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      getVoices: vi.fn().mockReturnValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      speak: vi.fn(),
      cancel: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
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

  it('shows initial greeting with BMAD analyst identity', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    expect(screen.getByText(/Hey DJ.*Mary.*BMAD Analyst/i)).toBeInTheDocument();
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

  it('transitions to speaking state after thinking and calls TTS', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'Hello{Enter}');

    await waitFor(
      () => {
        expect(mockTtsSpeak).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('shows BMAD analyst response for brainstorming requests', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'help me brainstorm{Enter}');

    await waitFor(
      () => {
        expect(screen.getByText(/brainstorm with you/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('starts STT when mic button is clicked (live mode)', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(mockSttStart).toHaveBeenCalledOnce();
  });

  it('sets avatar to listening when mic is clicked', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(screen.getByLabelText(/avatar is listening/i)).toBeInTheDocument();
  });

  it('shows live mode indicator when mic is active', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(screen.getByText(/live mode/i)).toBeInTheDocument();
  });

  it('stops live mode when mic button is clicked again', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);

    // Start live mode
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    mockSttInstance.isListening = true;

    // Stop live mode
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    expect(mockSttStop).toHaveBeenCalled();
  });

  it('auto-sends final STT result (no Enter required)', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    // Simulate final STT result — should auto-send and go to thinking
    act(() => {
      mockSttInstance.onResult?.({ transcript: 'hello world', isFinal: true });
    });

    // Should transition to thinking (auto-sent)
    expect(screen.getByLabelText(/avatar is thinking/i)).toBeInTheDocument();
  });

  it('shows interim STT result in caption', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    act(() => {
      mockSttInstance.onResult?.({ transcript: 'hello', isFinal: false });
    });

    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows friendly error when STT fails', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    act(() => {
      mockSttInstance.onError?.(new Error('Speech recognition error: network'));
    });

    expect(screen.getByText(/could not hear you/i)).toBeInTheDocument();
  });

  it('returns avatar to ready when TTS finishes', async () => {
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
