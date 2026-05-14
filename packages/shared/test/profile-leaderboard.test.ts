import { describe, expect, it } from "vitest";
import type {
  LeaderboardDto,
  NicknameAvailabilityDto,
  UpdateProfileDto,
  UserProfileDto,
} from "../src";

describe("profile and leaderboard contracts", () => {
  it("models an incomplete profile without forcing legacy users into leaderboard", () => {
    const profile = {
      nickname: null,
      cityName: null,
      stateCode: null,
      phoneNumber: null,
      exchangeOptIn: false,
      leaderboardJoinedAt: null,
      profileCompletedAt: null,
      leaderboardEligible: false,
      leaderboardEligibilityReasons: ["PROFILE_INCOMPLETE"],
    } satisfies UserProfileDto;

    expect(profile.leaderboardEligible).toBe(false);
    expect(profile.leaderboardEligibilityReasons).toContain(
      "PROFILE_INCOMPLETE",
    );
  });

  it("models nickname availability feedback", () => {
    const availability = {
      nickname: "Matheus",
      available: false,
      reason: "NICKNAME_TAKEN",
    } satisfies NicknameAvailabilityDto;

    expect(availability.available).toBe(false);
  });

  it("models profile updates and total tracked leaderboard entries", () => {
    const update = {
      nickname: "Matheus",
      cityName: "Porto Alegre",
      stateCode: "RS",
      phoneNumber: "+5551999999999",
      exchangeOptIn: true,
    } satisfies UpdateProfileDto;
    const leaderboard = {
      collectionSlug: "world-cup-2026",
      total: 994,
      items: [
        {
          rank: 1,
          nickname: update.nickname,
          cityName: update.cityName,
          stateCode: update.stateCode,
          trackedHave: 822,
          trackedMissing: 172,
          duplicateCount: 31,
        },
      ],
      me: {
        rank: 1,
        trackedHave: 822,
        trackedMissing: 172,
        duplicateCount: 31,
        joined: true,
        eligible: true,
      },
    } satisfies LeaderboardDto;

    expect(leaderboard.items[0].trackedHave).toBe(822);
    expect(leaderboard.total).toBe(994);
  });
});
