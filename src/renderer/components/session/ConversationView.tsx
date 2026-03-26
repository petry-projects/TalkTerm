import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import type { AvatarAnimationState } from '../../hooks/useAvatarState';
import { WebSpeechStt } from '../../speech/web-speech-stt';
import { WebSpeechTts } from '../../speech/web-speech-tts';
import { AvatarCanvas } from '../avatar/AvatarCanvas';
import { CaptionBar } from '../avatar/CaptionBar';
import { StatusIndicator } from '../avatar/StatusIndicator';
import { TextInput } from '../avatar/TextInput';

const DEMO_RESPONSES: readonly string[] = [
  "I'd love to help with that! In the full version, I'll be able to work with your codebase directly. For now, try asking me about project planning or brainstorming.",
  "Great question! When the agent backend is connected, I'll be able to read your files, run commands, and help you build. What are you thinking about?",
  "That's an interesting idea. Once I'm fully connected, I can help you implement it step by step. Want to talk through the approach?",
  "I'm excited to help! The full agent integration will let me write code, run tests, and debug issues. For now, I can chat about your ideas.",
];

interface ConversationViewProps {
  userName: string;
  avatarName: string;
}

export function ConversationView({ userName, avatarName }: ConversationViewProps): ReactElement {
  const [avatarState, setAvatarState] = useState<AvatarAnimationState>('ready');
  const [caption, setCaption] = useState<string | null>(
    `Hey ${userName}! What are you working on today?`,
  );
  const [isCaptionVisible, setIsCaptionVisible] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [sttSupported, setSttSupported] = useState(true);

  const sttRef = useRef<WebSpeechStt | null>(null);
  const ttsRef = useRef<WebSpeechTts | null>(null);
  const responseIndexRef = useRef(0);

  // Initialize STT and TTS instances
  useEffect(() => {
    const stt = new WebSpeechStt();
    const tts = new WebSpeechTts();
    sttRef.current = stt;
    ttsRef.current = tts;

    return () => {
      stt.stop();
      tts.stop();
    };
  }, []);

  const speakResponse = useCallback((text: string): void => {
    const tts = ttsRef.current;
    if (tts === null) return;

    setAvatarState('speaking');
    setCaption(text);
    setIsCaptionVisible(true);

    tts.onEnd = (): void => {
      setAvatarState('ready');
    };

    tts.speak(text);
  }, []);

  const getNextDemoResponse = useCallback((): string => {
    const index = responseIndexRef.current % DEMO_RESPONSES.length;
    responseIndexRef.current = responseIndexRef.current + 1;
    return DEMO_RESPONSES[index] ?? DEMO_RESPONSES[0] ?? '';
  }, []);

  function handleSend(_text: string): void {
    // Stop any ongoing STT
    sttRef.current?.stop();

    setCaption(null);
    setIsCaptionVisible(false);
    setAvatarState('thinking');
    setInputValue('');

    setTimeout(() => {
      const response = getNextDemoResponse();
      speakResponse(response);
    }, 1500);
  }

  function handleMicClick(): void {
    const stt = sttRef.current;
    if (stt === null) return;

    if (stt.isListening) {
      // Stop listening
      stt.stop();
      setAvatarState('ready');
      return;
    }

    // Start listening
    stt.onResult = (result): void => {
      if (result.isFinal) {
        setInputValue(result.transcript);
        setCaption(null);
        setIsCaptionVisible(false);
        setAvatarState('ready');
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
      setAvatarState((prev) => (prev === 'listening' ? 'ready' : prev));
    };

    stt.start();
    setAvatarState('listening');
    setCaption('Listening...');
    setIsCaptionVisible(true);
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
      </div>

      {/* Bottom: text input + mic */}
      <div className="w-full max-w-2xl pb-6">
        <TextInput
          avatarName={avatarName}
          onSend={handleSend}
          onMicClick={handleMicClick}
          isListening={avatarState === 'listening'}
          value={inputValue}
          onValueChange={setInputValue}
        />
      </div>
    </div>
  );
}
