import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get(':slug')
  async getCatalog(@Param('slug') slug: string) {
    const catalog = await this.catalogService.getCatalog(slug);
    if (!catalog) {
      throw new NotFoundException('Catalog not found.');
    }
    return catalog;
  }
}
