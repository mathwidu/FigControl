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
});
