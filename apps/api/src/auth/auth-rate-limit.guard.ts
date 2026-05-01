import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_RATE_LIMIT_METADATA,
  type AuthRateLimitBucket,
  type AuthRateLimitIdentity,
  type AuthRateLimitOptions
} from './auth-rate-limit.decorator';
import { AuthRateLimitService } from './auth-rate-limit.service';

interface RateLimitRequest {
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  ips?: string[];
  socket?: {
    remoteAddress?: string;
  };
}

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: AuthRateLimitService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<AuthRateLimitOptions>(
      AUTH_RATE_LIMIT_METADATA,
      context.getHandler()
    );

    if (!options) return true;

    const request = context.switchToHttp().getRequest<RateLimitRequest>();
    const result = this.rateLimitService.consumeAll(buildConsumeInputs(request, options));

    if (!result.allowed) {
      const response = context.switchToHttp().getResponse<{
        setHeader?: (name: string, value: string) => void;
      }>();
      response.setHeader?.('Retry-After', String(result.retryAfterSeconds));
      throw new HttpException(
        `Muitas tentativas. Aguarde ${result.retryAfterSeconds}s e tente novamente.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}

function buildConsumeInputs(request: RateLimitRequest, options: AuthRateLimitOptions) {
  const primaryIdentity: AuthRateLimitIdentity = options.includeBodyEmail ? 'ip-body-email' : 'ip';
  const primary = {
    identity: buildIdentity(request, primaryIdentity),
    options: {
      key: options.key,
      limit: options.limit,
      windowMs: options.windowMs
    }
  };
  const extras = (options.extraBuckets ?? []).map((bucket) => ({
    identity: buildIdentity(request, bucket.identity),
    options: bucketOptions(bucket)
  }));

  return [primary, ...extras];
}

function bucketOptions(bucket: AuthRateLimitBucket) {
  return {
    key: bucket.key,
    limit: bucket.limit,
    windowMs: bucket.windowMs
  };
}

function buildIdentity(request: RateLimitRequest, identity: AuthRateLimitIdentity): string {
  const ip = getRequestIp(request);
  const email = normalizeEmail(request.body?.email) || 'unknown';

  if (identity === 'body-email') return `email:${email}`;
  if (identity === 'ip-body-email') return `ip:${ip}|email:${email}`;
  return `ip:${ip}`;
}

function getRequestIp(request: RateLimitRequest): string {
  if (request.ip) return request.ip;
  if (request.ips?.[0]) return request.ips[0];

  const realIp = request.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

  const forwardedFor = request.headers?.['x-forwarded-for'];
  const firstForwardedFor = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return (
    firstForwardedFor?.split(',')[0]?.trim() ||
    request.ip ||
    request.socket?.remoteAddress ||
    'unknown'
  );
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
