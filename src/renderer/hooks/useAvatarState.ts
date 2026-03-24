import { useReducer, useCallback } from 'react';

export type AvatarAnimationState = 'ready' | 'listening' | 'thinking' | 'speaking';

interface AvatarState {
  animationState: AvatarAnimationState;
}

type AvatarAction =
  | { type: 'avatar:set-ready' }
  | { type: 'avatar:set-listening' }
  | { type: 'avatar:set-thinking' }
  | { type: 'avatar:set-speaking' };

function avatarReducer(_state: AvatarState, action: AvatarAction): AvatarState {
  switch (action.type) {
    case 'avatar:set-ready':
      return { animationState: 'ready' };
    case 'avatar:set-listening':
      return { animationState: 'listening' };
    case 'avatar:set-thinking':
      return { animationState: 'thinking' };
    case 'avatar:set-speaking':
      return { animationState: 'speaking' };
  }
}

export interface UseAvatarStateReturn {
  animationState: AvatarAnimationState;
  setReady: () => void;
  setListening: () => void;
  setThinking: () => void;
  setSpeaking: () => void;
}

export function useAvatarState(): UseAvatarStateReturn {
  const [state, dispatch] = useReducer(avatarReducer, { animationState: 'ready' });

  return {
    animationState: state.animationState,
    setReady: useCallback(() => {
      dispatch({ type: 'avatar:set-ready' });
    }, []),
    setListening: useCallback(() => {
      dispatch({ type: 'avatar:set-listening' });
    }, []),
    setThinking: useCallback(() => {
      dispatch({ type: 'avatar:set-thinking' });
    }, []),
    setSpeaking: useCallback(() => {
      dispatch({ type: 'avatar:set-speaking' });
    }, []),
  };
}
