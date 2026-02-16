import { IsString, MaxLength } from 'class-validator';

export class UpdateSiteSettingsDto {
  @IsString()
  @MaxLength(120)
  heroBadge!: string;

  @IsString()
  @MaxLength(200)
  heroTitle!: string;

  @IsString()
  @MaxLength(800)
  heroSubtitle!: string;

  @IsString()
  @MaxLength(500)
  heroBackgroundImage!: string;

  @IsString()
  @MaxLength(120)
  gymName!: string;

  @IsString()
  @MaxLength(220)
  gymAddress!: string;

  @IsString()
  @MaxLength(120)
  gymEmail!: string;

  @IsString()
  @MaxLength(80)
  gymPhone!: string;
}

