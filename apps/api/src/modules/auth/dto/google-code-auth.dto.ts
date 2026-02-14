import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class GoogleCodeAuthDto {
  @IsNotEmpty()
  @IsString()
  code!: string;

  @IsNotEmpty()
  @IsString()
  @IsUrl({ require_tld: false })
  redirectUri!: string;
}
