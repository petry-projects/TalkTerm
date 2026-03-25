/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks */
import { describe, it, expect, vi } from 'vitest';
import type { AgentEvent } from '../../shared/types/domain/agent-event';
import type { AuditRepository } from '../../shared/types/ports/audit-repository';
import { ClaudeSdkBackend } from './claude-sdk-backend';

function createMockAuditRepo(): AuditRepository {
  return {
    append: vi.fn(),
    findBySession: vi.fn().mockReturnValue([]),
    findByDateRange: vi.fn().mockReturnValue([]),
  };
}

async function collectEvents(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
  }
  return events;
}

describe('ClaudeSdkBackend', () => {
  it('yields error when no API key', async () => {
    const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => null);
    const events = await collectEvents(backend.startSession({ workspacePath: '/tmp', apiKey: '' }));
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('error');
  });

  it('yields demo mode text when SDK not installed', async () => {
    const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test');
    const events = await collectEvents(
      backend.startSession({ workspacePath: '/tmp', apiKey: 'sk-ant-test' }),
    );
    // SDK import will fail since it's not installed — should get demo mode events
    expect(events.length).toBeGreaterThanOrEqual(1);
    const hasText = events.some((e) => e.type === 'text');
    expect(hasText).toBe(true);
  });

  it('demo mode yields complete event after text', async () => {
    const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test');
    const events = await collectEvents(
      backend.startSession({ workspacePath: '/tmp', apiKey: 'sk-ant-test' }),
    );
    const lastEvent = events[events.length - 1];
    expect(lastEvent?.type).toBe('complete');
  });

  it('sends message and logs audit entry', async () => {
    const auditRepo = createMockAuditRepo();
    const backend = new ClaudeSdkBackend(auditRepo, () => 'sk-ant-test');
    const events = await collectEvents(backend.sendMessage('sess-1', 'hello'));
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(auditRepo.append).toHaveBeenCalled();
  });

  it('sendMessage yields text and complete events', async () => {
    const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test');
    const events = await collectEvents(backend.sendMessage('sess-1', 'hello'));
    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe('text');
    expect(events[1]?.type).toBe('complete');
  });

  it('can be cancelled without throwing', () => {
    const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test');
    expect(() => {
      backend.cancelCurrentAction();
    }).not.toThrow();
  });

  it('yields events from resumeSession', async () => {
    const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => 'sk-ant-test');
    const events = await collectEvents(backend.resumeSession('sess-1'));
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.type).toBe('text');
  });

  it('error event includes recovery options', async () => {
    const backend = new ClaudeSdkBackend(createMockAuditRepo(), () => null);
    const events = await collectEvents(backend.startSession({ workspacePath: '/tmp', apiKey: '' }));
    const errorEvent = events[0];
    expect(errorEvent?.type).toBe('error');
    if (errorEvent?.type === 'error') {
      expect(errorEvent.recoveryOptions).toHaveLength(1);
      expect(errorEvent.recoveryOptions[0]?.action).toBe('setup-key');
    }
  });
});
