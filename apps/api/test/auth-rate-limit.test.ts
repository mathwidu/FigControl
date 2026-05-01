import { describe, expect, it, vi } from 'vitest';
import { AuthRateLimitService } from '../src/auth/auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  it('blocks an identity after the configured number of attempts in the window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));

    const service = new AuthRateLimitService();
    const options = { key: 'login', limit: 2, windowMs: 1_000 };

    expect(service.consume('ip:127.0.0.1|email:user@example.com', options).allowed).toBe(true);
    expect(service.consume('ip:127.0.0.1|email:user@example.com', options).allowed).toBe(true);

    const blocked = service.consume('ip:127.0.0.1|email:user@example.com', options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);

    vi.advanceTimersByTime(1_001);

    expect(service.consume('ip:127.0.0.1|email:user@example.com', options).allowed).toBe(true);

    vi.useRealTimers();
  });

  it('tracks different routes and identities independently', () => {
    const service = new AuthRateLimitService();
    const options = { key: 'login', limit: 1, windowMs: 1_000 };

    expect(service.consume('ip:a|email:a@example.com', options).allowed).toBe(true);
    expect(service.consume('ip:a|email:a@example.com', options).allowed).toBe(false);
    expect(service.consume('ip:b|email:a@example.com', options).allowed).toBe(true);
    expect(service.consume('ip:a|email:a@example.com', { ...options, key: 'register' }).allowed).toBe(true);
  });

  it('blocks a shared IP bucket even when the attacker changes target email', () => {
    const service = new AuthRateLimitService();
    const ipBucket = { key: 'register:ip', limit: 2, windowMs: 60_000 };
    const emailBucket = { key: 'register:ip-email', limit: 10, windowMs: 60_000 };

    expect(
      service.consumeAll([
        { identity: 'ip:203.0.113.10', options: ipBucket },
        { identity: 'ip:203.0.113.10|email:a@example.com', options: emailBucket }
      ]).allowed
    ).toBe(true);
    expect(
      service.consumeAll([
        { identity: 'ip:203.0.113.10', options: ipBucket },
        { identity: 'ip:203.0.113.10|email:b@example.com', options: emailBucket }
      ]).allowed
    ).toBe(true);

    const blocked = service.consumeAll([
      { identity: 'ip:203.0.113.10', options: ipBucket },
      { identity: 'ip:203.0.113.10|email:c@example.com', options: emailBucket }
    ]);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });
});
