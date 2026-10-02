import { fileActivityMessage, toActivity, versionActivityMessage } from './activity';

describe('toActivity', () => {
  it('keeps an academic event and drops technical fields', () => {
    const occurred = new Date('2026-09-28T12:00:00.000Z');
    expect(toActivity({ action: 'thesis.create', createdAt: occurred })).toEqual({
      type: 'THESIS_CREATED',
      occurredAt: '2026-09-28T12:00:00.000Z',
    });
  });

  it('ignores security events and unknown actions', () => {
    const occurred = new Date('2026-09-28T12:00:00.000Z');
    expect(toActivity({ action: 'auth.login', createdAt: occurred })).toBeNull();
    expect(toActivity({ action: 'auth.password_reset', createdAt: occurred })).toBeNull();
    expect(toActivity({ action: 'task.completed', createdAt: occurred })?.type).toBe(
      'TASK_COMPLETED',
    );
    expect(toActivity({ action: 'objective.completion_approved', createdAt: occurred })?.type).toBe(
      'OBJECTIVE_COMPLETION_APPROVED',
    );
    expect(toActivity({ action: 'deliverable.created', createdAt: occurred })?.type).toBe(
      'DELIVERABLE_CREATED',
    );
    expect(toActivity({ action: 'deliverable.version_created', createdAt: occurred })?.type).toBe(
      'DELIVERABLE_VERSION_CREATED',
    );
    expect(toActivity({ action: 'deliverable.submitted', createdAt: occurred })?.type).toBe(
      'DELIVERABLE_SUBMITTED',
    );
    expect(toActivity({ action: 'deliverable.changes_requested', createdAt: occurred })?.type).toBe(
      'DELIVERABLE_CHANGES_REQUESTED',
    );
    expect(toActivity({ action: 'deliverable.validated', createdAt: occurred })?.type).toBe(
      'DELIVERABLE_VALIDATED',
    );
    expect(toActivity({ action: 'remark.created', createdAt: occurred })?.type).toBe(
      'REMARK_CREATED',
    );
    expect(toActivity({ action: 'remark.closed', createdAt: occurred })?.type).toBe(
      'REMARK_CLOSED',
    );
  });

  it('describes a new version without technical identifiers', () => {
    const occurred = new Date('2026-09-28T12:00:00.000Z');
    const message = versionActivityMessage(2, 'Chapitre 2 — État de l’art');
    expect(message).toBe('Nouvelle version V2 ajoutée à « Chapitre 2 — État de l’art »');
    expect(message).not.toContain('requestId');
    expect(fileActivityMessage(2, 'Chapitre 2')).toBe(
      'Un fichier a été ajouté à la version V2 de « Chapitre 2 ».',
    );
    expect(toActivity({ action: 'deliverable.file_uploaded', createdAt: occurred })?.type).toBe(
      'DELIVERABLE_FILE_UPLOADED',
    );
  });
});
