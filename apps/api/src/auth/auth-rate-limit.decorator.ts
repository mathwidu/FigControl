import { SetMetadata } from '@nestjs/common';

export const AUTH_RATE_LIMIT_METADATA = 'figcontrol:auth-rate-limit';

export type AuthRateLimitIdentity = 'ip' | 'body-email' | 'ip-body-email';

export interface AuthRateLimitBucket {
  key: string;
  limit: number;
  windowMs: number;
  identity: AuthRateLimitIdentity;
}

export interface AuthRateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  includeBodyEmail?: boolean;
  extraBuckets?: AuthRateLimitBucket[];
}

export const AuthRateLimit = (options: AuthRateLimitOptions) =>
  SetMetadata(AUTH_RATE_LIMIT_METADATA, options);
