import { Injectable } from '@nestjs/common';
import type { CatalogSeed } from '@figcontrol/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(slug: string): Promise<CatalogSeed | null> {
    const collection = await this.prisma.collection.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            stickers: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!collection) return null;

    return {
      slug: collection.slug,
      name: collection.name,
      baseStickerCount: collection.baseStickerCount,
      trackedStickerCount: collection.trackedStickerCount,
      sections: collection.sections.map((section) => ({
        slug: section.slug,
        name: section.name,
        kind: section.kind,
        stickers: section.stickers.map((sticker) => ({
          code: sticker.code,
          localNumber: sticker.localNumber,
          label: sticker.label,
          isBaseAlbum: sticker.isBaseAlbum,
          special: sticker.special
        }))
      }))
    };
  }
}
