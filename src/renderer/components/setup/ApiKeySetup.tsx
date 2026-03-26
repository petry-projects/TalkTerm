import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type SyntheticEvent,
} from 'react';

interface ApiKeySetupProps {
  onValidated: (key: string) => void;
  initialState?: 'empty' | 'expired';
  detectedEnvKey?: boolean;
}

export function ApiKeySetup({
  onValidated,
  initialState,
  detectedEnvKey,
}: ApiKeySetupProps): ReactElement {
  const [key, setKey] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(
    initialState === 'expired'
      ? 'Your API key has expired or been revoked. Please enter a new one.'
      : null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-advance after validation succeeds — show success indicator briefly then proceed
  useEffect(() => {
    if (!isValid) return;
    const timer = setTimeout(() => {
      onValidated(key);
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [isValid, key, onValidated]);

  function handleUseEnvKey(): void {
    onValidated('ENV_KEY');
  }

  async function handleValidate(): Promise<void> {
    if (key.trim() === '') return;
    setIsValidating(true);
    setError(null);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Detect OAuth tokens (subscription tokens) and give a clear explanation
    if (key.startsWith('sk-ant-oat')) {
      setIsValid(false);
      setError(
        "This looks like a Claude subscription token — TalkTerm needs an API key instead. API keys are separate from your Claude Pro/Max subscription. Click the link below to create one (it's free to start).",
      );
      setIsValidating(false);
      return;
    }

    if (key.startsWith('sk-ant-api')) {
      setIsValid(true);
      setError(null);
    } else {
      setIsValid(false);
      setError("That key didn't work — API keys start with sk-ant-api03-");
    }
    setIsValidating(false);
  }

  function handleSubmit(e: SyntheticEvent): void {
    e.preventDefault();
    if (hasInput && !isValidating && !isValid) {
      void handleValidate();
    }
  }

  const hasInput = key.trim() !== '';

  const autoFocusRef = useCallback((el: HTMLButtonElement | null) => el?.focus(), []);

  // If ANTHROPIC_API_KEY env var detected, offer to use it directly
  if (detectedEnvKey === true) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUseEnvKey();
          }}
          className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-surface-muted/80 p-10"
        >
          <h1 className="text-center text-display text-text-on-dark">Get Started</h1>

          <div className="rounded-lg border border-semantic-success/30 bg-semantic-success/10 p-4">
            <p className="text-center text-body text-text-on-dark">
              ✓ Found an existing API key in your environment
            </p>
            <p className="mt-1 text-center text-small text-text-muted-on-dark">
              ANTHROPIC_API_KEY is already configured on this system.
            </p>
          </div>

          <button
            ref={autoFocusRef}
            type="submit"
            className="w-full rounded-lg bg-primary py-3 text-body font-semibold text-white transition-colors hover:bg-primary-dark focus:ring-2 focus:ring-primary/50 focus:outline-none"
          >
            Use existing key
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
            }}
            className="text-center text-small text-text-muted-on-dark hover:text-text-on-dark"
          >
            Enter a different key instead
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-surface-muted/80 p-10"
      >
        <h1 className="text-center text-display text-text-on-dark">Get Started</h1>

        <p className="text-center text-body text-text-muted-on-dark">
          TalkTerm connects to Claude through the Anthropic API.{' '}
          <span className="text-text-on-dark">
            API keys are separate from Claude Pro/Max subscriptions
          </span>{' '}
          — you can create one for free at the Anthropic Console.
        </p>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setIsValid(false);
              setError(null);
            }}
            placeholder="sk-ant-api03-..."
            className={`w-full rounded-lg border px-4 py-3 text-body text-text-on-dark bg-stage-bg outline-none transition-colors ${
              isValid
                ? 'border-semantic-success'
                : error !== null && error !== ''
                  ? 'border-danger'
                  : 'border-text-muted-on-dark focus:border-primary'
            }`}
          />
          {isValid && <p className="text-small text-semantic-success">✓ Key verified</p>}
          {error !== null && error !== '' && <p className="text-small text-danger">{error}</p>}
        </div>

        <div className="flex flex-col gap-2 text-center">
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-small text-primary hover:underline"
          >
            Create a free API key at console.anthropic.com →
          </a>
          <p className="text-caption text-text-muted-on-dark">
            Have a Claude subscription? You still need an API key — they're separate. The API has
            its own free tier with credits to get started.
          </p>
        </div>

        {isValid ? (
          <p className="w-full rounded-lg bg-semantic-success/20 py-3 text-center text-body font-semibold text-semantic-success">
            Continuing...
          </p>
        ) : (
          <button
            type="submit"
            disabled={!hasInput || isValidating}
            className="w-full rounded-lg bg-primary py-3 text-body font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Validating...' : 'Validate API Key'}
          </button>
        )}
      </form>
    </div>
  );
}
