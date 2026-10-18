import {
  generateShareToken,
  getLinkState,
  hashShareToken,
  isValidShareToken,
  safeFileName,
  sanitizeDocumentLabel,
} from '@/lib/shared-links';

describe('shared-link token security helpers', () => {
  it('generates URL-safe 256-bit tokens and hashes them deterministically', () => {
    const token = generateShareToken();
    expect(token).toHaveLength(43);
    expect(isValidShareToken(token)).toBe(true);
    expect(hashShareToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashShareToken(token)).toBe(hashShareToken(token));
  });

  it('rejects malformed or shortened tokens', () => {
    expect(isValidShareToken('short')).toBe(false);
    expect(isValidShareToken('x'.repeat(42))).toBe(false);
    expect(isValidShareToken('x'.repeat(44))).toBe(false);
    expect(isValidShareToken('x'.repeat(42) + '/')).toBe(false);
  });

  it('sanitizes visible labels and download file names', () => {
    expect(sanitizeDocumentLabel('<script>Tarjeta</script>')).toBe('scriptTarjeta/script');
    expect(sanitizeDocumentLabel('  ')).toBe('Documento del vehículo');
    expect(safeFileName('../póliza\\seguro.pdf')).not.toContain('/');
    expect(safeFileName('../póliza\\seguro.pdf')).not.toContain('..');
  });

  it('prioritizes revoked, expired and consumed states before active', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(getLinkState({ expires_at: future, revoked_at: '2026-01-01T00:00:00.000Z', single_use: false, used_at: null })).toBe('revoked');
    expect(getLinkState({ expires_at: past, revoked_at: null, single_use: false, used_at: null })).toBe('expired');
    expect(getLinkState({ expires_at: future, revoked_at: null, single_use: true, used_at: future })).toBe('used');
    expect(getLinkState({ expires_at: future, revoked_at: null, single_use: false, used_at: null })).toBe('active');
  });
});
