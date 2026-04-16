export type ErrorCategory =
  | 'network-error'
  | 'auth-error'
  | 'billing-error'
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
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const msg = raw.toLowerCase();
  if (msg === '') return 'unknown';

  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket hang up') ||
    msg.includes('timeout')
  )
    return 'network-error';
  if (
    msg.includes('401') ||
    msg.includes('unauthorized') ||
    msg.includes('api key') ||
    msg.includes('invalid_api_key') ||
    msg.includes('authentication')
  )
    return 'auth-error';
  if (
    msg.includes('credit') ||
    msg.includes('balance') ||
    msg.includes('billing') ||
    msg.includes('insufficient') ||
    msg.includes('payment')
  )
    return 'billing-error';
  if (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('overloaded') ||
    msg.includes('capacity')
  )
    return 'rate-limit';
  if (msg.includes('permission') || msg.includes('eacces')) return 'file-permission';
  if (msg.includes('synthesis') || msg.includes('voice') || msg.includes('speak'))
    return 'tts-error';
  if (
    msg.includes('recognition') ||
    msg.includes('speech') ||
    msg.includes('microphone') ||
    msg.includes('listen')
  )
    return 'stt-error';
  if (msg.includes('sdk') || msg.includes('agent')) return 'sdk-error';

  return 'unknown';
}

export function recoveryOptionsForCategory(category: ErrorCategory): RecoveryOption[] {
  switch (category) {
    case 'auth-error':
      return [
        { label: 'Re-enter API key', action: 'setup-key', description: 'Update your API key' },
        { label: 'Try again', action: 'retry', description: 'Retry with current key' },
      ];
    case 'billing-error':
      return [{ label: 'Try again', action: 'retry', description: 'Retry after adding credits' }];
    case 'rate-limit':
      return [{ label: 'Try again', action: 'retry', description: 'Retry after a moment' }];
    case 'network-error':
      return [
        { label: 'Try again', action: 'retry', description: 'Retry when connection is restored' },
      ];
    default:
      return [{ label: 'Try again', action: 'retry', description: 'Retry the last action' }];
  }
}

export function createUserFriendlyMessage(category: ErrorCategory): string {
  switch (category) {
    case 'network-error':
      return "I'm having trouble reaching the service. Let me try again in a moment.";
    case 'auth-error':
      return "There's an issue with your API key. Let's get that sorted out.";
    case 'billing-error':
      return 'Your API account needs credits. Please add credits at console.anthropic.com to continue.';
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
