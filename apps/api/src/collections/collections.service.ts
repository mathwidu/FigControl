import { Injectable, NotFoundException } from "@nestjs/common";
import { AnalyticsService } from "../analytics/analytics.service";
import { CatalogService } from "../catalog/catalog.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildCollectionView, CollectionView } from "./collection.presenter";

interface QuantityUpdate {
  stickerId: string;
  quantity: number;
}

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async getUserCollection(
    userId: string,
    slug: string,
  ): Promise<CollectionView> {
    const catalog = await this.catalogService.getCatalog(slug);
    if (!catalog) {
      throw new NotFoundException("Collection not found.");
    }

    const quantities = await this.prisma.userStickerQuantity.findMany({
      where: {
        userId,
        sticker: {
          section: {
            collection: { slug },
          },
        },
      },
      select: {
        quantity: true,
        sticker: {
          select: { code: true },
        },
      },
    });

    return buildCollectionView(
      catalog,
      new Map(quantities.map((entry) => [entry.sticker.code, entry.quantity])),
    );
  }

  async setQuantity(
    userId: string,
    slug: string,
    stickerId: string,
    quantity: number,
  ) {
    await this.applyQuantity(userId, slug, stickerId, quantity);
    return this.getUserCollection(userId, slug);
  }

  async setBulkQuantities(
    userId: string,
    slug: string,
    updates: QuantityUpdate[],
  ) {
    for (const update of updates) {
      await this.applyQuantity(userId, slug, update.stickerId, update.quantity);
    }
    return this.getUserCollection(userId, slug);
  }

  private async applyQuantity(
    userId: string,
    slug: string,
    stickerId: string,
    quantity: number,
  ) {
    const sticker = await this.prisma.sticker.findFirst({
      where: {
        code: stickerId,
        section: { collection: { slug } },
      },
      select: {
        id: true,
        code: true,
        section: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

    if (!sticker) {
      throw new NotFoundException("Sticker not found.");
    }

    const previous = await this.prisma.userStickerQuantity.findUnique({
      where: {
        userId_stickerId: {
          userId,
          stickerId: sticker.id,
        },
      },
      select: { quantity: true },
    });
    const previousQuantity = previous?.quantity ?? 0;

    if (quantity === 0) {
      await this.prisma.userStickerQuantity.deleteMany({
        where: { userId, stickerId: sticker.id },
      });
      await this.trackQuantityChange(userId, sticker, previousQuantity, 0);
      return;
    }

    await this.prisma.userStickerQuantity.upsert({
      where: {
        userId_stickerId: {
          userId,
          stickerId: sticker.id,
        },
      },
      update: { quantity },
      create: {
        userId,
        stickerId: sticker.id,
        quantity,
      },
    });

    await this.trackQuantityChange(userId, sticker, previousQuantity, quantity);
  }

  private async trackQuantityChange(
    userId: string,
    sticker: {
      code: string;
      section: { slug: string; name: string };
    },
    previousQuantity: number,
    nextQuantity: number,
  ) {
    if (previousQuantity === nextQuantity) return;

    const metadata = {
      stickerCode: sticker.code,
      sectionSlug: sticker.section.slug,
      sectionName: sticker.section.name,
      previousQuantity,
      nextQuantity,
    };

    if (previousQuantity === 0 && nextQuantity > 0) {
      await this.analyticsService.track({
        userId,
        eventType: "sticker_marked_owned",
        metadata,
      });
      return;
    }

    if (previousQuantity > 0 && nextQuantity === 0) {
      await this.analyticsService.track({
        userId,
        eventType: "sticker_marked_missing",
        metadata,
      });
      return;
    }

    if (nextQuantity > previousQuantity && nextQuantity > 1) {
      await this.analyticsService.track({
        userId,
        eventType: "duplicate_added",
        metadata,
      });
      return;
    }

    if (previousQuantity > 1 && nextQuantity < previousQuantity) {
      await this.analyticsService.track({
        userId,
        eventType: "duplicate_removed",
        metadata,
      });
    }
  }
}
