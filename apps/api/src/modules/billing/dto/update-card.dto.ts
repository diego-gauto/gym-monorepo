import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class UpdateCardDto {
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
}
