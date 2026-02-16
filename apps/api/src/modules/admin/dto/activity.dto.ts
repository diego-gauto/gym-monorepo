import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateActivityDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(120)
  slug!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(240)
  shortDescription!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsString()
  @MaxLength(500)
  cardImage!: string;

  @IsString()
  @MaxLength(120)
  level!: string;

  @IsString()
  @MaxLength(120)
  duration!: string;

  @IsArray()
  @IsString({ each: true })
  benefits!: string[];

  @IsArray()
  @IsString({ each: true })
  schedule!: string[];

  @IsArray()
  @IsString({ each: true })
  successCriteria!: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  trainerIds!: string[];

  @IsBoolean()
  active!: boolean;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cardImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  duration?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schedule?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  successCriteria?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  trainerIds?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

