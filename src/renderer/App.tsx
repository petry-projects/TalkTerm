import type { ReactElement } from 'react';
import { ApiKeySetup } from './components/setup/ApiKeySetup';
import { AvatarSelection } from './components/setup/AvatarSelection';
import { ProfileSetup } from './components/setup/ProfileSetup';
import { WorkspaceSelection } from './components/setup/WorkspaceSelection';
import { useSetupRouter } from './hooks/useSetupRouter';

export function App(): ReactElement {
  const { currentStep, completeCurrentStep } = useSetupRouter('needs-key');

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
        onComplete={() => {
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
        }}
        onSkip={() => {
          completeCurrentStep();
        }}
      />
    );
  }

  // ready state — main conversation view
  return (
    <div className="flex h-screen w-screen flex-col bg-stage-bg">
      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-display text-text-on-dark">TalkTerm</h1>
      </div>
    </div>
  );
}
