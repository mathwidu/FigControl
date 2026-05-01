import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { buildEmailVerificationMessage, buildPasswordResetMessage } from './email-messages';
import { EmailService } from './email.service';
import { assertPasswordPolicy, assertPasswordsMatch, hashPassword, verifyPassword } from './passwords';
import { createOneTimeToken, createRefreshToken, hashToken } from './tokens';

interface AuthUser {
  id: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  async register(email: string, password: string, confirmPassword: string) {
    assertPasswordsMatch(password, confirmPassword);
    assertPasswordPolicy(password);
    const normalizedEmail = normalizeEmail(email);
    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Email already registered.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: await hashPassword(password)
      },
      select: { id: true, email: true }
    });

    await this.sendEmailVerification(user.id, user.email);
    return this.genericAuthEmailResponse();
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) }
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Email not verified.');
    }

    return this.issueTokens({ id: user.id, email: user.email });
  }

  async requestEmailVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user || user.emailVerifiedAt) {
      return this.genericAuthEmailResponse();
    }

    const cooldownMinutes = this.configService.getOrThrow<number>(
      'FIGCONTROL_EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES'
    );
    if (await this.hasRecentEmailVerificationToken(user.id, cooldownMinutes)) {
      return this.genericAuthEmailResponse();
    }

    await this.sendEmailVerification(user.id, user.email);
    return this.genericAuthEmailResponse();
  }

  async confirmEmailVerification(token: string) {
    const storedToken = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true }
    });

    if (!storedToken || storedToken.usedAt || storedToken.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired email verification token.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.user.update({
        where: { id: storedToken.userId },
        data: { emailVerifiedAt: storedToken.user.emailVerifiedAt ?? new Date() }
      })
    ]);

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user) {
      return this.genericAuthEmailResponse();
    }

    const cooldownMinutes = this.configService.getOrThrow<number>('FIGCONTROL_PASSWORD_RESET_RESEND_COOLDOWN_MINUTES');
    if (await this.hasRecentPasswordResetToken(user.id, cooldownMinutes)) {
      return this.genericAuthEmailResponse();
    }

    await this.sendPasswordReset(user.id, user.email);
    return this.genericAuthEmailResponse();
  }

  async confirmPasswordReset(token: string, password: string, confirmPassword: string) {
    assertPasswordsMatch(password, confirmPassword);
    assertPasswordPolicy(password);
    const storedToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true }
    });

    if (!storedToken || storedToken.usedAt || storedToken.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.user.update({
        where: { id: storedToken.userId },
        data: {
          passwordHash: await hashPassword(password),
          emailVerifiedAt: storedToken.user.emailVerifiedAt ?? new Date()
        }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    return { success: true };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() }
    });

    return this.issueTokens({ id: storedToken.user.id, email: storedToken.user.email });
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(refreshToken),
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });

    return { success: true };
  }

  private async issueTokens(user: AuthUser) {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: `${this.configService.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS')}s`
      }
    );
    const refreshToken = createRefreshToken();
    const refreshTtlSeconds = this.configService.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000)
      }
    });

    return {
      user,
      accessToken,
      refreshToken
    };
  }

  private async sendEmailVerification(userId: string, email: string) {
    const token = createOneTimeToken();
    const ttlMinutes = this.configService.getOrThrow<number>('FIGCONTROL_EMAIL_VERIFICATION_TOKEN_TTL_MINUTES');

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: minutesFromNow(ttlMinutes)
      }
    });

    await this.sendAuthEmail(
      email,
      buildEmailVerificationMessage({
        appUrl: this.configService.getOrThrow<string>('FIGCONTROL_WEB_URL'),
        token
      })
    );
  }

  private async sendPasswordReset(userId: string, email: string) {
    const token = createOneTimeToken();
    const ttlMinutes = this.configService.getOrThrow<number>('FIGCONTROL_PASSWORD_RESET_TOKEN_TTL_MINUTES');

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: minutesFromNow(ttlMinutes)
      }
    });

    await this.sendAuthEmail(
      email,
      buildPasswordResetMessage({
        appUrl: this.configService.getOrThrow<string>('FIGCONTROL_WEB_URL'),
        token
      })
    );
  }

  private async sendAuthEmail(email: string, message: { subject: string; text: string; html: string }) {
    try {
      await this.emailService.send({
        to: email,
        subject: message.subject,
        text: message.text,
        html: message.html
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Could not send authentication email.');
    }
  }

  private async hasRecentEmailVerificationToken(userId: string, cooldownMinutes: number): Promise<boolean> {
    const token = await this.prisma.emailVerificationToken.findFirst({
      where: recentTokenWhere(userId, cooldownMinutes),
      select: { id: true }
    });
    return Boolean(token);
  }

  private async hasRecentPasswordResetToken(userId: string, cooldownMinutes: number): Promise<boolean> {
    const token = await this.prisma.passwordResetToken.findFirst({
      where: recentTokenWhere(userId, cooldownMinutes),
      select: { id: true }
    });
    return Boolean(token);
  }

  private genericAuthEmailResponse() {
    return {
      success: true,
      message: 'If the email exists, instructions were sent.'
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

function recentTokenWhere(userId: string, cooldownMinutes: number) {
  return {
    userId,
    usedAt: null,
    expiresAt: { gt: new Date() },
    createdAt: { gte: new Date(Date.now() - cooldownMinutes * 60_000) }
  };
}
