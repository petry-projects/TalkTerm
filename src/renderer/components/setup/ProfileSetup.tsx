import { useState, type ReactElement } from 'react';

interface ProfileSetupProps {
  onComplete: (name: string) => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps): ReactElement {
  const [name, setName] = useState('');

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-surface-muted/80 p-10">
        <h1 className="text-center text-display text-text-on-dark">What should I call you?</h1>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder="Your name"
          className="w-full rounded-lg border border-text-muted-on-dark bg-stage-bg px-4 py-3 text-body text-text-on-dark outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => {
            onComplete(name);
          }}
          disabled={name.trim() === ''}
          className="w-full rounded-lg bg-primary py-3 text-body font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
