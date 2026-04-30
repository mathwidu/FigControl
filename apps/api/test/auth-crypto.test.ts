import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/passwords';
import { createOneTimeToken, hashToken } from '../src/auth/tokens';

describe('password helpers', () => {
  it('verifies the original password and rejects a different password', async () => {
    const hash = await hashPassword('super-secret-password');

    expect(hash).not.toBe('super-secret-password');
    await expect(verifyPassword('super-secret-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});

describe('one-time auth tokens', () => {
  it('creates random tokens and stores only deterministic hashes', () => {
    const first = createOneTimeToken();
    const second = createOneTimeToken();

    expect(first).not.toBe(second);
    expect(hashToken(first)).toBe(hashToken(first));
    expect(hashToken(first)).not.toBe(first);
    expect(hashToken(first)).not.toBe(hashToken(second));
  });
});
