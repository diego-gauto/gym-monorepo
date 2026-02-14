import { PlanType } from '@gym-admin/shared';
import { Equals, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CheckoutPayDto {
  @IsEnum(PlanType)
  planId!: PlanType;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{13,19}$/)
  cardNumber!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,2}$/)
  expirationMonth!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2,4}$/)
  expirationYear!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3,4}$/)
  securityCode!: string;

  @IsString()
  @IsNotEmpty()
  cardholderName!: string;

  @IsString()
  @IsNotEmpty()
  identificationType!: string;

  @IsString()
  @IsNotEmpty()
  identificationNumber!: string;

  @IsString()
  @IsOptional()
  cardBrand?: string;

  @IsString()
  @IsOptional()
  cardIssuer?: string;

  @IsBoolean()
  @Equals(true, { message: 'Debés aceptar el débito recurrente para suscribirte.' })
  acceptedRecurringTerms!: boolean;
}
