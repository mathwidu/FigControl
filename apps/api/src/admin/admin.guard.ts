import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AdminAccessService } from "../auth/admin-access.service";
import type { RequestUser } from "../auth/current-user.decorator";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminAccessService: AdminAccessService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();

    if (!this.adminAccessService.isAdminEmail(request.user?.email)) {
      throw new ForbiddenException("Admin access required.");
    }

    return true;
  }
}
