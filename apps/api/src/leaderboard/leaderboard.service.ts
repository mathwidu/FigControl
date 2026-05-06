import { Injectable, NotFoundException } from "@nestjs/common";
import type { LeaderboardDto, LeaderboardItemDto } from "@figcontrol/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ProfilesService } from "../profiles/profiles.service";

type LeaderboardRow = {
  userId: string;
  trackedHave: number;
  trackedMissing: number;
  duplicateCount: number;
  lastProgressAt: Date | null;
  user: {
    profile: {
      nickname: string | null;
      cityName: string | null;
      stateCode: string | null;
      leaderboardJoinedAt: Date | null;
    } | null;
  };
};

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
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

    const rows = await this.prisma.userCollectionStats.findMany({
      where: {
        collectionId: collection.id,
        user: {
          profile: {
            leaderboardJoinedAt: { not: null },
          },
        },
      },
      select: {
        userId: true,
        trackedHave: true,
        trackedMissing: true,
        duplicateCount: true,
        lastProgressAt: true,
        user: {
          select: {
            profile: {
              select: {
                nickname: true,
                cityName: true,
                stateCode: true,
                leaderboardJoinedAt: true,
              },
            },
          },
        },
      },
    });

    const rankedRows = sortRows(rows).map((row, index) => ({
      row,
      rank: index + 1,
    }));
    const items = rankedRows.slice(0, 100).map(({ row, rank }) =>
      toLeaderboardItem(row, rank),
    );
    const profile = await this.profilesService.getProfile(userId);
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

    const progressDiff =
      toTime(a.lastProgressAt, Number.POSITIVE_INFINITY) -
      toTime(b.lastProgressAt, Number.POSITIVE_INFINITY);
    if (progressDiff !== 0) return progressDiff;

    return (
      toTime(a.user.profile?.leaderboardJoinedAt, Number.POSITIVE_INFINITY) -
      toTime(b.user.profile?.leaderboardJoinedAt, Number.POSITIVE_INFINITY)
    );
  });
}

function toLeaderboardItem(
  row: LeaderboardRow,
  rank: number,
): LeaderboardItemDto {
  return {
    rank,
    nickname: row.user.profile?.nickname ?? "Participante",
    cityName: row.user.profile?.cityName ?? "",
    stateCode: row.user.profile?.stateCode ?? "",
    trackedHave: row.trackedHave,
    trackedMissing: row.trackedMissing,
    duplicateCount: row.duplicateCount,
  };
}

function toTime(value: Date | null | undefined, fallback: number) {
  return value ? value.getTime() : fallback;
}
