import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AdminAccessService } from "./admin-access.service";
import { AuthController } from "./auth.controller";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";
import { AuthRateLimitService } from "./auth-rate-limit.service";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [AnalyticsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    JwtAuthGuard,
    AuthRateLimitGuard,
    AuthRateLimitService,
    AdminAccessService,
  ],
  exports: [AuthService, JwtAuthGuard, AdminAccessService],
})
export class AuthModule {}
