import { SetMetadata } from '@nestjs/common';

export const AUTH_RATE_LIMIT_METADATA = 'figcontrol:auth-rate-limit';

export interface AuthRateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  includeBodyEmail?: boolean;
}

export const AuthRateLimit = (options: AuthRateLimitOptions) =>
  SetMetadata(AUTH_RATE_LIMIT_METADATA, options);
