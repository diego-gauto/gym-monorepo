import { IsEnum, IsOptional } from 'class-validator';

export enum AttendanceRange {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export class AttendanceRangeDto {
  @IsOptional()
  @IsEnum(AttendanceRange)
  range?: AttendanceRange;
}

