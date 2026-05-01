import { Injectable } from '@nestjs/common';
import type { AuthRateLimitOptions } from './auth-rate-limit.decorator';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

@Injectable()
export class AuthRateLimitService {
  private readonly attempts = new Map<string, RateLimitEntry>();

  consume(identity: string, options: AuthRateLimitOptions): RateLimitResult {
    const now = Date.now();
    const key = `${options.key}:${identity}`;
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.count >= options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000))
      };
    }

    current.count += 1;
    this.attempts.set(key, current);

    return { allowed: true, retryAfterSeconds: 0 };
  }
}
