/**
 * Invitation token helpers — never store or log raw tokens long-term.
 * Flow: token received → SHA-256 → compare token_hash
 */
import { createHash, randomBytes } from 'crypto';

export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function invitationTokensMatch(rawToken: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const incoming = hashInvitationToken(rawToken);
  // timing-safe compare
  if (incoming.length !== storedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < incoming.length; i++) {
    mismatch |= incoming.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return mismatch === 0;
}
