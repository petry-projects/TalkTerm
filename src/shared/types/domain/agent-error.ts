export type ErrorCategory =
  | 'network-error'
  | 'auth-error'
  | 'rate-limit'
  | 'file-permission'
  | 'sdk-error'
  | 'stt-error'
  | 'tts-error'
  | 'unknown';

export interface AgentError {
  category: ErrorCategory;
  userMessage: string;
  recoveryOptions: RecoveryOption[];
  isRecoverable: boolean;
}

export interface RecoveryOption {
  label: string;
  action: string;
  description: string;
}

export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused'))
      return 'network-error';
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key'))
      return 'auth-error';
    if (msg.includes('429') || msg.includes('rate limit')) return 'rate-limit';
    if (msg.includes('permission') || msg.includes('eacces')) return 'file-permission';
    if (msg.includes('speech') || msg.includes('recognition')) return 'stt-error';
    if (msg.includes('synthesis') || msg.includes('tts')) return 'tts-error';
    if (msg.includes('sdk') || msg.includes('agent')) return 'sdk-error';
  }
  return 'unknown';
}

export function createUserFriendlyMessage(category: ErrorCategory): string {
  switch (category) {
    case 'network-error':
      return "I'm having trouble reaching the service. Let me try again in a moment.";
    case 'auth-error':
      return "There's an issue with your API key. Let's get that sorted out.";
    case 'rate-limit':
      return "The service is busy right now. I'll retry in a few seconds.";
    case 'file-permission':
      return "I don't have permission to access that file. Let's find another way.";
    case 'sdk-error':
      return 'Something unexpected happened. Let me try a different approach.';
    case 'stt-error':
      return 'I had trouble hearing you. Could you try again?';
    case 'tts-error':
      return 'I had trouble speaking. Let me try to show you instead.';
    case 'unknown':
      return 'Something went wrong, but we can work through it.';
  }
}
