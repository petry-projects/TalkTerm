import type { ReactElement } from 'react';

export function App(): ReactElement {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-stage-bg">
      <h1 className="text-display text-text-on-dark">TalkTerm</h1>
    </div>
  );
}
