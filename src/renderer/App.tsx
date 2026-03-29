import { useState, type ReactElement } from 'react';
import { ConversationView } from './components/session/ConversationView';
import { SessionGreeting } from './components/session/SessionGreeting';
import { ApiKeySetup } from './components/setup/ApiKeySetup';
import { AvatarSelection } from './components/setup/AvatarSelection';
import { ProfileSetup } from './components/setup/ProfileSetup';
import { WorkspaceSelection } from './components/setup/WorkspaceSelection';
import { useSetupRouter } from './hooks/useSetupRouter';

type AppPhase = 'setup' | 'greeting' | 'conversation';

export function App(): ReactElement {
  const { currentStep, completeCurrentStep } = useSetupRouter('needs-key');
  const [userName, setUserName] = useState('');
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState('');

  async function startNewSession(): Promise<void> {
    try {
      const id = await window.electronAPI.startSession(workspacePath || '/tmp');
      setSessionId(id);
      setPhase('conversation');
    } catch {
      // If session start fails, still enter conversation with a fallback ID
      setSessionId(crypto.randomUUID());
      setPhase('conversation');
    }
  }

  // Setup phase — walk through setup steps
  if (phase === 'setup') {
    if (currentStep === 'needs-key') {
      return (
        <ApiKeySetup
          onValidated={(key: string) => {
            void Promise.all([
              window.electronAPI.storeApiKey(key),
              window.electronAPI.setAuthMode('api-key'),
            ]).then(() => {
              completeCurrentStep();
            });
          }}
          onSubscriptionSelected={() => {
            void window.electronAPI.setAuthMode('claude-subscription').then(() => {
              completeCurrentStep();
            });
          }}
        />
      );
    }

    if (currentStep === 'needs-profile') {
      return (
        <ProfileSetup
          onComplete={(name: string) => {
            setUserName(name);
            completeCurrentStep();
          }}
        />
      );
    }

    if (currentStep === 'needs-workspace') {
      return (
        <WorkspaceSelection
          onSelectFolder={(path: string) => {
            setWorkspacePath(path);
            completeCurrentStep();
          }}
          onSkip={() => {
            completeCurrentStep();
          }}
        />
      );
    }

    if (currentStep === 'needs-avatar') {
      return (
        <AvatarSelection
          onSelect={() => {
            completeCurrentStep();
            setPhase('greeting');
          }}
        />
      );
    }

    // ready step — transition to greeting
    setPhase('greeting');
  }

  // Greeting phase — brief welcome, then conversation
  if (phase === 'greeting') {
    return (
      <SessionGreeting
        userName={userName || 'there'}
        incompleteSessions={[]}
        onResume={() => {}}
        onStartNew={() => {
          void startNewSession();
        }}
      />
    );
  }

  // Conversation phase — main interaction
  return (
    <ConversationView
      userName={userName || 'there'}
      avatarName="Mary"
      sessionId={sessionId ?? ''}
    />
  );
}
