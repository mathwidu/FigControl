import { ArrayMaxSize, IsArray, IsInt, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SetStickerQuantityDto {
  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}

export class BulkStickerQuantityItemDto {
  @IsString()
  @MaxLength(24)
  stickerId!: string;

  @IsInt()
  @Min(0)
  @Max(99)
  quantity!: number;
}

export class BulkStickerQuantityDto {
  @IsArray()
  @ArrayMaxSize(1_000)
  @ValidateNested({ each: true })
  @Type(() => BulkStickerQuantityItemDto)
  updates!: BulkStickerQuantityItemDto[];
}
