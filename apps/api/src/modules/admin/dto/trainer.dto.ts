import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTrainerDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(1200)
  bio!: string;

  @IsString()
  @MaxLength(500)
  avatarUrl!: string;

  @IsBoolean()
  active!: boolean;
}

export class UpdateTrainerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

