import { IsString, IsNotEmpty, IsOptional, Length, IsInt, Min, Max } from 'class-validator';
import { IUpdateCardRequest } from '@gym-admin/shared';

export class UpdateCardDto implements IUpdateCardRequest {
  @IsString()
  @IsNotEmpty()
  mercadopagoCardId!: string;

  @IsString()
  @IsNotEmpty()
  cardBrand!: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  cardLastFour!: string;

  @IsString()
  @IsNotEmpty()
  cardIssuer!: string;

  @IsString()
  @IsOptional()
  mercadopagoCustomerId?: string;

  @IsString()
  @IsOptional()
  cardholderName?: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  cardExpirationMonth?: number;

  @IsInt()
  @Min(2000)
  @Max(2999)
  @IsOptional()
  cardExpirationYear?: number;
}
