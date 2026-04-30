import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.confirmPassword);
  }

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('auth/email-verifications/resend')
  resendEmailVerification(@Body() dto: EmailRequestDto) {
    return this.authService.requestEmailVerification(dto.email);
  }

  @Post('auth/email-verifications/confirm')
  confirmEmailVerification(@Body() dto: TokenDto) {
    return this.authService.confirmEmailVerification(dto.token);
  }

  @Post('auth/password-resets')
  requestPasswordReset(@Body() dto: EmailRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

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
