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

export interface RateLimitConsumeInput {
  identity: string;
  options: Pick<AuthRateLimitOptions, 'key' | 'limit' | 'windowMs'>;
}

@Injectable()
export class AuthRateLimitService {
  private readonly attempts = new Map<string, RateLimitEntry>();

  consume(identity: string, options: AuthRateLimitOptions): RateLimitResult {
    return this.consumeAll([{ identity, options }]);
  }

  consumeAll(inputs: RateLimitConsumeInput[]): RateLimitResult {
    const blocked = inputs
      .map((input) => this.inspect(input.identity, input.options))
      .find((result) => !result.allowed);

    if (blocked) return blocked;

    for (const input of inputs) {
      this.increment(input.identity, input.options);
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  private inspect(identity: string, options: RateLimitConsumeInput['options']): RateLimitResult {
    const now = Date.now();
    const key = `${options.key}:${identity}`;
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (current.count >= options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000))
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  private increment(identity: string, options: RateLimitConsumeInput['options']): void {
    const now = Date.now();
    const key = `${options.key}:${identity}`;
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });
      return;
    }

    current.count += 1;
    this.attempts.set(key, current);
  }
}
