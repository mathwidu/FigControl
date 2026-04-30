import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildCollectionView, CollectionView } from './collection.presenter';

interface QuantityUpdate {
  stickerId: string;
  quantity: number;
}

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService
  ) {}

  async getUserCollection(userId: string, slug: string): Promise<CollectionView> {
    const catalog = await this.catalogService.getCatalog(slug);
    if (!catalog) {
      throw new NotFoundException('Collection not found.');
    }

    const quantities = await this.prisma.userStickerQuantity.findMany({
      where: {
        userId,
        sticker: {
          section: {
            collection: { slug }
          }
        }
      },
      select: {
        quantity: true,
        sticker: {
          select: { code: true }
        }
      }
    });

    return buildCollectionView(
      catalog,
      new Map(quantities.map((entry) => [entry.sticker.code, entry.quantity]))
    );
  }

  async setQuantity(userId: string, slug: string, stickerId: string, quantity: number) {
    await this.applyQuantity(userId, slug, stickerId, quantity);
    return this.getUserCollection(userId, slug);
  }

  async setBulkQuantities(userId: string, slug: string, updates: QuantityUpdate[]) {
    for (const update of updates) {
      await this.applyQuantity(userId, slug, update.stickerId, update.quantity);
    }
    return this.getUserCollection(userId, slug);
  }

  private async applyQuantity(userId: string, slug: string, stickerId: string, quantity: number) {
    const sticker = await this.prisma.sticker.findFirst({
      where: {
        code: stickerId,
        section: { collection: { slug } }
      },
      select: { id: true }
    });

    if (!sticker) {
      throw new NotFoundException('Sticker not found.');
    }

    if (quantity === 0) {
      await this.prisma.userStickerQuantity.deleteMany({
        where: { userId, stickerId: sticker.id }
      });
      return;
    }

    await this.prisma.userStickerQuantity.upsert({
      where: {
        userId_stickerId: {
          userId,
          stickerId: sticker.id
        }
      },
      update: { quantity },
      create: {
        userId,
        stickerId: sticker.id,
        quantity
      }
    });
  }
}
