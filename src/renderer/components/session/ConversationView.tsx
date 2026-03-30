import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { AgentEvent } from '../../../shared/types/domain/agent-event';
import { parseQuestions, type QuestionSet } from '../../../shared/types/domain/question-parser';
import type { AvatarAnimationState } from '../../hooks/useAvatarState';
import { IpcSpeechStt } from '../../speech/ipc-speech-stt';
import { WebSpeechTts } from '../../speech/web-speech-tts';
import { AvatarCanvas } from '../avatar/AvatarCanvas';
import { CaptionBar } from '../avatar/CaptionBar';
import { StatusIndicator } from '../avatar/StatusIndicator';
import { TextInput } from '../avatar/TextInput';
import { QuestionCardStack } from './QuestionCardStack';

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
  const [activeQuestionSet, setActiveQuestionSet] = useState<QuestionSet | null>(null);

  const sttRef = useRef<IpcSpeechStt | null>(null);
  const ttsRef = useRef<WebSpeechTts | null>(null);
  const voiceRef = useRef<string | undefined>(undefined);
  const liveModeRef = useRef(false);
  /** Accumulates text events within a single agent turn for question detection */
  const pendingTextRef = useRef('');

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  // Initialize STT and TTS instances + select voice
  useEffect(() => {
    const stt = new IpcSpeechStt();
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
        case 'text': {
          // Accumulate text for multi-block question detection
          pendingTextRef.current =
            pendingTextRef.current !== ''
              ? `${pendingTextRef.current}\n${event.content}`
              : event.content;

          // FR57 — Try to detect structured questions in the accumulated text
          const parsed = parseQuestions(pendingTextRef.current);
          console.debug(
            '[ConversationView] text event received, length=',
            event.content.length,
            'accumulated=',
            pendingTextRef.current.length,
            'parsed=',
            parsed !== null ? `${String(parsed.questions.length)} questions` : 'null',
          );
          if (parsed !== null) {
            // Show question card stack instead of full text
            pendingTextRef.current = '';
            setActiveQuestionSet(parsed);
            setAvatarState(parsed.preamble !== '' ? 'speaking' : 'ready');
            setCaption(parsed.preamble !== '' ? parsed.preamble : null);
            setIsCaptionVisible(parsed.preamble !== '');
            // Speak only the preamble
            if (ttsRef.current !== null && parsed.preamble !== '') {
              ttsRef.current.onEnd = (): void => {
                setAvatarState('ready');
              };
              ttsRef.current.speak(parsed.preamble, voiceRef.current);
            }
          } else {
            // No structured questions (yet) — standard text display
            setAvatarState('speaking');
            setCaption(event.content);
            setIsCaptionVisible(true);
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
          }
          break;
        }
        case 'tool-call':
          setAvatarState('thinking');
          setCaption(`Using ${event.toolName}...`);
          setIsCaptionVisible(true);
          break;
        case 'tool-result':
          setCaption(event.success ? `${event.toolName} completed` : `${event.toolName} failed`);
          break;
        case 'error':
          pendingTextRef.current = '';
          setAvatarState('ready');
          setCaption(event.userMessage);
          setIsCaptionVisible(true);
          break;
        case 'complete':
          pendingTextRef.current = '';
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
      if (
        error.message.includes('not supported') ||
        error.message.includes('Failed to initialize')
      ) {
        setSttSupported(false);
        setCaption('Speech recognition is not available. Please check the logs for details.');
      } else if (error.message.includes('Microphone')) {
        setCaption('Microphone access failed. Please check your system permissions.');
      } else {
        setCaption('Could not hear you clearly. Please try again.');
      }
      setLiveMode(false);
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
    pendingTextRef.current = '';

    setCaption(null);
    setIsCaptionVisible(false);
    setAvatarState('thinking');
    setInputValue('');

    window.electronAPI.sendAgentMessage(sessionId, text).catch(() => {
      setAvatarState('ready');
      setCaption('Something went wrong. Please try again.');
      setIsCaptionVisible(true);
    });
  }

  function handleSend(text: string): void {
    handleSendInternal(text);
  }

  /** FR59 — Submit aggregated answers from question card stack */
  function handleQuestionSubmit(aggregatedMessage: string): void {
    setActiveQuestionSet(null);
    handleSendInternal(aggregatedMessage);
  }

  /** Dismiss question card stack without submitting */
  function handleQuestionDismiss(): void {
    setActiveQuestionSet(null);
  }

  function handleMicClick(): void {
    if (!sttSupported) {
      setCaption('Speech recognition is not available. Check logs for details.');
      setIsCaptionVisible(true);
      return;
    }

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
    <div className="flex h-screen w-screen bg-stage-bg">
      {/* Center stage */}
      <div className="flex flex-1 flex-col items-center justify-between">
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
            <p className="text-small text-danger">
              Speech recognition unavailable — check DevTools console for details
            </p>
          )}
          {liveMode && avatarState !== 'speaking' && avatarState !== 'thinking' && (
            <p className="animate-pulse text-caption text-primary">
              Live mode — speak naturally, click mic to stop
            </p>
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

      {/* FR57-59 — Question Card Stack (right panel) */}
      {activeQuestionSet !== null && (
        <div className="h-full w-[380px] shrink-0 border-l border-stage-bg">
          <QuestionCardStack
            questionSet={activeQuestionSet}
            avatarName={avatarName}
            onSubmit={handleQuestionSubmit}
            onDismiss={handleQuestionDismiss}
          />
        </div>
      )}
    </div>
  );
}
