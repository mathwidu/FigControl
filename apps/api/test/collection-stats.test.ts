import { describe, expect, it, vi } from "vitest";
import { CollectionStatsService } from "../src/leaderboard/collection-stats.service";

describe("CollectionStatsService", () => {
  it("recalculates tracked, base and duplicate counters for a user", async () => {
    const prisma = {
      collection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "collection-1",
          baseStickerCount: 3,
          trackedStickerCount: 4,
        }),
      },
      sticker: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "sticker-1",
            isBaseAlbum: true,
            quantities: [{ quantity: 1, updatedAt: new Date("2026-05-01T00:00:00.000Z") }],
          },
          {
            id: "sticker-2",
            isBaseAlbum: true,
            quantities: [{ quantity: 3, updatedAt: new Date("2026-05-02T00:00:00.000Z") }],
          },
          {
            id: "sticker-3",
            isBaseAlbum: true,
            quantities: [],
          },
          {
            id: "sticker-4",
            isBaseAlbum: false,
            quantities: [{ quantity: 2, updatedAt: new Date("2026-05-03T00:00:00.000Z") }],
          },
        ]),
      },
      userCollectionStats: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    const service = new CollectionStatsService(prisma as never);

    await service.recalculateUserStats("user-1", "world-cup-2026");

    expect(prisma.userCollectionStats.upsert).toHaveBeenCalledWith({
      where: {
        userId_collectionId: {
          userId: "user-1",
          collectionId: "collection-1",
        },
      },
      update: expect.objectContaining({
        trackedHave: 3,
        trackedMissing: 1,
        baseHave: 2,
        baseMissing: 1,
        duplicateCount: 3,
        lastProgressAt: new Date("2026-05-03T00:00:00.000Z"),
      }),
      create: expect.objectContaining({
        userId: "user-1",
        collectionId: "collection-1",
        trackedHave: 3,
        trackedMissing: 1,
        baseHave: 2,
        baseMissing: 1,
        duplicateCount: 3,
        lastProgressAt: new Date("2026-05-03T00:00:00.000Z"),
      }),
    });
  });
});
