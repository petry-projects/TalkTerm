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

  // Setup phase — walk through setup steps
  if (phase === 'setup') {
    if (currentStep === 'needs-key') {
      return (
        <ApiKeySetup
          onValidated={() => {
            completeCurrentStep();
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

    if (currentStep === 'needs-avatar') {
      return (
        <AvatarSelection
          onSelect={() => {
            completeCurrentStep();
          }}
        />
      );
    }

    if (currentStep === 'needs-workspace') {
      return (
        <WorkspaceSelection
          onSelectFolder={() => {
            completeCurrentStep();
            setPhase('greeting');
          }}
          onSkip={() => {
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
          setPhase('conversation');
        }}
      />
    );
  }

  // Conversation phase — main interaction
  return (
    <ConversationView
      userName={userName || 'there'}
      avatarName="Mary"
    />
  );
}
