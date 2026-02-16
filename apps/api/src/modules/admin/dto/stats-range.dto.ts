import { IsIn, IsOptional } from 'class-validator';

const ALLOWED_RANGES = ['week', 'month', 'quarter', 'year'] as const;

export class StatsRangeQueryDto {
  @IsOptional()
  @IsIn(ALLOWED_RANGES)
  range?: (typeof ALLOWED_RANGES)[number];
}

