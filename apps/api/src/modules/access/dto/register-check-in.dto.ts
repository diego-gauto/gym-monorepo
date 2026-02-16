import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsLatitude, IsLongitude } from 'class-validator';

export class RegisterCheckInDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/)
  activitySlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gymLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  qrToken!: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
