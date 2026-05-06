import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateProfileRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(24)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cityName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  stateCode?: string;

  @IsOptional()
  @IsBoolean()
  exchangeOptIn?: boolean;
}

