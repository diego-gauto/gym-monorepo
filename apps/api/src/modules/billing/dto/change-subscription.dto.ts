import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class ChangeSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  newPlanId!: string;

  @IsDateString()
  @IsNotEmpty()
  effectiveAt!: string;
}
