import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { IRegisterRequest } from '@gym-admin/shared';

export class RegisterDto implements IRegisterRequest {
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @Matches(/^[0-9+\-\s]{8,20}$/)
  phone!: string;

  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword!: string;
}
