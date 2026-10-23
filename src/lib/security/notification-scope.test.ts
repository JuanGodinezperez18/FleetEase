import { hasCompanyScopedRecipients } from './notification-scope';

describe('hasCompanyScopedRecipients', () => {
  it('accepts active recipients belonging to the target company', () => {
    expect(hasCompanyScopedRecipients(
      ['user-1', 'user-2'],
      [
        { id: 'user-1', company_id: 'company-a', is_deleted: false },
        { id: 'user-2', company_id: 'company-a', is_deleted: false },
      ],
      'company-a',
    )).toBe(true);
  });

  it('rejects a recipient from another company', () => {
    expect(hasCompanyScopedRecipients(
      ['user-1', 'user-2'],
      [
        { id: 'user-1', company_id: 'company-a', is_deleted: false },
        { id: 'user-2', company_id: 'company-b', is_deleted: false },
      ],
      'company-a',
    )).toBe(false);
  });

  it('rejects missing or deleted recipients', () => {
    expect(hasCompanyScopedRecipients(
      ['user-1'],
      [{ id: 'user-1', company_id: 'company-a', is_deleted: true }],
      'company-a',
    )).toBe(false);
    expect(hasCompanyScopedRecipients(['user-1'], [], 'company-a')).toBe(false);
  });

  it('normalizes duplicate IDs and rejects empty input', () => {
    expect(hasCompanyScopedRecipients(
      ['user-1', 'user-1'],
      [{ id: 'user-1', company_id: 'company-a', is_deleted: false }],
      'company-a',
    )).toBe(true);
    expect(hasCompanyScopedRecipients([], [], 'company-a')).toBe(false);
  });
});
