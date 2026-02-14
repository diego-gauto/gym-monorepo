import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthProvider, MembershipStatus, UserRole } from '@gym-admin/shared';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { User } from '../users/entities/user.entity';
import { UserAuth } from '../users/entities/user-auth.entity';

type Where<T> = Partial<Record<keyof T, unknown>>;

describe('Auth module integration', () => {
  let authService: AuthService;
  let authController: AuthController;
  let localStrategy: LocalStrategy;
  const configServiceMock = {
    get: jest.fn(),
  };

  const users: User[] = [];
  const auths: UserAuth[] = [];
  let userSeq = 1;
  let authSeq = 1;

  const userRepository = {
    create: jest.fn((payload: Partial<User>) => payload as User),
    findOne: jest.fn(async ({ where }: { where?: Where<User> | Where<User>[] }) => {
      const conditions = Array.isArray(where) ? where : [where ?? {}];
      return users.find((user: User) =>
        conditions.some((condition: Where<User>) =>
          Object.entries(condition).every(([key, value]) => {
            if (key === 'email' && typeof value === 'string') {
              return user.email?.toLowerCase() === value.toLowerCase();
            }
            return (user as unknown as Record<string, unknown>)[key] === value;
          }),
        ),
      ) ?? null;
    }),
    save: jest.fn(async (entity: User) => {
      const current = entity;
      if (!current.id) {
        current.id = userSeq++;
        current.uuid = current.uuid ?? `user-${current.id}`;
        current.role = current.role ?? UserRole.USER;
        current.status = current.status ?? MembershipStatus.ACTIVE;
      }

      if (current.auth) {
        const auth = current.auth;
        if (!auth.id) auth.id = authSeq++;
        auth.userId = current.id;
        auth.user = current;
        auth.authProvider = auth.authProvider ?? AuthProvider.LOCAL;
        const existingAuthIndex = auths.findIndex((entry: UserAuth) => entry.id === auth.id);
        if (existingAuthIndex >= 0) auths[existingAuthIndex] = auth;
        else auths.push(auth);
      }

      const existingUserIndex = users.findIndex((saved: User) => saved.id === current.id);
      if (existingUserIndex >= 0) users[existingUserIndex] = current;
      else users.push(current);

      return current;
    }),
    update: jest.fn(async (id: number, partial: Partial<User>) => {
      const user = users.find((entry: User) => entry.id === id);
      if (user) Object.assign(user, partial);
      return { affected: user ? 1 : 0 };
    }),
  };

  const userAuthRepository = {
    create: jest.fn((payload: Partial<UserAuth>) => payload as UserAuth),
    save: jest.fn(async (entity: UserAuth) => {
      const current = entity;
      if (!current.id) current.id = authSeq++;
      const user = current.user ?? users.find((entry: User) => entry.id === current.userId);
      if (user) {
        current.user = user;
        current.userId = user.id;
        user.auth = current;
      }
      const existingIndex = auths.findIndex((entry: UserAuth) => entry.id === current.id);
      if (existingIndex >= 0) auths[existingIndex] = current;
      else auths.push(current);
      return current;
    }),
    findOne: jest.fn(async ({ where }: { where?: Where<UserAuth> }) => {
      if (!where) return null;
      return auths.find((auth: UserAuth) =>
        Object.entries(where).every(([key, value]) =>
          (auth as unknown as Record<string, unknown>)[key] === value,
        ),
      ) ?? null;
    }),
    update: jest.fn(async (id: number, partial: Partial<UserAuth>) => {
      const auth = auths.find((entry: UserAuth) => entry.id === id);
      if (auth) Object.assign(auth, partial);
      return { affected: auth ? 1 : 0 };
    }),
    createQueryBuilder: jest.fn(() => {
      const state: { email?: string; provider?: AuthProvider } = {};
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation((_sql: string, params: { email: string }) => {
          state.email = params.email;
          return qb;
        }),
        andWhere: jest.fn().mockImplementation((_sql: string, params: { provider: AuthProvider }) => {
          state.provider = params.provider;
          return qb;
        }),
        getOne: jest.fn().mockImplementation(async () => {
          const email = state.email?.toLowerCase();
          if (!email || !state.provider) return null;
          const auth = auths.find((entry: UserAuth) =>
            entry.authProvider === state.provider &&
            entry.user?.email?.toLowerCase() === email,
          );
          return auth ?? null;
        }),
      };
      return qb;
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'integration-secret' })],
      controllers: [AuthController],
      providers: [
        AuthService,
        LocalStrategy,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(UserAuth),
          useValue: userAuthRepository,
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    authController = moduleRef.get<AuthController>(AuthController);
    localStrategy = moduleRef.get<LocalStrategy>(LocalStrategy);
  });

  beforeEach(() => {
    users.length = 0;
    auths.length = 0;
    userSeq = 1;
    authSeq = 1;
    jest.clearAllMocks();
  });

  it('registers and then logs in with the created user', async () => {
    const registerBody = {
      firstName: 'Ana',
      lastName: 'Gomez',
      email: 'ana@test.com',
      phone: '11 5555 1234',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    const registerResponse = await authController.register(registerBody);
    expect(registerResponse).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        user: {
          email: 'ana@test.com',
          role: UserRole.USER,
        },
      }),
    );

    expect(users).toHaveLength(1);
    expect(users[0]?.status).toBe(MembershipStatus.ACTIVE);
    expect(auths).toHaveLength(1);
    expect(auths[0]?.password).not.toBe('Password123');
    expect(auths[0]?.authProvider).toBe(AuthProvider.LOCAL);

    const validatedUser = await localStrategy.validate('ana@test.com', 'Password123');
    const loginResponse = await authController.login({ user: validatedUser });
    expect(loginResponse).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        user: {
          email: 'ana@test.com',
          role: UserRole.USER,
        },
      }),
    );
  });

  it('rejects duplicate register and invalid login credentials', async () => {
    const body = {
      firstName: 'Ana',
      lastName: 'Gomez',
      email: 'ana@test.com',
      phone: '11 5555 1234',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    await authService.register(body);

    await expect(authService.register(body)).rejects.toThrow(new ConflictException('Ya tenés una cuenta'));
    await expect(localStrategy.validate('ana@test.com', 'WrongPassword')).rejects.toThrow(
      new UnauthorizedException('Invalid credentials'),
    );
  });

  it('authenticates registered user with Google and persists provider/sub fields', async () => {
    await authService.register({
      firstName: 'Google',
      lastName: 'User',
      email: 'google-user@test.com',
      phone: '11 4444 2222',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    configServiceMock.get.mockReturnValue('google-client-id');
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        aud: 'google-client-id',
        sub: 'google-sub-999',
        email: 'google-user@test.com',
        email_verified: 'true',
        given_name: 'Google',
        family_name: 'User',
      }),
    } as Response);

    const response = await authController.google({ idToken: 'google-token' });

    expect(response).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        user: {
          email: 'google-user@test.com',
          role: UserRole.USER,
        },
      }),
    );
    expect(users).toHaveLength(1);
    expect(auths).toHaveLength(1);
    expect(auths[0]?.authProvider).toBe(AuthProvider.GOOGLE);
    expect(auths[0]?.googleSub).toBe('google-sub-999');
    expect(auths[0]?.emailVerifiedAt).toBeInstanceOf(Date);

    fetchMock.mockRestore();
  });

  it('authenticates with Google authorization code endpoint', async () => {
    await authService.register({
      firstName: 'Google',
      lastName: 'Code',
      email: 'google-code@test.com',
      phone: '11 3333 7777',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    configServiceMock.get.mockImplementation((key: string) => {
      if (key === 'GOOGLE_CLIENT_ID') return 'google-client-id';
      if (key === 'GOOGLE_CLIENT_SECRET') return 'google-client-secret';
      return undefined;
    });

    const fetchMock = jest.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id_token: 'google-id-token-from-code' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          aud: 'google-client-id',
          sub: 'google-sub-code-endpoint',
          email: 'google-code@test.com',
          email_verified: 'true',
          given_name: 'Google',
          family_name: 'Code',
        }),
      } as Response);

    const response = await authController.googleWithCode({
      code: 'auth-code',
      redirectUri: 'http://localhost:3000/auth/google/callback',
    });

    expect(response).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        user: {
          email: 'google-code@test.com',
          role: UserRole.USER,
        },
      }),
    );
    expect(auths[0]?.authProvider).toBe(AuthProvider.GOOGLE);
    expect(auths[0]?.googleSub).toBe('google-sub-code-endpoint');

    fetchMock.mockRestore();
  });

  it('rejects Google login when account email is not registered', async () => {
    configServiceMock.get.mockReturnValue('google-client-id');
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        aud: 'google-client-id',
        sub: 'google-sub-not-found',
        email: 'google-missing@test.com',
        email_verified: 'true',
        given_name: 'Missing',
        family_name: 'User',
      }),
    } as Response);

    await expect(authController.google({ idToken: 'google-token' })).rejects.toThrow(
      new NotFoundException('No existe una cuenta registrada con ese email. Registrate primero.'),
    );

    fetchMock.mockRestore();
  });
});
