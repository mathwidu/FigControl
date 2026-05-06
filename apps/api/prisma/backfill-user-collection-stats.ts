import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const collectionSlug = "world-cup-2026";

async function main() {
  const collection = await prisma.collection.findUnique({
    where: { slug: collectionSlug },
    select: {
      id: true,
      baseStickerCount: true,
      trackedStickerCount: true,
    },
  });

  if (!collection) {
    throw new Error(`Collection ${collectionSlug} not found.`);
  }

  const users = await prisma.user.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  for (const user of users) {
    const stickers = await prisma.sticker.findMany({
      where: { section: { collectionId: collection.id } },
      select: {
        isBaseAlbum: true,
        quantities: {
          where: { userId: user.id },
          select: {
            quantity: true,
            updatedAt: true,
          },
        },
      },
    });
    const counters = calculateCounters(stickers, collection);

    await prisma.userCollectionStats.upsert({
      where: {
        userId_collectionId: {
          userId: user.id,
          collectionId: collection.id,
        },
      },
      update: counters,
      create: {
        userId: user.id,
        collectionId: collection.id,
        ...counters,
      },
    });
  }

  console.log(`Backfilled ${users.length} user collection stats.`);
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
