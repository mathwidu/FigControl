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
  type AuthRateLimitOptions
} from './auth-rate-limit.decorator';
import { AuthRateLimitService } from './auth-rate-limit.service';

interface RateLimitRequest {
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
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
    const result = this.rateLimitService.consume(buildIdentity(request, options), options);

    if (!result.allowed) {
      throw new HttpException(
        `Muitas tentativas. Aguarde ${result.retryAfterSeconds}s e tente novamente.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}

function buildIdentity(request: RateLimitRequest, options: AuthRateLimitOptions): string {
  const ip = getRequestIp(request);
  const email = options.includeBodyEmail ? normalizeEmail(request.body?.email) : '';

  return email ? `ip:${ip}|email:${email}` : `ip:${ip}`;
}

function getRequestIp(request: RateLimitRequest): string {
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
