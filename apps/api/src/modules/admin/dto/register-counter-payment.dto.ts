import { PaymentMethod, PlanType } from '@gym-admin/shared';
import { IsEnum, IsIn, IsString, IsUUID } from 'class-validator';

const COUNTER_PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.POSTNET,
  PaymentMethod.QR,
  PaymentMethod.BANK_TRANSFER,
] as const;

export class RegisterCounterPaymentDto {
  @IsString()
  @IsUUID()
  userUuid!: string;

  @IsEnum(PlanType)
  planId!: PlanType;

  @IsIn(COUNTER_PAYMENT_METHODS)
  paymentMethod!: (typeof COUNTER_PAYMENT_METHODS)[number];
}
