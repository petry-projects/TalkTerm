import { useState, type ReactElement } from 'react';

interface ApiKeySetupProps {
  onValidated: (key: string) => void;
  initialState?: 'empty' | 'expired';
}

export function ApiKeySetup({ onValidated, initialState }: ApiKeySetupProps): ReactElement {
  const [key, setKey] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState(
    initialState === 'expired'
      ? 'Your API key has expired or been revoked. Please enter a new one.'
      : null,
  );

  function handleContinue(): void {
    if (isValid) {
      onValidated(key);
    }
  }

  async function handleValidate(): Promise<void> {
    if (key.trim() === '') return;
    setIsValidating(true);
    setError(null);
    // Validation will be wired to IPC in a later story
    // For now, accept keys starting with sk-ant
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (key.startsWith('sk-ant')) {
      setIsValid(true);
      setError(null);
    } else {
      setIsValid(false);
      setError("That key didn't work — check for typos");
    }
    setIsValidating(false);
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-surface-muted/80 p-10">
        <h1 className="text-center text-display text-text-on-dark">Get Started</h1>

        <p className="text-center text-body text-text-muted-on-dark">
          Enter your Anthropic API key to connect TalkTerm to Claude.
        </p>

        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setIsValid(false);
              setError(null);
            }}
            onBlur={() => {
              void handleValidate();
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

        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-small text-primary hover:underline"
        >
          How do I get an API key?
        </a>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValid || isValidating}
          className="w-full rounded-lg bg-primary py-3 text-body font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? 'Validating...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
