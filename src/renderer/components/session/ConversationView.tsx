import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { AgentEvent } from '../../../shared/types/domain/agent-event';
import type { AvatarAnimationState } from '../../hooks/useAvatarState';
import { WebSpeechStt } from '../../speech/web-speech-stt';
import { WebSpeechTts } from '../../speech/web-speech-tts';
import { AvatarCanvas } from '../avatar/AvatarCanvas';
import { CaptionBar } from '../avatar/CaptionBar';
import { StatusIndicator } from '../avatar/StatusIndicator';
import { TextInput } from '../avatar/TextInput';

/** Preferred TTS voices in priority order — first match wins */
const PREFERRED_VOICES = [
  'Google UK English Female',
  'Samantha', // macOS
  'Microsoft Zira', // Windows
  'Karen', // macOS Australian
  'Google US English',
];

/* eslint-disable @typescript-eslint/no-unnecessary-condition -- typeof window checks needed for SSR/test safety */
function selectBestVoice(): string | undefined {
  if (typeof window === 'undefined' || window.speechSynthesis === undefined) {
    return undefined;
  }
  const voices = window.speechSynthesis.getVoices();
  for (const preferred of PREFERRED_VOICES) {
    const match = voices.find(
      (v) => v.name === preferred || v.name.includes(preferred.split(' ')[0] ?? ''),
    );
    if (match !== undefined) {
      return match.name;
    }
  }
  // Fallback: first female-sounding English voice
  const englishVoice = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Female'));
  if (englishVoice !== undefined) {
    return englishVoice.name;
  }
  return undefined;
}

/** Option cards shown by the avatar (FR18/FR19) */
interface OptionCard {
  label: string;
  description: string;
}

/** Initial option cards Mary presents to guide the user */
const INITIAL_OPTION_CARDS: readonly OptionCard[] = [
  { label: 'Brainstorm', description: 'Generate and evaluate ideas' },
  { label: 'Create a PRD', description: 'Define product requirements' },
  { label: 'Research', description: 'Explore market & domain' },
  { label: 'Architecture', description: 'Design system components' },
];

interface ConversationViewProps {
  userName: string;
  avatarName: string;
  sessionId: string;
}

export function ConversationView({
  userName,
  avatarName,
  sessionId,
}: ConversationViewProps): ReactElement {
  const [avatarState, setAvatarState] = useState<AvatarAnimationState>('ready');
  const [caption, setCaption] = useState<string | null>(
    `Hey ${userName}! I'm Mary, your BMAD Analyst. What are you working on today?`,
  );
  const [isCaptionVisible, setIsCaptionVisible] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [sttSupported, setSttSupported] = useState(true);
  const [liveMode, setLiveMode] = useState(false);
  const [optionCards, setOptionCards] = useState<readonly OptionCard[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);

  const sttRef = useRef<WebSpeechStt | null>(null);
  const ttsRef = useRef<WebSpeechTts | null>(null);
  const voiceRef = useRef<string | undefined>(undefined);
  const liveModeRef = useRef(false);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  // Initialize STT and TTS instances + select voice
  useEffect(() => {
    const stt = new WebSpeechStt();
    const tts = new WebSpeechTts();
    sttRef.current = stt;
    ttsRef.current = tts;

    // Voice list may load async — try now and on voiceschanged
    voiceRef.current = selectBestVoice();
    const handleVoicesChanged = (): void => {
      voiceRef.current = selectBestVoice();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

    return () => {
      stt.stop();
      tts.stop();
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, []);

  // Subscribe to agent events from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.onAgentEvent((event: AgentEvent) => {
      switch (event.type) {
        case 'text':
          setAvatarState('speaking');
          setCaption(event.content);
          setIsCaptionVisible(true);
          // After agent's first response, show option cards for guided interaction
          if (!hasInteracted) {
            setOptionCards(INITIAL_OPTION_CARDS);
            setHasInteracted(true);
          }
          // Speak the response via TTS
          if (ttsRef.current !== null) {
            ttsRef.current.onEnd = (): void => {
              setAvatarState('ready');
              if (liveModeRef.current) {
                setTimeout(() => {
                  startListening();
                }, 300);
              }
            };
            ttsRef.current.speak(event.content, voiceRef.current);
          }
          break;
        case 'tool-call':
          setAvatarState('thinking');
          setCaption(`Using ${event.toolName}...`);
          setIsCaptionVisible(true);
          break;
        case 'tool-result':
          setCaption(event.success ? `${event.toolName} completed` : `${event.toolName} failed`);
          break;
        case 'error':
          setAvatarState('ready');
          setCaption(event.userMessage);
          setIsCaptionVisible(true);
          break;
        case 'complete':
          setAvatarState((prev) => (prev === 'speaking' ? prev : 'ready'));
          break;
        case 'progress':
          setCaption(`${event.step}: ${event.status}`);
          setIsCaptionVisible(true);
          break;
        case 'confirm-request':
          setAvatarState('ready');
          setCaption(`${event.description} — confirm?`);
          setIsCaptionVisible(true);
          break;
      }
    });

    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- startListening is stable via ref

  const startListening = useCallback((): void => {
    const stt = sttRef.current;
    if (stt === null) return;
    if (stt.isListening) return;

    stt.onResult = (result): void => {
      if (result.isFinal) {
        const text = result.transcript.trim();
        if (text !== '') {
          setInputValue('');
          setCaption(null);
          setIsCaptionVisible(false);
          handleSendInternal(text);
        }
      } else {
        setCaption(result.transcript);
        setIsCaptionVisible(true);
      }
    };

    stt.onError = (error): void => {
      const message = error.message.includes('not supported')
        ? 'Speech recognition requires Chrome or Edge browser.'
        : 'Could not hear you clearly. Please try again.';
      setSttSupported(!error.message.includes('not supported'));
      setCaption(message);
      setIsCaptionVisible(true);
      setAvatarState('ready');
    };

    stt.onEnd = (): void => {
      setAvatarState((prev) => {
        if (prev === 'listening') {
          return 'ready';
        }
        return prev;
      });
    };

    stt.start();
    setAvatarState('listening');
    setCaption('Listening...');
    setIsCaptionVisible(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- handleSendInternal is stable

  /** FR37 — Stop avatar talking (barge-in). Stops TTS and returns to ready. */
  function handleStopTalking(): void {
    ttsRef.current?.stop();
    sttRef.current?.stop();
    setAvatarState('ready');
    window.electronAPI.cancelAgent();
  }

  function handleSendInternal(text: string): void {
    sttRef.current?.stop();
    ttsRef.current?.stop();

    setCaption(null);
    setIsCaptionVisible(false);
    setAvatarState('thinking');
    setInputValue('');
    // Hide option cards after first user message
    setOptionCards([]);

    window.electronAPI.sendAgentMessage(sessionId, text).catch(() => {
      setAvatarState('ready');
      setCaption('Something went wrong. Please try again.');
      setIsCaptionVisible(true);
    });
  }

  function handleSend(text: string): void {
    handleSendInternal(text);
  }

  /** FR18/FR19 — User clicks an option card to send that choice */
  function handleOptionCardClick(card: OptionCard): void {
    handleSendInternal(`Help me ${card.label.toLowerCase()}`);
  }

  function handleMicClick(): void {
    const stt = sttRef.current;
    if (stt === null) return;

    if (stt.isListening || liveMode) {
      stt.stop();
      setLiveMode(false);
      setAvatarState('ready');
      setCaption(null);
      setIsCaptionVisible(false);
      return;
    }

    setLiveMode(true);
    startListening();
  }

  const isTalkingOrThinking = avatarState === 'speaking' || avatarState === 'thinking';

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-between bg-stage-bg">
      {/* Center stage: avatar + status + caption */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <AvatarCanvas state={avatarState} />
        <StatusIndicator state={avatarState} />
        <CaptionBar text={caption} visible={isCaptionVisible} />

        {/* FR37 — Stop talking button (visible when avatar is speaking or thinking) */}
        {isTalkingOrThinking && (
          <button
            type="button"
            onClick={handleStopTalking}
            aria-label="Stop talking"
            className="rounded-lg border border-danger bg-danger/20 px-4 py-2 text-small font-medium text-danger transition-colors hover:bg-danger/40"
          >
            ⏹ Stop
          </button>
        )}

        {!sttSupported && (
          <p className="text-caption text-text-muted-on-dark">
            Voice input requires Chrome or Edge.
          </p>
        )}
        {liveMode && avatarState !== 'speaking' && avatarState !== 'thinking' && (
          <p className="animate-pulse text-caption text-primary">
            Live mode — speak naturally, click mic to stop
          </p>
        )}

        {/* FR18/FR19 — Option cards for guided interaction */}
        {optionCards.length > 0 && avatarState === 'ready' && (
          <div
            className="mt-4 flex flex-wrap justify-center gap-3"
            role="group"
            aria-label="Suggested actions"
          >
            {optionCards.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => {
                  handleOptionCardClick(card);
                }}
                className="flex w-[180px] flex-col gap-1 rounded-xl border border-text-muted-on-dark p-3 text-left transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-small font-semibold text-text-on-dark">{card.label}</span>
                <span className="text-caption text-text-muted-on-dark">{card.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: text input + mic */}
      <div className="w-full max-w-2xl pb-6">
        <TextInput
          avatarName={avatarName}
          onSend={handleSend}
          onMicClick={handleMicClick}
          isListening={avatarState === 'listening' || liveMode}
          value={inputValue}
          onValueChange={setInputValue}
        />
      </div>
    </div>
  );
}
