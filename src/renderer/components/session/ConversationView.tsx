import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
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

/**
 * BMAD Analyst (Mary) demo responses.
 * Simulates the BMAD Analyst agent until the real Claude Agent SDK is wired.
 */
const ANALYST_RESPONSES: ReadonlyMap<string, string> = new Map([
  [
    'brainstorm',
    "I'd love to brainstorm with you! Let me help structure your ideas. What domain or problem space are we exploring? I'll help you generate options, evaluate them, and narrow down to the strongest candidates.",
  ],
  [
    'prd',
    "Great — let's create a Product Requirements Document. I'll guide you through the key sections: problem statement, target users, functional requirements, and success metrics. What product or feature are we defining?",
  ],
  [
    'research',
    "I can help with research! I'll look into market trends, competitive landscape, and domain specifics. What topic or industry should I focus on?",
  ],
  [
    'architecture',
    "Let's think through the architecture. I'll help you map out components, data flow, and integration points. What system are we designing?",
  ],
]);

function getAnalystResponse(userText: string): string {
  const lower = userText.toLowerCase();
  for (const [keyword, response] of ANALYST_RESPONSES) {
    if (lower.includes(keyword)) {
      return response;
    }
  }
  return `That's a great starting point! I'm Mary, your BMAD Analyst. I can help you brainstorm ideas, create product requirements, conduct research, or plan architecture. What would you like to explore? Just tell me naturally — for example, "help me brainstorm features for an onboarding flow" or "let's create a PRD for my app."`;
}

interface ConversationViewProps {
  userName: string;
  avatarName: string;
}

export function ConversationView({ userName, avatarName }: ConversationViewProps): ReactElement {
  const [avatarState, setAvatarState] = useState<AvatarAnimationState>('ready');
  const [caption, setCaption] = useState<string | null>(
    `Hey ${userName}! I'm Mary, your BMAD Analyst. What are you working on today?`,
  );
  const [isCaptionVisible, setIsCaptionVisible] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [sttSupported, setSttSupported] = useState(true);
  const [liveMode, setLiveMode] = useState(false);

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

  const startListening = useCallback((): void => {
    const stt = sttRef.current;
    if (stt === null) return;
    if (stt.isListening) return;

    stt.onResult = (result): void => {
      if (result.isFinal) {
        // Auto-send the final transcript
        const text = result.transcript.trim();
        if (text !== '') {
          setInputValue('');
          setCaption(null);
          setIsCaptionVisible(false);
          handleSendInternal(text);
        }
      } else {
        // Show interim results in caption
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
      // In live mode, auto-restart listening after TTS finishes
      // (don't restart during speaking — barge-in handles that)
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

  const speakResponse = useCallback(
    (text: string): void => {
      const tts = ttsRef.current;
      if (tts === null) return;

      setAvatarState('speaking');
      setCaption(text);
      setIsCaptionVisible(true);

      tts.onEnd = (): void => {
        setAvatarState('ready');
        // In live mode, auto-restart listening after avatar finishes speaking
        if (liveModeRef.current) {
          setTimeout(() => {
            startListening();
          }, 300);
        }
      };

      tts.speak(text, voiceRef.current);
    },
    [startListening],
  );

  function handleSendInternal(text: string): void {
    // Stop any ongoing STT/TTS
    sttRef.current?.stop();
    ttsRef.current?.stop();

    setCaption(null);
    setIsCaptionVisible(false);
    setAvatarState('thinking');
    setInputValue('');

    setTimeout(() => {
      const response = getAnalystResponse(text);
      speakResponse(response);
    }, 1500);
  }

  function handleSend(text: string): void {
    handleSendInternal(text);
  }

  function handleMicClick(): void {
    const stt = sttRef.current;
    if (stt === null) return;

    if (stt.isListening || liveMode) {
      // Stop live mode
      stt.stop();
      setLiveMode(false);
      setAvatarState('ready');
      setCaption(null);
      setIsCaptionVisible(false);
      return;
    }

    // Start live mode — continuous back-and-forth
    setLiveMode(true);
    startListening();
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-between bg-stage-bg">
      {/* Center stage: avatar + status + caption */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <AvatarCanvas state={avatarState} />
        <StatusIndicator state={avatarState} />
        <CaptionBar text={caption} visible={isCaptionVisible} />
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
