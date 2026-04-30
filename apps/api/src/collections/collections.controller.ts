import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BulkStickerQuantityDto, SetStickerQuantityDto } from './collections.dto';
import { CollectionsService } from './collections.service';

@UseGuards(JwtAuthGuard)
@Controller('me/collection')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get(':slug')
  getCollection(@CurrentUser() user: RequestUser, @Param('slug') slug: string) {
    return this.collectionsService.getUserCollection(user.id, slug);
  }

  @Patch(':slug/stickers/bulk')
  updateBulk(
    @CurrentUser() user: RequestUser,
    @Param('slug') slug: string,
    @Body() dto: BulkStickerQuantityDto
  ) {
    return this.collectionsService.setBulkQuantities(user.id, slug, dto.updates);
  }

  @Patch(':slug/stickers/:stickerId')
  updateSticker(
    @CurrentUser() user: RequestUser,
    @Param('slug') slug: string,
    @Param('stickerId') stickerId: string,
    @Body() dto: SetStickerQuantityDto
  ) {
    return this.collectionsService.setQuantity(user.id, slug, stickerId, dto.quantity);
  }
}
