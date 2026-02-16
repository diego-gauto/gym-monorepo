import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, MembershipStatus, UserRole } from '@gym-admin/shared';
import { User } from '../users/entities/user.entity';
import { UserAuth } from '../users/entities/user-auth.entity';
import { AdminBootstrapService } from './admin-bootstrap.service';

describe('AdminBootstrapService', () => {
  let service: AdminBootstrapService;
  let userRepository: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let userAuthRepository: { create: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
    };

    userAuthRepository = {
      create: jest.fn((payload) => payload),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBootstrapService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(UserAuth),
          useValue: userAuthRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ADMIN_SEED_EMAIL') return 'admin@test.local';
              if (key === 'ADMIN_SEED_PASSWORD') return 'Admin123!';
              if (key === 'ADMIN_SEED_FIRST_NAME') return 'Admin';
              if (key === 'ADMIN_SEED_LAST_NAME') return 'Gym';
              if (key === 'NODE_ENV') return 'development';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AdminBootstrapService);
  });

  it('creates an admin user when it does not exist', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await service.onApplicationBootstrap();

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@test.local',
        role: UserRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      }),
    );

    const createUserPayload = userRepository.create.mock.calls[0]?.[0];
    expect(createUserPayload.auth.authProvider).toBe(AuthProvider.LOCAL);
    expect(createUserPayload.auth.emailVerifiedAt).toBeInstanceOf(Date);
    expect(createUserPayload.auth.password).toEqual(expect.any(String));
    expect(createUserPayload.auth.password).not.toBe('Admin123!');
    expect(userRepository.save).toHaveBeenCalled();
  });

  it('elevates existing user to ADMIN and ensures local auth password', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 1,
      email: 'admin@test.local',
      role: UserRole.USER,
      status: MembershipStatus.REJECTED,
      auth: {
        authProvider: AuthProvider.LOCAL,
        password: null,
        emailVerifiedAt: null,
      },
    });

    await service.onApplicationBootstrap();

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        role: UserRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        auth: expect.objectContaining({
          authProvider: AuthProvider.LOCAL,
          password: expect.any(String),
          emailVerifiedAt: expect.any(Date),
        }),
      }),
    );
  });
});
