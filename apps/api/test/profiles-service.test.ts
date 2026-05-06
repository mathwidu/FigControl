import { ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProfilesService } from "../src/profiles/profiles.service";

function createService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    ...overrides,
  };
  const analytics = {
    track: vi.fn().mockResolvedValue(undefined),
  };

  return {
    prisma,
    analytics,
    service: new ProfilesService(prisma as never, analytics as never),
  };
}

describe("ProfilesService", () => {
  it("returns an incomplete profile for legacy users without profile rows", async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerifiedAt: null,
      profile: null,
    });

    await expect(service.getProfile("user-1")).resolves.toMatchObject({
      nickname: null,
      cityName: null,
      stateCode: null,
      exchangeOptIn: false,
      leaderboardEligible: false,
      leaderboardEligibilityReasons: [
        "EMAIL_NOT_VERIFIED",
        "PROFILE_INCOMPLETE",
      ],
    });
  });

  it("creates a profile with normalized nickname for uniqueness", async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerifiedAt: new Date("2026-05-01T00:00:00.000Z"),
      profile: null,
    });
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.userProfile.upsert.mockResolvedValue({
      userId: "user-1",
      nickname: "MÁTHEUS",
      nicknameNormalized: "matheus",
      cityName: "Porto Alegre",
      stateCode: "RS",
      exchangeOptIn: true,
      leaderboardJoinedAt: null,
      profileCompletedAt: new Date("2026-05-01T00:00:00.000Z"),
    });

    const profile = await service.updateProfile("user-1", {
      nickname: "MÁTHEUS",
      cityName: "Porto Alegre",
      stateCode: "rs",
      exchangeOptIn: true,
    });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          nickname: "MÁTHEUS",
          nicknameNormalized: "matheus",
          stateCode: "RS",
        }),
      }),
    );
    expect(profile.leaderboardEligible).toBe(true);
  });

  it("rejects a nickname used by another user", async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerifiedAt: new Date("2026-05-01T00:00:00.000Z"),
      profile: null,
    });
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-2",
      nicknameNormalized: "matheus",
    });

    await expect(
      service.updateProfile("user-1", { nickname: "Matheus" }),
    ).rejects.toThrow(ConflictException);
  });

  it("joins leaderboard only with a complete verified profile", async () => {
    const joinedAt = new Date("2026-05-01T00:00:00.000Z");
    const { prisma, analytics, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerifiedAt: joinedAt,
      profile: {
        userId: "user-1",
        nickname: "Matheus",
        nicknameNormalized: "matheus",
        cityName: "Porto Alegre",
        stateCode: "RS",
        exchangeOptIn: true,
        leaderboardJoinedAt: null,
        profileCompletedAt: joinedAt,
      },
    });
    prisma.userProfile.update.mockResolvedValue({
      userId: "user-1",
      nickname: "Matheus",
      nicknameNormalized: "matheus",
      cityName: "Porto Alegre",
      stateCode: "RS",
      exchangeOptIn: true,
      leaderboardJoinedAt: joinedAt,
      profileCompletedAt: joinedAt,
    });

    const profile = await service.joinLeaderboard("user-1");

    expect(profile.leaderboardJoinedAt).toBe(joinedAt.toISOString());
    expect(analytics.track).toHaveBeenCalledWith({
      userId: "user-1",
      eventType: "leaderboard_joined",
    });
  });

  it("blocks leaderboard join when profile is incomplete", async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      emailVerifiedAt: new Date("2026-05-01T00:00:00.000Z"),
      profile: null,
    });

    await expect(service.joinLeaderboard("user-1")).rejects.toThrow(
      ForbiddenException,
    );
  });
});
