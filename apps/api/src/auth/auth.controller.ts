import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthRateLimit } from "./auth-rate-limit.decorator";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";
import { AuthService } from "./auth.service";
import { AdminAccessService } from "./admin-access.service";
import {
  EmailRequestDto,
  LoginDto,
  LogoutDto,
  PasswordResetConfirmDto,
  RefreshDto,
  RegisterDto,
  TokenDto,
} from "./auth.dto";
import { CurrentUser, RequestUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";

const minute = 60_000;

@Controller()
@UseGuards(AuthRateLimitGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminAccessService: AdminAccessService,
  ) {}

  @AuthRateLimit({
    key: "register:ip-email",
    limit: 3,
    windowMs: 60 * minute,
    includeBodyEmail: true,
    extraBuckets: [
      { key: "register:ip", identity: "ip", limit: 10, windowMs: 60 * minute },
      {
        key: "register:email",
        identity: "body-email",
        limit: 3,
        windowMs: 60 * minute,
      },
    ],
  })
  @Post("auth/register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(
      dto.email,
      dto.password,
      dto.confirmPassword,
    );
  }

  @AuthRateLimit({
    key: "login:ip-email",
    limit: 8,
    windowMs: 15 * minute,
    includeBodyEmail: true,
    extraBuckets: [
      { key: "login:ip", identity: "ip", limit: 50, windowMs: 15 * minute },
    ],
  })
  @Post("auth/login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @AuthRateLimit({
    key: "email-verification-resend",
    limit: 3,
    windowMs: 60 * minute,
    includeBodyEmail: true,
    extraBuckets: [
      {
        key: "email-verification-resend:ip",
        identity: "ip",
        limit: 10,
        windowMs: 60 * minute,
      },
      {
        key: "email-verification-resend:email",
        identity: "body-email",
        limit: 3,
        windowMs: 60 * minute,
      },
    ],
  })
  @Post("auth/email-verifications/resend")
  resendEmailVerification(@Body() dto: EmailRequestDto) {
    return this.authService.requestEmailVerification(dto.email);
  }

  @AuthRateLimit({
    key: "email-verification-confirm",
    limit: 20,
    windowMs: 15 * minute,
  })
  @Post("auth/email-verifications/confirm")
  confirmEmailVerification(@Body() dto: TokenDto) {
    return this.authService.confirmEmailVerification(dto.token);
  }

  @AuthRateLimit({
    key: "password-reset-request:ip-email",
    limit: 3,
    windowMs: 60 * minute,
    includeBodyEmail: true,
    extraBuckets: [
      {
        key: "password-reset-request:ip",
        identity: "ip",
        limit: 10,
        windowMs: 60 * minute,
      },
      {
        key: "password-reset-request:email",
        identity: "body-email",
        limit: 3,
        windowMs: 60 * minute,
      },
    ],
  })
  @Post("auth/password-resets")
  requestPasswordReset(@Body() dto: EmailRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @AuthRateLimit({
    key: "password-reset-confirm",
    limit: 20,
    windowMs: 15 * minute,
  })
  @Post("auth/password-resets/confirm")
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(
      dto.token,
      dto.password,
      dto.confirmPassword,
    );
  }

  @AuthRateLimit({ key: "refresh", limit: 120, windowMs: 15 * minute })
  @Post("auth/refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @AuthRateLimit({ key: "logout", limit: 120, windowMs: 15 * minute })
  @Post("auth/logout")
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return {
      id: user.id,
      email: user.email,
      isAdmin: this.adminAccessService.isAdminEmail(user.email),
    };
  }
}
