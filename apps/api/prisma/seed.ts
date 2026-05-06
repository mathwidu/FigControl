import { PrismaClient } from "@prisma/client";
import { validateCatalogSeed } from "@figcontrol/shared";
import { worldCup2026Seed } from "../src/catalog/world-cup-2026.seed";

const prisma = new PrismaClient();

async function main() {
  const validation = validateCatalogSeed(worldCup2026Seed);
  if (!validation.valid) {
    throw new Error(`Invalid catalog seed:\n${validation.errors.join("\n")}`);
  }

  await prisma.$transaction(async (tx) => {
    const collection = await tx.collection.upsert({
      where: { slug: worldCup2026Seed.slug },
      update: {
        name: worldCup2026Seed.name,
        baseStickerCount: worldCup2026Seed.baseStickerCount,
        trackedStickerCount: worldCup2026Seed.trackedStickerCount,
      },
      create: {
        slug: worldCup2026Seed.slug,
        name: worldCup2026Seed.name,
        baseStickerCount: worldCup2026Seed.baseStickerCount,
        trackedStickerCount: worldCup2026Seed.trackedStickerCount,
      },
    });

    const existingFwc00 = await tx.sticker.findUnique({
      where: { code: "FWC00" },
      select: { id: true },
    });

    if (existingFwc00) {
      await tx.sticker.deleteMany({ where: { code: "FWC0" } });
    } else {
      await tx.sticker.updateMany({
        where: { code: "FWC0" },
        data: { code: "FWC00" },
      });
    }

    for (const [sectionIndex, section] of worldCup2026Seed.sections.entries()) {
      const storedSection = await tx.stickerSection.upsert({
        where: {
          collectionId_slug: {
            collectionId: collection.id,
            slug: section.slug,
          },
        },
        update: {
          name: section.name,
          kind: section.kind,
          order: sectionIndex,
        },
        create: {
          collectionId: collection.id,
          slug: section.slug,
          name: section.name,
          kind: section.kind,
          order: sectionIndex,
        },
      });

      for (const [stickerIndex, sticker] of section.stickers.entries()) {
        await tx.sticker.upsert({
          where: { code: sticker.code },
          update: {
            sectionId: storedSection.id,
            localNumber: sticker.localNumber,
            label: sticker.label,
            isBaseAlbum: sticker.isBaseAlbum,
            special: sticker.special ?? false,
            order: stickerIndex,
          },
          create: {
            sectionId: storedSection.id,
            code: sticker.code,
            localNumber: sticker.localNumber,
            label: sticker.label,
            isBaseAlbum: sticker.isBaseAlbum,
            special: sticker.special ?? false,
            order: stickerIndex,
          },
        });
      }
    }
  });
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
