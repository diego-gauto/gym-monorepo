import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const CODE_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

export class CreateBranchDto {
  @IsString()
  @Matches(CODE_PATTERN)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsBoolean()
  active!: boolean;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @Matches(CODE_PATTERN)
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

