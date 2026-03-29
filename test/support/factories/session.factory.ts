import type { Session, SessionStatus } from '../../../src/shared/types/domain/session';
import type { AuditEntry } from '../../../src/shared/types/domain/audit-entry';

let counter = 0;

function nextId(): string {
  counter += 1;
  return `test-${counter.toString().padStart(4, '0')}`;
}

export function buildSession(overrides?: Partial<Session>): Session {
  const now = new Date().toISOString();
  return {
    id: nextId(),
    sdkSessionId: null,
    workspacePath: `/tmp/test-project-${nextId()}`,
    status: 'active' as SessionStatus,
    avatarPersonaId: 'mary',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildAuditEntry(overrides?: Partial<AuditEntry>): AuditEntry {
  return {
    sessionId: nextId(),
    timestamp: new Date().toISOString(),
    actionType: 'tool:bash',
    outcome: 'success',
    userIntent: 'Test action',
    details: {},
    ...overrides,
  };
}

export function buildSessionRow(
  overrides?: Partial<{
    id: string;
    sdk_session_id: string | null;
    workspace_path: string;
    status: string;
    avatar_persona_id: string;
    created_at: string;
    updated_at: string;
  }>,
): {
  id: string;
  sdk_session_id: string | null;
  workspace_path: string;
  status: string;
  avatar_persona_id: string;
  created_at: string;
  updated_at: string;
} {
  const now = new Date().toISOString();
  return {
    id: nextId(),
    sdk_session_id: null,
    workspace_path: `/tmp/test-project-${nextId()}`,
    status: 'active',
    avatar_persona_id: 'mary',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}
