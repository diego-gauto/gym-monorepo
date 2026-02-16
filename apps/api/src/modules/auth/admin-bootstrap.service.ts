import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthProvider, MembershipStatus, UserRole } from '@gym-admin/shared';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserAuth } from '../users/entities/user-auth.entity';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAuth)
    private readonly userAuthRepository: Repository<UserAuth>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureAdminUser();
  }

  private getSeedConfig() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const isProduction = nodeEnv === 'production';
    const fallbackEmail = isProduction ? '' : 'admin@gym.local';
    const fallbackPassword = isProduction ? '' : 'Admin123!';

    const email = (this.configService.get<string>('ADMIN_SEED_EMAIL') ?? fallbackEmail).trim().toLowerCase();
    const password = (this.configService.get<string>('ADMIN_SEED_PASSWORD') ?? fallbackPassword).trim();
    const firstName = (this.configService.get<string>('ADMIN_SEED_FIRST_NAME') ?? 'Admin').trim() || 'Admin';
    const lastName = (this.configService.get<string>('ADMIN_SEED_LAST_NAME') ?? 'Gym').trim() || 'Gym';

    return { email, password, firstName, lastName };
  }

  private async ensureAdminUser() {
    const { email, password, firstName, lastName } = this.getSeedConfig();
    if (!email || !password) {
      this.logger.warn('ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD no definidos. Se omite seed de admin.');
      return;
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 10);

    if (!existing) {
      const user = this.userRepository.create({
        firstName,
        lastName,
        email,
        status: MembershipStatus.ACTIVE,
        role: UserRole.ADMIN,
        auth: this.userAuthRepository.create({
          authProvider: AuthProvider.LOCAL,
          password: passwordHash,
          emailVerifiedAt: new Date(),
          emailVerificationTokenHash: null,
          emailVerificationTokenExpiresAt: null,
        }),
      });

      await this.userRepository.save(user);
      this.logger.log(`Usuario admin inicial creado: ${email}`);
      return;
    }

    existing.role = UserRole.ADMIN;
    existing.status = MembershipStatus.ACTIVE;

    if (!existing.auth) {
      existing.auth = this.userAuthRepository.create({
        userId: existing.id,
      });
    }

    existing.auth.password = passwordHash;
    existing.auth.authProvider = AuthProvider.LOCAL;
    existing.auth.emailVerifiedAt = existing.auth.emailVerifiedAt ?? new Date();
    existing.auth.emailVerificationTokenHash = null;
    existing.auth.emailVerificationTokenExpiresAt = null;

    await this.userRepository.save(existing);
    this.logger.log(`Usuario admin listo: ${email}`);
  }
}
