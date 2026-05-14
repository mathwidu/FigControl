import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfileRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(24)
  nickname?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cityName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  stateCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string | null;

  @IsOptional()
  @IsBoolean()
  exchangeOptIn?: boolean;
}
