import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthProvider, MembershipStatus, UserRole } from '@gym-admin/shared';
import { User } from '../users/entities/user.entity';
import { UserAuth } from '../users/entities/user-auth.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const mockConfigService = {
    get: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const qb = {
    addSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockUserAuthRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('fake-jwt-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    qb.addSelect.mockReturnThis();
    qb.innerJoinAndSelect.mockReturnThis();
    qb.where.mockReturnThis();
    qb.andWhere.mockReturnThis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserAuth),
          useValue: mockUserAuthRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates a local active user, hashes password and returns session token', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((payload) => payload);
      mockUserAuthRepository.create.mockImplementation((payload) => payload);
      mockUserRepository.save.mockImplementation(async (payload) => ({
        ...payload,
        uuid: 'user-uuid',
        role: UserRole.USER,
      }));

      const result = await service.register({
        firstName: 'Juan',
        lastName: 'Perez',
        email: 'juan@email.com',
        phone: '11 5555 1234',
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
      const createdPayload = mockUserRepository.create.mock.calls[0][0];
      expect(createdPayload.status).toBe(MembershipStatus.ACTIVE);
      expect(createdPayload.auth.authProvider).toBe(AuthProvider.LOCAL);
      expect(createdPayload.auth.emailVerifiedAt).toBeInstanceOf(Date);
      expect(createdPayload.auth.password).not.toBe('Password123');
      expect(await bcrypt.compare('Password123', createdPayload.auth.password)).toBe(true);

      expect(result).toEqual({
        access_token: 'fake-jwt-token',
        user: {
          email: 'juan@email.com',
          role: UserRole.USER,
        },
      });
    });

    it('rejects when passwords do not match', async () => {
      await expect(
        service.register({
          firstName: 'Juan',
          lastName: 'Perez',
          email: 'juan@email.com',
          phone: '11 5555 1234',
          password: 'Password123',
          confirmPassword: 'Password124',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicated email with user-facing message', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 1, email: 'existing@email.com' });

      await expect(
        service.register({
          firstName: 'Juan',
          lastName: 'Perez',
          email: 'existing@email.com',
          phone: '11 5555 1234',
          password: 'Password123',
          confirmPassword: 'Password123',
        }),
      ).rejects.toThrow(new ConflictException('Ya tenés una cuenta'));
    });
  });

  describe('validateUser', () => {
    it('returns user without password for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      qb.getOne.mockResolvedValue({
        password: passwordHash,
        authProvider: AuthProvider.LOCAL,
        emailVerifiedAt: new Date(),
        user: {
          id: 1,
          uuid: 'user-uuid',
          email: 'user@email.com',
          role: UserRole.USER,
          status: MembershipStatus.ACTIVE,
        },
      });

      const result = await service.validateUser('user@email.com', 'Password123');
      expect(result).toMatchObject({
        email: 'user@email.com',
        role: UserRole.USER,
        status: MembershipStatus.ACTIVE,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('returns null for invalid credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      qb.getOne.mockResolvedValue({
        password: passwordHash,
        authProvider: AuthProvider.LOCAL,
        emailVerifiedAt: new Date(),
        user: {
          id: 1,
          uuid: 'user-uuid',
          email: 'user@email.com',
          role: UserRole.USER,
          status: MembershipStatus.ACTIVE,
        },
      });

      const result = await service.validateUser('user@email.com', 'WrongPassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('sets email_verified to true when auth has verified email', async () => {
      await service.login({
        uuid: 'user-uuid',
        email: 'verified@email.com',
        role: UserRole.USER,
        status: MembershipStatus.ACTIVE,
        auth: {
          authProvider: AuthProvider.LOCAL,
          emailVerifiedAt: new Date(),
        },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-uuid',
          email: 'verified@email.com',
          email_verified: true,
        }),
      );
    });

    it('sets email_verified to true for google provider even without verified date', async () => {
      await service.login({
        uuid: 'user-uuid',
        email: 'google@email.com',
        role: UserRole.USER,
        status: MembershipStatus.ACTIVE,
        auth: {
          authProvider: AuthProvider.GOOGLE,
          emailVerifiedAt: null,
        },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email_verified: true,
        }),
      );
    });

    it('sets email_verified to false when local provider has no verified date', async () => {
      await service.login({
        uuid: 'user-uuid',
        email: 'local@email.com',
        role: UserRole.USER,
        status: MembershipStatus.ACTIVE,
        auth: {
          authProvider: AuthProvider.LOCAL,
          emailVerifiedAt: null,
        },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email_verified: false,
        }),
      );
    });
  });

  describe('loginWithGoogle', () => {
    it('rejects when Google account email is not registered', async () => {
      mockConfigService.get.mockReturnValue('google-client-id');
      const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          aud: 'google-client-id',
          sub: 'google-sub-1',
          email: 'new-google@test.com',
          email_verified: 'true',
          given_name: 'Ana',
          family_name: 'Gomez',
        }),
      } as Response);

      mockUserAuthRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.loginWithGoogle('id-token-value')).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.create).not.toHaveBeenCalled();

      fetchMock.mockRestore();
    });

    it('updates existing auth data to GOOGLE provider for existing email', async () => {
      mockConfigService.get.mockReturnValue('google-client-id');
      const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          aud: 'google-client-id',
          sub: 'google-sub-updated',
          email: 'existing@test.com',
          email_verified: 'true',
          given_name: 'Maria',
          family_name: 'Lopez',
        }),
      } as Response);

      const existingUser = {
        id: 1,
        uuid: 'user-uuid',
        email: 'existing@test.com',
        role: UserRole.USER,
        status: MembershipStatus.ACTIVE,
        auth: {
          id: 10,
          userId: 1,
          authProvider: AuthProvider.LOCAL,
          emailVerifiedAt: null,
        },
      };

      mockUserAuthRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserAuthRepository.save.mockImplementation(async (payload) => payload);
      mockUserRepository.save.mockImplementation(async (payload) => payload);

      await service.loginWithGoogle('id-token-value');

      expect(mockUserAuthRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          authProvider: AuthProvider.GOOGLE,
          googleSub: 'google-sub-updated',
        }),
      );

      fetchMock.mockRestore();
    });
  });

  describe('loginWithGoogleCode', () => {
    it('exchanges authorization code and completes login', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'google-client-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'google-client-secret';
        return undefined;
      });

      const fetchMock = jest.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id_token: 'google-id-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            aud: 'google-client-id',
            sub: 'google-sub-code',
            email: 'code-user@test.com',
            email_verified: 'true',
            given_name: 'Code',
            family_name: 'User',
          }),
        } as Response);

      mockUserAuthRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(
        service.loginWithGoogleCode('auth-code', 'http://localhost:3000/auth/google/callback'),
      ).rejects.toThrow(NotFoundException);

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        }),
      );

      fetchMock.mockRestore();
    });
  });
});
