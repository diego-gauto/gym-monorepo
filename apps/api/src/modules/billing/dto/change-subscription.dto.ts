import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';
import { IChangeSubscriptionRequest, PlanType } from '@gym-admin/shared';

export class ChangeSubscriptionDto implements IChangeSubscriptionRequest {
  @IsEnum(PlanType)
  @IsNotEmpty()
  newPlanId!: PlanType;

  @IsDateString()
  @IsNotEmpty()
  effectiveAt!: string;
}
