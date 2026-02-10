import { Injectable, ConflictException, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { MembershipStatus } from '@gym-admin/shared';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: ['id', 'uuid', 'email', 'password', 'role', 'status', 'authProvider', 'emailVerifiedAt'],
    });

    if (!user || !user.password) return null;

    if (await bcrypt.compare(pass, user.password)) {
      if (user.authProvider === 'LOCAL' && !user.emailVerifiedAt) {
        throw new ForbiddenException('EMAIL_NOT_VERIFIED');
      }

      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(user: any) {
    const payload = {
      sub: user.uuid,
      email: user.email,
      role: user.role,
      status: user.status,
      email_verified: Boolean(user.emailVerifiedAt) || user.authProvider === 'GOOGLE',
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueEmailVerification(user: User) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await this.userRepository.update(user.id, {
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt,
    });

    return rawToken;
  }

  async register(registerDto: RegisterDto): Promise<Record<string, unknown>> {
    const { email, firstName, lastName, phone, password, confirmPassword } = registerDto;
    const normalizedEmail = email.toLowerCase();

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.userRepository.findOne({ where: [{ email: normalizedEmail }] });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      authProvider: 'LOCAL',
      emailVerifiedAt: null,
      status: MembershipStatus.EXPIRED,
    });

    const savedUser = await this.userRepository.save(user);
    const verificationToken = await this.issueEmailVerification(savedUser);

    return {
      message: 'Te enviamos un email para verificar tu cuenta',
      email: savedUser.email,
      ...(process.env.NODE_ENV !== 'production' ? { verificationToken } : {}),
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);

    const user = await this.userRepository.findOne({
      where: { emailVerificationTokenHash: tokenHash },
      select: ['id', 'emailVerificationTokenExpiresAt', 'emailVerifiedAt'],
    });

    if (!user || !user.emailVerificationTokenExpiresAt) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.emailVerificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    await this.userRepository.update(user.id, {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationTokenExpiresAt: null,
      status: MembershipStatus.ACTIVE,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      select: ['id', 'email', 'authProvider', 'emailVerifiedAt'],
    });

    if (!user || user.authProvider !== 'LOCAL') {
      return { message: 'If the account exists, a verification email has been sent.' };
    }

    if (user.emailVerifiedAt) {
      return { message: 'Email already verified.' };
    }

    const verificationToken = await this.issueEmailVerification(user as User);

    return {
      message: 'If the account exists, a verification email has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { verificationToken } : {}),
    };
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

  async loginWithGoogle(idToken: string) {
    const google = await this.verifyGoogleToken(idToken);
    const email = google.email!.toLowerCase();

    let user = await this.userRepository.findOne({ where: [{ googleSub: google.sub }, { email }] });

    if (!user) {
      const fallbackName = google.name || email.split('@')[0];
      const nameParts = fallbackName.trim().split(/\s+/);
      const derivedFirstName = (google.given_name || nameParts[0] || 'Usuario').trim();
      const derivedLastName = (google.family_name || nameParts.slice(1).join(' ') || '-').trim();

      const newUser = this.userRepository.create({
        firstName: derivedFirstName,
        lastName: derivedLastName,
        email,
        authProvider: 'GOOGLE',
        googleSub: google.sub,
        emailVerifiedAt: new Date(),
      });
      user = await this.userRepository.save(newUser);
    } else if (!user.googleSub) {
      user.googleSub = google.sub;
      user.authProvider = 'GOOGLE';
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      user = await this.userRepository.save(user);
    }

    return this.login(user);
  }
}
