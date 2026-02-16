import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBenefitDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsString()
  @MaxLength(80)
  iconKey!: string;

  @IsBoolean()
  active!: boolean;
}

export class UpdateBenefitDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  iconKey?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

