import { useState, type ReactElement } from 'react';
import type { AvatarAnimationState } from '../../hooks/useAvatarState';
import { AvatarCanvas } from '../avatar/AvatarCanvas';
import { CaptionBar } from '../avatar/CaptionBar';
import { StatusIndicator } from '../avatar/StatusIndicator';
import { TextInput } from '../avatar/TextInput';

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

  function handleSend(text: string): void {
    // Simulate avatar thinking then responding
    setCaption(null);
    setIsCaptionVisible(false);
    setAvatarState('thinking');

    setTimeout(() => {
      setAvatarState('speaking');
      setCaption(`I heard you say: "${text}". Agent integration coming soon!`);
      setIsCaptionVisible(true);

      setTimeout(() => {
        setAvatarState('ready');
      }, 3000);
    }, 1500);
  }

  function handleMicClick(): void {
    // Voice input toggle — placeholder for now
    setAvatarState((prev) => (prev === 'listening' ? 'ready' : 'listening'));
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-between bg-stage-bg">
      {/* Center stage: avatar + status + caption */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <AvatarCanvas state={avatarState} />
        <StatusIndicator state={avatarState} />
        <CaptionBar text={caption} visible={isCaptionVisible} />
      </div>

      {/* Bottom: text input + mic */}
      <div className="w-full max-w-2xl pb-6">
        <TextInput
          avatarName={avatarName}
          onSend={handleSend}
          onMicClick={handleMicClick}
          isListening={avatarState === 'listening'}
        />
      </div>
    </div>
  );
}
