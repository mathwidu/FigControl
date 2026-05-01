import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtAuthGuard, AuthRateLimitGuard, AuthRateLimitService],
  exports: [AuthService, JwtAuthGuard]
})
export class AuthModule {}
