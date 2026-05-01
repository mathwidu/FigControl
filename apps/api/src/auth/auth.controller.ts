import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthRateLimit } from './auth-rate-limit.decorator';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import {
  EmailRequestDto,
  LoginDto,
  LogoutDto,
  PasswordResetConfirmDto,
  RefreshDto,
  RegisterDto,
  TokenDto
} from './auth.dto';
import { CurrentUser, RequestUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

const minute = 60_000;

@Controller()
@UseGuards(AuthRateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @AuthRateLimit({ key: 'register', limit: 5, windowMs: 60 * minute, includeBodyEmail: true })
  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.confirmPassword);
  }

  @AuthRateLimit({ key: 'login', limit: 8, windowMs: 15 * minute, includeBodyEmail: true })
  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @AuthRateLimit({
    key: 'email-verification-resend',
    limit: 5,
    windowMs: 60 * minute,
    includeBodyEmail: true
  })
  @Post('auth/email-verifications/resend')
  resendEmailVerification(@Body() dto: EmailRequestDto) {
    return this.authService.requestEmailVerification(dto.email);
  }

  @AuthRateLimit({ key: 'email-verification-confirm', limit: 20, windowMs: 15 * minute })
  @Post('auth/email-verifications/confirm')
  confirmEmailVerification(@Body() dto: TokenDto) {
    return this.authService.confirmEmailVerification(dto.token);
  }

  @AuthRateLimit({ key: 'password-reset-request', limit: 5, windowMs: 60 * minute, includeBodyEmail: true })
  @Post('auth/password-resets')
  requestPasswordReset(@Body() dto: EmailRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @AuthRateLimit({ key: 'password-reset-confirm', limit: 20, windowMs: 15 * minute })
  @Post('auth/password-resets/confirm')
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto.token, dto.password, dto.confirmPassword);
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('auth/logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return { id: user.id, email: user.email };
  }
}
