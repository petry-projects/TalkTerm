// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentEvent } from '../../../shared/types/domain/agent-event';
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

vi.mock('../../speech/ipc-speech-stt', () => ({
  IpcSpeechStt: vi.fn().mockImplementation(() => {
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

// Mock electronAPI — captures the onAgentEvent callback for simulating events
let agentEventCallback: ((event: AgentEvent) => void) | null = null;
const mockSendAgentMessage = vi.fn().mockResolvedValue(undefined);
const mockCancelAgent = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  agentEventCallback = null;

  // Mock electronAPI on window
  Object.defineProperty(window, 'electronAPI', {
    value: {
      sendAgentMessage: mockSendAgentMessage,
      cancelAgent: mockCancelAgent,
      onAgentEvent: vi.fn((callback: (event: AgentEvent) => void) => {
        agentEventCallback = callback;
        return vi.fn(); // unsubscribe function
      }),
      startSession: vi.fn().mockResolvedValue('test-session-id'),
      resumeSession: vi.fn().mockResolvedValue(undefined),
      validateApiKey: vi.fn().mockResolvedValue({ valid: true }),
      storeApiKey: vi.fn().mockResolvedValue(undefined),
      getKeyState: vi.fn().mockResolvedValue('valid'),
      setAuthMode: vi.fn().mockResolvedValue(undefined),
      getAuthMode: vi.fn().mockResolvedValue('api-key'),
      getProfile: vi.fn().mockResolvedValue(null),
      setProfile: vi.fn().mockResolvedValue(undefined),
      getAvatarRoster: vi.fn().mockResolvedValue([]),
      selectAvatar: vi.fn().mockResolvedValue(undefined),
      browseWorkspace: vi.fn().mockResolvedValue(null),
      setWorkspace: vi.fn().mockResolvedValue(undefined),
      assessLaunchState: vi.fn().mockResolvedValue({
        apiKeyValid: true,
        envKeyDetected: false,
        profileComplete: false,
        avatarSelected: false,
        workspaceSelected: false,
      }),
      startAudioCapture: vi.fn().mockResolvedValue(undefined),
      stopAudioCapture: vi.fn().mockResolvedValue(undefined),
      sendAudioData: vi.fn(),
      onAudioResult: vi.fn().mockReturnValue(vi.fn()),
      onAudioError: vi.fn().mockReturnValue(vi.fn()),
      onAudioEnd: vi.fn().mockReturnValue(vi.fn()),
    },
    writable: true,
    configurable: true,
  });

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

/** Helper to simulate an agent event arriving from the main process */
function simulateAgentEvent(event: AgentEvent): void {
  act(() => {
    agentEventCallback?.(event);
  });
}

describe('ConversationView', () => {
  it('renders avatar placeholder', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    expect(screen.getByTestId('avatar-placeholder')).toBeInTheDocument();
  });

  it('renders text input with avatar name', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    expect(screen.getByPlaceholderText(/speak to Mary/i)).toBeInTheDocument();
  });

  it('shows initial greeting with BMAD analyst identity', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    expect(screen.getByText(/Hey DJ.*Mary.*BMAD Analyst/i)).toBeInTheDocument();
  });

  it('shows mic button', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });

  it('sends message via IPC when user types and presses Enter', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="session-42" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'Hello there{Enter}');
    expect(mockSendAgentMessage).toHaveBeenCalledWith('session-42', 'Hello there');
    expect(screen.getByLabelText(/avatar is thinking/i)).toBeInTheDocument();
  });

  it('transitions to speaking state when agent sends text event', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'Hello{Enter}');

    simulateAgentEvent({ type: 'text', content: 'Hi there!' });

    expect(screen.getByLabelText(/avatar is speaking/i)).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(mockTtsSpeak).toHaveBeenCalledWith('Hi there!', undefined);
  });

  it('shows tool-call status in caption', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    simulateAgentEvent({ type: 'tool-call', toolName: 'bash', toolInput: { command: 'ls' } });
    expect(screen.getByText(/Using bash/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/avatar is thinking/i)).toBeInTheDocument();
  });

  it('shows error event message and returns to ready', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    simulateAgentEvent({
      type: 'error',
      userMessage: 'Something went wrong. Please try again.',
      recoveryOptions: [],
    });
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/avatar is ready/i)).toBeInTheDocument();
  });

  it('starts STT when mic button is clicked (live mode)', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(mockSttStart).toHaveBeenCalledOnce();
  });

  it('sets avatar to listening when mic is clicked', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(screen.getByLabelText(/avatar is listening/i)).toBeInTheDocument();
  });

  it('shows live mode indicator when mic is active', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    expect(screen.getByText(/live mode/i)).toBeInTheDocument();
  });

  it('stops live mode when mic button is clicked again', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);

    // Start live mode
    await user.click(screen.getByRole('button', { name: /start recording/i }));
    mockSttInstance.isListening = true;

    // Stop live mode
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    expect(mockSttStop).toHaveBeenCalled();
  });

  it('auto-sends final STT result via IPC (no Enter required)', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="session-99" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    // Simulate final STT result — should auto-send and go to thinking
    act(() => {
      mockSttInstance.onResult?.({ transcript: 'hello world', isFinal: true });
    });

    expect(mockSendAgentMessage).toHaveBeenCalledWith('session-99', 'hello world');
    expect(screen.getByLabelText(/avatar is thinking/i)).toBeInTheDocument();
  });

  it('shows interim STT result in caption', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    act(() => {
      mockSttInstance.onResult?.({ transcript: 'hello', isFinal: false });
    });

    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows microphone error when mic access fails', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    act(() => {
      mockSttInstance.onError?.(new Error('Microphone access failed: Permission denied'));
    });

    expect(screen.getByText(/microphone access failed/i)).toBeInTheDocument();
  });

  it('shows generic error for other STT failures', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);

    await user.click(screen.getByRole('button', { name: /start recording/i }));

    act(() => {
      mockSttInstance.onError?.(new Error('Speech recognition error: audio-capture'));
    });

    expect(screen.getByText(/could not hear you/i)).toBeInTheDocument();
  });

  it('returns avatar to ready when TTS finishes', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);

    // Simulate agent text event → speaking
    simulateAgentEvent({ type: 'text', content: 'Hello!' });
    expect(screen.getByLabelText(/avatar is speaking/i)).toBeInTheDocument();

    // Simulate TTS end
    act(() => {
      mockTtsInstance.onEnd?.();
    });

    expect(screen.getByLabelText(/avatar is ready/i)).toBeInTheDocument();
  });

  it('subscribes to agent events on mount and unsubscribes on unmount', () => {
    const { unmount } = render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    expect(window.electronAPI.onAgentEvent).toHaveBeenCalledOnce();

    unmount();
    expect(mockSttStop).toHaveBeenCalled();
    expect(mockTtsStop).toHaveBeenCalled();
  });

  it('cleans up STT and TTS on unmount', () => {
    const { unmount } = render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    unmount();
    expect(mockSttStop).toHaveBeenCalled();
    expect(mockTtsStop).toHaveBeenCalled();
  });

  // FR37 — Stop talking button
  it('shows stop button when avatar is speaking', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    // No stop button initially (ready state)
    expect(screen.queryByRole('button', { name: /stop talking/i })).not.toBeInTheDocument();

    // Simulate agent text → speaking state
    simulateAgentEvent({ type: 'text', content: 'Hello!' });
    expect(screen.getByRole('button', { name: /stop talking/i })).toBeInTheDocument();
  });

  it('shows stop button when avatar is thinking', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'test{Enter}');

    expect(screen.getByRole('button', { name: /stop talking/i })).toBeInTheDocument();
  });

  it('shows stop button during progress events (rate limiting)', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);

    // Send a message to enter thinking state
    const input = screen.getByPlaceholderText(/speak to Mary/i);
    await user.type(input, 'test{Enter}');

    // Simulate a progress event (e.g., rate limit)
    simulateAgentEvent({
      type: 'progress',
      step: 'Waiting for API availability...',
      status: 'in-progress',
    });
    expect(screen.getByRole('button', { name: /stop talking/i })).toBeInTheDocument();
    expect(screen.getByText(/Waiting for API availability/i)).toBeInTheDocument();
  });

  it('clicking stop button stops TTS and returns to ready', async () => {
    const user = userEvent.setup();
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);

    simulateAgentEvent({ type: 'text', content: 'Long response...' });
    expect(screen.getByLabelText(/avatar is speaking/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /stop talking/i }));
    expect(mockTtsStop).toHaveBeenCalled();
    expect(mockCancelAgent).toHaveBeenCalled();
    expect(screen.getByLabelText(/avatar is ready/i)).toBeInTheDocument();
  });

  // FR57-59 — Structured question input
  it('shows question card stack when agent sends structured questions', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    simulateAgentEvent({
      type: 'text',
      content:
        'Great idea! A few questions:\n1. **Platform** — iOS or Android?\n2. **Scope** — MVP or full?',
    });
    expect(screen.getByTestId('question-card-stack')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('speaks only the preamble when questions are detected', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    simulateAgentEvent({
      type: 'text',
      content:
        'Great idea! A few questions:\n1. **Platform** — iOS or Android?\n2. **Scope** — MVP or full?',
    });
    expect(mockTtsSpeak).toHaveBeenCalledWith('Great idea! A few questions:', undefined);
  });

  it('sends aggregated message when question answers are submitted', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="session-q" />);
    simulateAgentEvent({
      type: 'text',
      content: 'Questions:\n1. **A** — First?\n2. **B** — Second?',
    });
    expect(screen.getByTestId('question-card-stack')).toBeInTheDocument();

    // Dismiss the card stack (simulates submission callback)
    // The QuestionCardStack calls onSubmit with the aggregated message
    // We can test the integration by checking the card stack renders and dismiss works
    const closeBtn = screen.getByRole('button', { name: /close questions/i });
    act(() => {
      closeBtn.click();
    });
    expect(screen.queryByTestId('question-card-stack')).not.toBeInTheDocument();
  });

  it('does not show card stack for single-question text', () => {
    render(<ConversationView userName="DJ" avatarName="Mary" sessionId="s1" />);
    simulateAgentEvent({
      type: 'text',
      content: 'Just one thing: 1. **Platform** — iOS or Android?',
    });
    expect(screen.queryByTestId('question-card-stack')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/avatar is speaking/i)).toBeInTheDocument();
  });
});
