import { IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SetStickerQuantityDto {
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}

export class BulkStickerQuantityItemDto {
  @IsString()
  stickerId!: string;

  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}

export class BulkStickerQuantityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkStickerQuantityItemDto)
  updates!: BulkStickerQuantityItemDto[];
}
