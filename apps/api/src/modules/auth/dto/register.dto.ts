import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{7,8}$/, { message: 'DNI must be 7 or 8 digits' })
  dni!: string;

  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
