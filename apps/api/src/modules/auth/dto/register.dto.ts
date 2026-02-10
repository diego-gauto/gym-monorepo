import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IRegisterRequest } from '@gym-admin/shared';

export class RegisterDto implements IRegisterRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @Matches(/^(?:\+54\s?)?(?:9\s?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}$/)
  phone!: string;

  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword!: string;
}
