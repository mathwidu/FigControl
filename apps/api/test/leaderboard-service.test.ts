import { describe, expect, it, vi } from "vitest";
import { LeaderboardService } from "../src/leaderboard/leaderboard.service";

describe("LeaderboardService", () => {
  it("orders joined profiles by total tracked progress without exposing email", async () => {
    const prisma = {
      collection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "collection-1",
          slug: "world-cup-2026",
          trackedStickerCount: 994,
        }),
      },
      userCollectionStats: {
        findMany: vi.fn().mockResolvedValue([
          {
            userId: "user-1",
            trackedHave: 200,
            trackedMissing: 794,
            duplicateCount: 2,
            lastProgressAt: new Date("2026-05-03T00:00:00.000Z"),
            user: {
              email: "hidden@example.com",
              profile: {
                nickname: "Alpha",
                cityName: "Porto Alegre",
                stateCode: "RS",
                leaderboardJoinedAt: new Date("2026-05-01T00:00:00.000Z"),
              },
            },
          },
          {
            userId: "user-2",
            trackedHave: 300,
            trackedMissing: 694,
            duplicateCount: 1,
            lastProgressAt: new Date("2026-05-04T00:00:00.000Z"),
            user: {
              email: "hidden2@example.com",
              profile: {
                nickname: "Beta",
                cityName: "Canoas",
                stateCode: "RS",
                leaderboardJoinedAt: new Date("2026-05-02T00:00:00.000Z"),
              },
            },
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          trackedHave: 200,
          trackedMissing: 794,
          duplicateCount: 2,
        }),
      },
    };
    const profiles = {
      getProfile: vi.fn().mockResolvedValue({
        leaderboardJoinedAt: "2026-05-01T00:00:00.000Z",
        leaderboardEligible: true,
      }),
    };
    const service = new LeaderboardService(prisma as never, profiles as never);

    const leaderboard = await service.getLeaderboard("user-1", "world-cup-2026");

    expect(leaderboard.items.map((item) => item.nickname)).toEqual([
      "Beta",
      "Alpha",
    ]);
    expect(leaderboard.items[0]).toEqual({
      rank: 1,
      nickname: "Beta",
      cityName: "Canoas",
      stateCode: "RS",
      trackedHave: 300,
      trackedMissing: 694,
      duplicateCount: 1,
    });
    expect(JSON.stringify(leaderboard)).not.toContain("hidden@example.com");
    expect(leaderboard.me).toEqual({
      rank: 2,
      trackedHave: 200,
      trackedMissing: 794,
      duplicateCount: 2,
      joined: true,
      eligible: true,
    });
  });
});
