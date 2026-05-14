import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  LeaderboardEligibilityReason,
  NicknameAvailabilityDto,
  UpdateProfileDto,
  UserProfileDto,
} from "@figcontrol/shared";
import { AnalyticsService } from "../analytics/analytics.service";
import { CollectionStatsService } from "../leaderboard/collection-stats.service";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeNickname, validateProfileInput } from "./profile-validation";

const WORLD_CUP_2026_COLLECTION_SLUG = "world-cup-2026";

type ProfileRecord = {
  userId: string;
  nickname: string | null;
  nicknameNormalized: string | null;
  cityName: string | null;
  stateCode: string | null;
  phoneNumber: string | null;
  exchangeOptIn: boolean;
  leaderboardJoinedAt: Date | null;
  profileCompletedAt: Date | null;
};

type UserWithProfile = {
  id: string;
  emailVerifiedAt: Date | null;
  profile: ProfileRecord | null;
};

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
    private readonly collectionStatsService: CollectionStatsService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findUserWithProfile(userId);
    return toProfileDto(user);
  }

  async checkNicknameAvailability(
    userId: string,
    nickname: string,
  ): Promise<NicknameAvailabilityDto> {
    const validation = validateProfileInput({ nickname });
    const normalizedNickname = validation.normalizedNickname;

    if (!validation.valid || !normalizedNickname) {
      return {
        nickname,
        available: false,
        reason: "INVALID_NICKNAME",
      };
    }

    const existing = await this.prisma.userProfile.findUnique({
      where: { nicknameNormalized: normalizedNickname },
      select: { userId: true },
    });

    return {
      nickname,
      available: !existing || existing.userId === userId,
      reason: existing && existing.userId !== userId ? "NICKNAME_TAKEN" : null,
    };
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const user = await this.findUserWithProfile(userId);
    const validation = validateProfileInput(input);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors.join(" "));
    }

    const nextNickname =
      input.nickname === undefined
        ? (user.profile?.nickname ?? null)
        : nullableTrim(input.nickname);
    const nextNormalizedNickname =
      input.nickname === undefined
        ? (user.profile?.nicknameNormalized ?? null)
        : validation.normalizedNickname;
    const nextCityName =
      input.cityName === undefined
        ? (user.profile?.cityName ?? null)
        : nullableTrim(input.cityName);
    const nextStateCode =
      input.stateCode === undefined
        ? (user.profile?.stateCode ?? null)
        : validation.normalizedStateCode;
    const nextPhoneNumber =
      input.phoneNumber === undefined
        ? (user.profile?.phoneNumber ?? null)
        : validation.normalizedPhoneNumber;
    const nextExchangeOptIn =
      input.exchangeOptIn ?? user.profile?.exchangeOptIn ?? false;

    if (nextNormalizedNickname) {
      await this.assertNicknameAvailable(userId, nextNormalizedNickname);
    }

    const profileCompletedAt =
      user.profile?.profileCompletedAt ??
      (isProfileComplete({
        nickname: nextNickname,
        cityName: nextCityName,
        stateCode: nextStateCode,
      })
        ? new Date()
        : null);

    const saved = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        nickname: nextNickname,
        nicknameNormalized: nextNormalizedNickname,
        cityName: nextCityName,
        stateCode: nextStateCode,
        phoneNumber: nextPhoneNumber,
        exchangeOptIn: nextExchangeOptIn,
        profileCompletedAt,
      },
      create: {
        userId,
        nickname: nextNickname,
        nicknameNormalized: nextNormalizedNickname,
        cityName: nextCityName,
        stateCode: nextStateCode,
        phoneNumber: nextPhoneNumber,
        exchangeOptIn: nextExchangeOptIn,
        profileCompletedAt,
      },
    });

    await this.analyticsService.track({
      userId,
      eventType: "profile_saved",
    });

    return toProfileDto({ ...user, profile: saved });
  }

  async joinLeaderboard(userId: string): Promise<UserProfileDto> {
    const user = await this.findUserWithProfile(userId);
    const profile = toProfileDto(user);

    if (!profile.leaderboardEligible) {
      throw new ForbiddenException(
        "Complete seu perfil para entrar no ranking.",
      );
    }

    if (user.profile?.leaderboardJoinedAt) {
      return profile;
    }

    await this.collectionStatsService.recalculateUserStats(
      userId,
      WORLD_CUP_2026_COLLECTION_SLUG,
    );

    const saved = await this.prisma.userProfile.update({
      where: { userId },
      data: { leaderboardJoinedAt: new Date() },
    });

    await this.analyticsService.track({
      userId,
      eventType: "leaderboard_joined",
    });

    return toProfileDto({ ...user, profile: saved });
  }

  private async findUserWithProfile(userId: string): Promise<UserWithProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        emailVerifiedAt: true,
        profile: {
          select: {
            userId: true,
            nickname: true,
            nicknameNormalized: true,
            cityName: true,
            stateCode: true,
            phoneNumber: true,
            exchangeOptIn: true,
            leaderboardJoinedAt: true,
            profileCompletedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Usuario nao encontrado.");
    }

    return user;
  }

  private async assertNicknameAvailable(
    userId: string,
    normalizedNickname: string,
  ) {
    const existing = await this.prisma.userProfile.findUnique({
      where: { nicknameNormalized: normalizedNickname },
      select: { userId: true },
    });

    if (existing && existing.userId !== userId) {
      throw new ConflictException("Este apelido nao esta disponivel.");
    }
  }
}

function toProfileDto(user: UserWithProfile): UserProfileDto {
  const reasons = getEligibilityReasons(user);

  return {
    nickname: user.profile?.nickname ?? null,
    cityName: user.profile?.cityName ?? null,
    stateCode: user.profile?.stateCode ?? null,
    phoneNumber: user.profile?.phoneNumber ?? null,
    exchangeOptIn: user.profile?.exchangeOptIn ?? false,
    leaderboardJoinedAt:
      user.profile?.leaderboardJoinedAt?.toISOString() ?? null,
    profileCompletedAt: user.profile?.profileCompletedAt?.toISOString() ?? null,
    leaderboardEligible: reasons.length === 0,
    leaderboardEligibilityReasons: reasons,
  };
}

function getEligibilityReasons(
  user: UserWithProfile,
): LeaderboardEligibilityReason[] {
  const reasons: LeaderboardEligibilityReason[] = [];

  if (!user.emailVerifiedAt) {
    reasons.push("EMAIL_NOT_VERIFIED");
  }

  if (!user.profile) {
    reasons.push("PROFILE_INCOMPLETE");
    return reasons;
  }

  if (!user.profile.nickname) {
    reasons.push("NICKNAME_REQUIRED");
  }

  if (!user.profile.cityName) {
    reasons.push("CITY_REQUIRED");
  }

  if (!user.profile.stateCode) {
    reasons.push("STATE_REQUIRED");
  }

  return reasons;
}

function nullableTrim(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function isProfileComplete(input: {
  nickname: string | null;
  cityName: string | null;
  stateCode: string | null;
}) {
  return Boolean(input.nickname && input.cityName && input.stateCode);
}
