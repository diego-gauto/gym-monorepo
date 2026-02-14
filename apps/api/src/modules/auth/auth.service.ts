import { Injectable, ConflictException, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { UserAuth } from '../users/entities/user-auth.entity';
import { RegisterDto } from './dto/register.dto';
import { AuthProvider, MembershipStatus } from '@gym-admin/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAuth)
    private readonly userAuthRepository: Repository<UserAuth>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const normalizedEmail = email.toLowerCase();
    const auth = await this.userAuthRepository
      .createQueryBuilder('auth')
      .addSelect('auth.password')
      .innerJoinAndSelect('auth.user', 'user')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .andWhere('auth.authProvider = :provider', { provider: AuthProvider.LOCAL })
      .getOne();

    if (!auth || !auth.password || !auth.user) return null;

    if (await bcrypt.compare(pass, auth.password)) {
      return {
        id: auth.user.id,
        uuid: auth.user.uuid,
        email: auth.user.email,
        role: auth.user.role,
        status: auth.user.status,
        authProvider: auth.authProvider,
        emailVerifiedAt: auth.emailVerifiedAt,
      };
    }

    return null;
  }

  async login(user: any) {
    const auth = user.auth;
    const payload = {
      sub: user.uuid,
      email: user.email,
      role: user.role,
      status: user.status,
      email_verified: Boolean(auth?.emailVerifiedAt) || auth?.authProvider === AuthProvider.GOOGLE,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        email: user.email,
        role: user.role,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async register(registerDto: RegisterDto): Promise<Record<string, unknown>> {
    const { email, firstName, lastName, phone, password, confirmPassword } = registerDto;
    const normalizedEmail = email.toLowerCase();

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.userRepository.findOne({ where: [{ email: normalizedEmail }] });

    if (existingUser) {
      throw new ConflictException('Ya tenés una cuenta');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      status: MembershipStatus.ACTIVE,
      auth: this.userAuthRepository.create({
        password: hashedPassword,
        authProvider: AuthProvider.LOCAL,
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
      }),
    });

    const savedUser = await this.userRepository.save(user);

    return this.login(savedUser);
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);

    const auth = await this.userAuthRepository.findOne({
      where: { emailVerificationTokenHash: tokenHash },
      relations: ['user'],
      select: ['id', 'emailVerificationTokenExpiresAt'],
    });

    if (!auth || !auth.emailVerificationTokenExpiresAt) {
      throw new BadRequestException('Invalid verification token');
    }

    if (auth.emailVerificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    await this.userAuthRepository.update(auth.id, {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationTokenExpiresAt: null,
    });

    await this.userRepository.update(auth.user.id, {
      status: MembershipStatus.ACTIVE,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(_email?: string) {
    return { message: 'La verificación por email no está habilitada en este flujo.' };
  }

  private async verifyGoogleToken(idToken: string) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) throw new UnauthorizedException('Google auth not configured');

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) throw new UnauthorizedException('Invalid Google token');

    const data = await response.json() as {
      aud?: string;
      sub?: string;
      email?: string;
      email_verified?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
    };

    if (data.aud !== googleClientId || !data.email || !data.sub) {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (data.email_verified !== 'true') {
      throw new ForbiddenException('Google email is not verified');
    }

    return data;
  }

  private async upsertGoogleUser(google: {
    sub?: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
  }) {
    const email = google.email!.toLowerCase();

    const authByGoogle = await this.userAuthRepository.findOne({
      where: {
        authProvider: AuthProvider.GOOGLE,
        googleSub: google.sub,
      },
      relations: ['user'],
    });

    let user: User | null = authByGoogle?.user ?? null;
    let userAuth: UserAuth | null = authByGoogle ?? null;

    if (!user) {
      user = await this.userRepository.findOne({
        where: { email },
        relations: ['auth'],
      });
      userAuth = user?.auth ?? null;
    }

    if (!user) {
      throw new NotFoundException('No existe una cuenta registrada con ese email. Registrate primero.');
    }

    const authToUpdate = userAuth || this.userAuthRepository.create({ userId: user.id });
    authToUpdate.authProvider = AuthProvider.GOOGLE;
    authToUpdate.googleSub = google.sub;
    authToUpdate.emailVerifiedAt = authToUpdate.emailVerifiedAt || new Date();
    await this.userAuthRepository.save(authToUpdate);
    user.auth = authToUpdate;

    return this.userRepository.save(user);
  }

  private async exchangeGoogleCode(code: string, redirectUri: string): Promise<string> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const googleClientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    if (!googleClientId || !googleClientSecret) {
      throw new UnauthorizedException('Google auth not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException('Invalid Google authorization code');
    }

    const tokenData = await tokenResponse.json() as { id_token?: string };
    if (!tokenData.id_token) {
      throw new UnauthorizedException('Google did not return id_token');
    }

    return tokenData.id_token;
  }

  async loginWithGoogle(idToken: string) {
    const google = await this.verifyGoogleToken(idToken);
    const user = await this.upsertGoogleUser(google);

    return this.login(user);
  }

  async loginWithGoogleCode(code: string, redirectUri: string) {
    const idToken = await this.exchangeGoogleCode(code, redirectUri);
    return this.loginWithGoogle(idToken);
  }
}
