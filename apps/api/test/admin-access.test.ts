import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminAccessService } from '../src/auth/admin-access.service';
import { AdminGuard } from '../src/admin/admin.guard';

describe('AdminAccessService', () => {
  it('allows only emails configured in FIGCONTROL_ADMIN_EMAILS', () => {
    const config = {
      get: vi.fn().mockReturnValue('Owner@Example.com, segundo@example.com ')
    };
    const service = new AdminAccessService(config as never);

    expect(service.isAdminEmail('owner@example.com')).toBe(true);
    expect(service.isAdminEmail('SEGUNDO@example.com')).toBe(true);
    expect(service.isAdminEmail('user@example.com')).toBe(false);
  });
});

describe('AdminGuard', () => {
  it('blocks authenticated users outside the admin email allowlist', () => {
    const guard = new AdminGuard({
      isAdminEmail: vi.fn().mockReturnValue(false)
    } as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', email: 'user@example.com' }
        })
      })
    };

    expect(() => guard.canActivate(context as never)).toThrow(ForbiddenException);
  });
});
