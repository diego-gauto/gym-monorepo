import { CurrencyCode } from '@gym-admin/shared';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const PLAN_ID_PATTERN = /^[A-Z_]+$/;

export class UpsertPlanContentDto {
  @IsString()
  @Matches(PLAN_ID_PATTERN)
  @MaxLength(40)
  id!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(1200)
  description!: string;

  @IsNumber()
  price!: number;

  @IsEnum(CurrencyCode)
  currency!: CurrencyCode;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  features!: string[];

  @IsBoolean()
  highlight!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  badge?: string | null;

  @IsBoolean()
  active!: boolean;
}

