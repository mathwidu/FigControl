import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CollectionStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateUserStats(userId: string, collectionSlug: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { slug: collectionSlug },
      select: {
        id: true,
        baseStickerCount: true,
        trackedStickerCount: true,
      },
    });

    if (!collection) {
      throw new NotFoundException("Collection not found.");
    }

    const stickers = await this.prisma.sticker.findMany({
      where: {
        section: {
          collectionId: collection.id,
        },
      },
      select: {
        id: true,
        isBaseAlbum: true,
        quantities: {
          where: { userId },
          select: {
            quantity: true,
            updatedAt: true,
          },
        },
      },
    });

    const counters = calculateCounters(stickers, collection);

    await this.prisma.userCollectionStats.upsert({
      where: {
        userId_collectionId: {
          userId,
          collectionId: collection.id,
        },
      },
      update: counters,
      create: {
        userId,
        collectionId: collection.id,
        ...counters,
      },
    });
  }
}

function calculateCounters(
  stickers: Array<{
    isBaseAlbum: boolean;
    quantities: Array<{ quantity: number; updatedAt: Date }>;
  }>,
  collection: { baseStickerCount: number; trackedStickerCount: number },
) {
  const trackedHave = stickers.filter((sticker) => getQuantity(sticker) > 0).length;
  const baseHave = stickers.filter(
    (sticker) => sticker.isBaseAlbum && getQuantity(sticker) > 0,
  ).length;
  const duplicateCount = stickers.reduce((total, sticker) => {
    const quantity = getQuantity(sticker);
    return total + Math.max(0, quantity - 1);
  }, 0);

  return {
    trackedHave,
    trackedMissing: Math.max(0, collection.trackedStickerCount - trackedHave),
    baseHave,
    baseMissing: Math.max(0, collection.baseStickerCount - baseHave),
    duplicateCount,
    lastProgressAt: getLastProgressAt(stickers),
  };
}

function getQuantity(sticker: { quantities: Array<{ quantity: number }> }) {
  return sticker.quantities[0]?.quantity ?? 0;
}

function getLastProgressAt(
  stickers: Array<{ quantities: Array<{ updatedAt: Date }> }>,
) {
  return (
    stickers
      .flatMap((sticker) => sticker.quantities.map((quantity) => quantity.updatedAt))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
  );
}
