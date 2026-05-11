import { Injectable, NotFoundException } from "@nestjs/common";
import type { LeaderboardDto, LeaderboardItemDto } from "@figcontrol/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ProfilesService } from "../profiles/profiles.service";
import { CollectionStatsService } from "./collection-stats.service";

type LeaderboardRow = {
  userId: string;
  trackedHave: number;
  trackedMissing: number;
  duplicateCount: number;
  lastProgressAt: Date | null;
  profile: {
    nickname: string | null;
    cityName: string | null;
    stateCode: string | null;
    leaderboardJoinedAt: Date | null;
  };
};

type LeaderboardProfileRow = {
  userId: string;
  nickname: string | null;
  cityName: string | null;
  stateCode: string | null;
  leaderboardJoinedAt: Date | null;
  user: {
    collectionStats: {
      trackedHave: number;
      trackedMissing: number;
      duplicateCount: number;
      lastProgressAt: Date | null;
    }[];
  };
};

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly collectionStatsService: CollectionStatsService,
  ) {}

  async getLeaderboard(
    userId: string,
    collectionSlug: string,
  ): Promise<LeaderboardDto> {
    const collection = await this.prisma.collection.findUnique({
      where: { slug: collectionSlug },
      select: {
        id: true,
        slug: true,
        trackedStickerCount: true,
      },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found.");
    }

    const profile = await this.profilesService.getProfile(userId);

    if (profile.leaderboardJoinedAt) {
      await this.collectionStatsService.ensureUserStats(userId, collectionSlug);
    }

    const profileRows = await this.prisma.userProfile.findMany({
      where: {
        leaderboardJoinedAt: { not: null },
        nickname: { not: null },
        cityName: { not: null },
        stateCode: { not: null },
      },
      select: {
        userId: true,
        nickname: true,
        cityName: true,
        stateCode: true,
        leaderboardJoinedAt: true,
        user: {
          select: {
            collectionStats: {
              where: {
                collectionId: collection.id,
              },
              take: 1,
              select: {
                trackedHave: true,
                trackedMissing: true,
                duplicateCount: true,
                lastProgressAt: true,
              },
            },
          },
        },
      },
    });
    const rows = profileRows.map((profileRow) =>
      toLeaderboardRow(profileRow, collection.trackedStickerCount),
    );

    const rankedRows = sortRows(rows).map((row, index) => ({
      row,
      rank: index + 1,
    }));
    const items = rankedRows.slice(0, 100).map(({ row, rank }) =>
      toLeaderboardItem(row, rank),
    );
    const meRow = rankedRows.find(({ row }) => row.userId === userId);
    const meStats =
      meRow?.row ??
      (await this.prisma.userCollectionStats.findUnique({
        where: {
          userId_collectionId: {
            userId,
            collectionId: collection.id,
          },
        },
        select: {
          trackedHave: true,
          trackedMissing: true,
          duplicateCount: true,
        },
      }));

    return {
      collectionSlug: collection.slug,
      total: collection.trackedStickerCount,
      items,
      me: meStats
        ? {
            rank: meRow?.rank ?? null,
            trackedHave: meStats.trackedHave,
            trackedMissing: meStats.trackedMissing,
            duplicateCount: meStats.duplicateCount,
            joined: Boolean(profile.leaderboardJoinedAt),
            eligible: profile.leaderboardEligible,
          }
        : {
            rank: null,
            trackedHave: 0,
            trackedMissing: collection.trackedStickerCount,
            duplicateCount: 0,
            joined: Boolean(profile.leaderboardJoinedAt),
            eligible: profile.leaderboardEligible,
          },
    };
  }
}

function sortRows(rows: LeaderboardRow[]) {
  return [...rows].sort((a, b) => {
    if (a.trackedHave !== b.trackedHave) return b.trackedHave - a.trackedHave;
    if (a.trackedMissing !== b.trackedMissing) {
      return a.trackedMissing - b.trackedMissing;
    }

    const progressDiff = compareTime(
      a.lastProgressAt,
      b.lastProgressAt,
      Number.POSITIVE_INFINITY,
    );
    if (progressDiff !== 0) return progressDiff;

    return (
      compareTime(
        a.profile.leaderboardJoinedAt,
        b.profile.leaderboardJoinedAt,
        Number.POSITIVE_INFINITY,
      )
    );
  });
}

function toLeaderboardRow(
  profileRow: LeaderboardProfileRow,
  trackedStickerCount: number,
): LeaderboardRow {
  const stats = profileRow.user.collectionStats[0];

  return {
    userId: profileRow.userId,
    trackedHave: stats?.trackedHave ?? 0,
    trackedMissing: stats?.trackedMissing ?? trackedStickerCount,
    duplicateCount: stats?.duplicateCount ?? 0,
    lastProgressAt: stats?.lastProgressAt ?? null,
    profile: {
      nickname: profileRow.nickname,
      cityName: profileRow.cityName,
      stateCode: profileRow.stateCode,
      leaderboardJoinedAt: profileRow.leaderboardJoinedAt,
    },
  };
}

function toLeaderboardItem(
  row: LeaderboardRow,
  rank: number,
): LeaderboardItemDto {
  return {
    rank,
    nickname: row.profile.nickname ?? "Participante",
    cityName: row.profile.cityName ?? "",
    stateCode: row.profile.stateCode ?? "",
    trackedHave: row.trackedHave,
    trackedMissing: row.trackedMissing,
    duplicateCount: row.duplicateCount,
  };
}

function compareTime(
  a: Date | null | undefined,
  b: Date | null | undefined,
  fallback: number,
) {
  const aTime = toTime(a, fallback);
  const bTime = toTime(b, fallback);

  if (aTime === bTime) return 0;

  return aTime - bTime;
}

function toTime(value: Date | null | undefined, fallback: number) {
  return value ? value.getTime() : fallback;
}
