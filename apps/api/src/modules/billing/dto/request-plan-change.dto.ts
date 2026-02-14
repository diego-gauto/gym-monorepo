import { PlanType } from '@gym-admin/shared';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum PlanRequestMode {
  SCHEDULED_CHANGE = 'scheduled_change',
  DEFERRED_ACTIVATION = 'deferred_activation',
}

export class RequestPlanChangeDto {
  @IsEnum(PlanType)
  newPlanId!: PlanType;

  @IsEnum(PlanRequestMode)
  mode!: PlanRequestMode;

  @IsOptional()
  @IsDateString()
  paidAccessEndsAt?: string;
}
