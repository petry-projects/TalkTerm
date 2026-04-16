import { useEffect, useState, type ReactElement } from 'react';
import { ConversationView } from './components/session/ConversationView';
import { SessionGreeting } from './components/session/SessionGreeting';
import { AdminBlockScreen } from './components/setup/AdminBlockScreen';
import { ApiKeySetup } from './components/setup/ApiKeySetup';
import { AvatarSelection } from './components/setup/AvatarSelection';
import { ProfileSetup } from './components/setup/ProfileSetup';
import { WorkspaceSelection } from './components/setup/WorkspaceSelection';
import { useSetupRouter } from './hooks/useSetupRouter';

type AppPhase = 'admin-check' | 'setup' | 'greeting' | 'conversation';

interface AdminCheckResult {
  isAdmin: boolean;
  platform: string;
  instructions?: string;
}

export function App(): ReactElement {
  const { currentStep, goToStep, completeCurrentStep } = useSetupRouter('needs-key');
  const [userName, setUserName] = useState('');
  const [phase, setPhase] = useState<AppPhase>('admin-check');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [workspacePath, setWorkspacePath] = useState('');
  const [adminResult, setAdminResult] = useState<AdminCheckResult | null>(null);
  const [incompleteSessions, setIncompleteSessions] = useState<
    Array<{ id: string; workspacePath: string; updatedAt: string }>
  >([]);

  // Listen for admin check result from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.onAdminCheckResult((result: AdminCheckResult) => {
      setAdminResult(result);
      if (result.isAdmin) {
        setPhase('setup');
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

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

  // Admin check phase — block until admin privileges confirmed
  if (phase === 'admin-check') {
    if (adminResult === null) {
      // Waiting for admin check result from main process
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
          <p className="text-body text-text-muted-on-dark">Checking permissions...</p>
        </div>
      );
    }
    if (!adminResult.isAdmin) {
      return (
        <AdminBlockScreen
          platform={adminResult.platform}
          instructions={adminResult.instructions ?? ''}
          onRetry={() => {
            void window.electronAPI.retryAdminCheck().then((result: AdminCheckResult) => {
              setAdminResult(result);
              if (result.isAdmin) {
                setPhase('setup');
              }
            });
          }}
          onQuit={() => {
            window.electronAPI.quitApp();
          }}
        />
      );
    }
    // Admin check passed — proceed to setup
    setPhase('setup');
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
            ])
              .then(() => {
                completeCurrentStep();
              })
              .catch(() => {
                // Setup IPC failure — proceed anyway; key is validated client-side
              });
          }}
          onSubscriptionSelected={() => {
            void window.electronAPI
              .setAuthMode('claude-subscription')
              .then(() => {
                completeCurrentStep();
              })
              .catch(() => {
                // Auth mode IPC failure — proceed; mode is best-effort
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
            void window.electronAPI
              .setProfile(name)
              .then(() => {
                completeCurrentStep();
              })
              .catch(() => {
                // Profile IPC failure — proceed; name is set in local state
              });
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

  // Greeting phase — fetch incomplete sessions, then show greeting
  if (phase === 'greeting') {
    // Fetch incomplete sessions on first render of greeting phase
    // Only query when a real workspace was selected — skip if empty/fallback
    if (incompleteSessions.length === 0 && workspacePath !== '') {
      void window.electronAPI
        .getIncompleteSessions(workspacePath)
        .then((sessions) => {
          if (sessions.length > 0) {
            setIncompleteSessions(
              sessions.map((s) => ({
                id: s.id,
                workspacePath: s.workspacePath,
                updatedAt: s.updatedAt,
              })),
            );
          }
        })
        .catch(() => {
          // Failed to fetch — proceed without resume options
        });
    }
    return (
      <SessionGreeting
        userName={userName || 'there'}
        incompleteSessions={incompleteSessions}
        onResume={(sessionIdToResume: string) => {
          void window.electronAPI
            .resumeSession(sessionIdToResume)
            .then(() => {
              setSessionId(sessionIdToResume);
              setPhase('conversation');
            })
            .catch(() => {
              // Resume failed — fall through to start new session
            });
        }}
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
      onSetupKey={() => {
        goToStep('needs-key');
        setPhase('setup');
      }}
    />
  );
}
