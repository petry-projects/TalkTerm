import { useEffect, useRef, type ReactElement } from 'react';
import type { AvatarAnimationState } from '../../hooks/useAvatarState';

interface AvatarCanvasProps {
  state: AvatarAnimationState;
  riveAssetPath?: string;
}

/**
 * AvatarCanvas renders the Rive animated avatar character.
 *
 * When the .riv asset is available, it uses @rive-app/react-webgl2 to render
 * the state machine with inputs: isListening, isThinking, isSpeaking.
 *
 * Fallback: renders a simple CSS-animated placeholder avatar.
 */
export function AvatarCanvas({ state, riveAssetPath }: AvatarCanvasProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // When Rive asset is available, initialize the state machine here.
    // For now, the placeholder renders based on state prop.
    if (riveAssetPath !== undefined && canvasRef.current !== null) {
      // Future: new Rive({ canvas: canvasRef.current, src: riveAssetPath, ... })
    }
  }, [riveAssetPath]);

  // Placeholder avatar — will be replaced by Rive canvas
  const stateColors: Record<AvatarAnimationState, string> = {
    ready: 'bg-primary/20',
    listening: 'bg-primary/60',
    thinking: 'bg-primary/40',
    'deep-thinking': 'bg-indigo-500/40',
    speaking: 'bg-primary-light/60',
    error: 'bg-danger/40',
  };

  const stateAnimations: Record<AvatarAnimationState, string> = {
    ready: '',
    listening: 'animate-pulse',
    thinking: 'animate-bounce',
    'deep-thinking': 'animate-pulse',
    speaking: 'animate-pulse',
    error: '',
  };

  if (riveAssetPath !== undefined) {
    return (
      <canvas
        ref={canvasRef}
        data-testid="avatar-canvas"
        className="h-[300px] w-[300px]"
        aria-label={`Avatar is ${state}`}
      />
    );
  }

  return (
    <div
      data-testid="avatar-placeholder"
      aria-label={`Avatar is ${state}`}
      className={`flex h-[250px] w-[250px] items-center justify-center rounded-full shadow-[0_0_40px_rgba(99,102,241,0.3)] ring-2 ring-primary/30 ${stateColors[state]} ${stateAnimations[state]} transition-all duration-300`}
    >
      <span className="text-[80px]">
        {state === 'ready'
          ? '😊'
          : state === 'listening'
            ? '👂'
            : state === 'thinking'
              ? '🤔'
              : state === 'deep-thinking'
                ? '🧠'
                : '🗣️'}
      </span>
    </div>
  );
}
