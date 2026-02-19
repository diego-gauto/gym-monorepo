import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccessService } from './access.service';
import { User } from '../users/entities/user.entity';
import { MedicalCertificate } from './entities/medical-certificate.entity';
import { InvoiceStatus, MembershipStatus } from '@gym-admin/shared';
import { UnauthorizedException } from '@nestjs/common';
import { Plan } from '../billing/entities/plan.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Attendance } from './entities/attendance.entity';
import { ConfigService } from '@nestjs/config';

describe('AccessService', () => {
  let service: AccessService;
  let userRepo: any;
  let certRepo: any;
  let subscriptionRepo: any;
  let invoiceRepo: any;
  let planRepo: any;
  let attendanceRepo: any;
  let configGet: jest.Mock;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
    };
    certRepo = {
      findOne: jest.fn(),
    };
    subscriptionRepo = {
      findOne: jest.fn(),
    };
    invoiceRepo = {
      findOne: jest.fn(),
    };
    planRepo = {
      findOne: jest.fn(),
    };
    attendanceRepo = {
      create: jest.fn((payload) => payload),
      save: jest.fn((payload) => Promise.resolve(payload)),
    };
    configGet = jest.fn((key: string) => {
      if (key === 'ACCESS_SINGLE_PERIOD_DAYS') return 30;
      if (key === 'ACCESS_SINGLE_GRACE_DAYS') return 7;
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      if (key === 'CHECKIN_QR_SECRET') return 'test-qr-secret';
      if (key === 'CHECKIN_OPEN_TIME') return '00:00';
      if (key === 'CHECKIN_CLOSE_TIME') return '23:59';
      if (key === 'CHECKIN_TIMEZONE') return 'UTC';
      if (key === 'CHECKIN_REQUIRE_GEOLOCATION') return 'false';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(MedicalCertificate), useValue: certRepo },
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(Plan), useValue: planRepo },
        { provide: getRepositoryToken(Attendance), useValue: attendanceRepo },
        {
          provide: ConfigService,
          useValue: {
            get: configGet,
          },
        },
      ],
    }).compile();

    service = module.get<AccessService>(AccessService);
  });

  describe('getCheckInEligibility', () => {
    const getValidQrToken = () => service.generateCheckInQr('main').token;

    it('should throw UnauthorizedException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getCheckInEligibility('uuid', 'main', getValidQrToken())).rejects.toThrow(UnauthorizedException);
    });

    it('should deny access when membership is invalid', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 10,
        status: MembershipStatus.REJECTED,
      });
      subscriptionRepo.findOne.mockResolvedValue(null);
      invoiceRepo.findOne.mockResolvedValue(null);
      planRepo.findOne.mockResolvedValue(null);
      certRepo.findOne.mockResolvedValue({
        validUntil: new Date('2099-01-01T00:00:00.000Z'),
      });

      const result = await service.getCheckInEligibility('uuid', 'main', getValidQrToken());
      expect(result.canCheckIn).toBe(false);
      expect(result.reason).toMatch(/suscripción|período/i);
    });

    it('should deny access when user is ACTIVE but has no subscription or paid period', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 10,
        status: MembershipStatus.ACTIVE,
      });
      subscriptionRepo.findOne.mockResolvedValue(null);
      invoiceRepo.findOne.mockResolvedValue(null);
      planRepo.findOne.mockResolvedValue(null);
      certRepo.findOne.mockResolvedValue({
        validUntil: new Date('2099-01-01T00:00:00.000Z'),
      });

      const result = await service.getCheckInEligibility('uuid', 'main', getValidQrToken());
      expect(result.canCheckIn).toBe(false);
      expect(result.membership?.source).toBe('NONE');
    });

    it('should allow access when user has active subscription and valid certificate', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        uuid: 'user-1',
        status: MembershipStatus.ACTIVE,
        firstName: 'Juan',
        lastName: 'Pérez',
      });
      subscriptionRepo.findOne.mockResolvedValue({
        id: 11,
        status: MembershipStatus.ACTIVE,
        endDate: new Date('2099-01-01T00:00:00.000Z'),
      });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2099, 0, 1) });

      const result = await service.getCheckInEligibility('uuid', 'main', getValidQrToken());
      expect(result.canCheckIn).toBe(true);
      expect(result.user?.name).toBe('Juan Pérez');
      expect(result.membership?.source).toBe('SUBSCRIPTION');
    });

    it('should deny access if certificate is expired even with valid membership', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, uuid: 'user-1', status: MembershipStatus.ACTIVE });
      subscriptionRepo.findOne.mockResolvedValue({
        id: 11,
        status: MembershipStatus.ACTIVE,
        endDate: new Date('2099-01-01T00:00:00.000Z'),
      });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2000, 0, 1) });

      const result = await service.getCheckInEligibility('uuid', 'main', getValidQrToken());
      expect(result.canCheckIn).toBe(false);
      expect(result.reason).toMatch(/apto físico/i);
    });

    it('should allow access for one-time paid period in grace with valid certificate', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, uuid: 'user-1', status: MembershipStatus.REJECTED });
      subscriptionRepo.findOne.mockResolvedValue(null);
      const paidAt = new Date();
      paidAt.setDate(paidAt.getDate() - 33); // 30 + 7 grace => still valid
      invoiceRepo.findOne.mockResolvedValue({
        status: InvoiceStatus.PAID,
        paidAt,
        amount: 10000,
        currency: 'ARS',
      });
      planRepo.findOne.mockResolvedValue(null);
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2099, 0, 1) });

      const result = await service.getCheckInEligibility('uuid', 'main', getValidQrToken());
      expect(result.canCheckIn).toBe(true);
      expect(result.membership?.source).toBe('ONE_TIME_PERIOD');
    });

    it('should keep quarterly one-time period active according to plan price', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, uuid: 'user-1', status: MembershipStatus.ACTIVE });
      subscriptionRepo.findOne.mockResolvedValue(null);
      const paidAt = new Date();
      paidAt.setDate(paidAt.getDate() - 70);
      invoiceRepo.findOne.mockResolvedValue({
        status: InvoiceStatus.PAID,
        paidAt,
        amount: 36000,
        currency: 'ARS',
      });
      planRepo.findOne.mockResolvedValue({
        id: 'QUARTERLY',
      });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2099, 0, 1) });

      const result = await service.getCheckInEligibility('uuid', 'main', getValidQrToken());
      expect(result.canCheckIn).toBe(true);
      expect(result.membership?.source).toBe('ONE_TIME_PERIOD');
    });
  });

  describe('registerCheckIn', () => {
    const getValidQrToken = () => service.generateCheckInQr('main').token;

    it('should register attendance with selected activity and gym location', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        uuid: 'user-uuid',
        status: MembershipStatus.ACTIVE,
        firstName: 'Juan',
        lastName: 'Pérez',
      });
      subscriptionRepo.findOne.mockResolvedValue({
        id: 11,
        status: MembershipStatus.ACTIVE,
        endDate: new Date('2099-01-01T00:00:00.000Z'),
      });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2099, 0, 1) });

      const result = await service.registerCheckIn('user-uuid', {
        activitySlug: 'yoga',
        gymLocation: 'main',
        deviceId: 'scanner-1',
        qrToken: getValidQrToken(),
      });

      expect(attendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          activitySlug: 'yoga',
          gymLocation: 'main',
          deviceId: 'scanner-1',
        }),
      );
      expect(result.activitySlug).toBe('yoga');
    });

    it('should reject invalid activities', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        uuid: 'user-uuid',
        status: MembershipStatus.ACTIVE,
      });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2099, 0, 1) });

      await expect(
        service.registerCheckIn('user-uuid', {
          activitySlug: 'actividad-inexistente',
          gymLocation: 'main',
          qrToken: getValidQrToken(),
        }),
      ).rejects.toThrow(/actividad/i);
    });

    it('should reject check-in when geolocation is required and coordinates are missing', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'ACCESS_SINGLE_PERIOD_DAYS') return 30;
        if (key === 'ACCESS_SINGLE_GRACE_DAYS') return 7;
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        if (key === 'CHECKIN_QR_SECRET') return 'test-qr-secret';
        if (key === 'CHECKIN_OPEN_TIME') return '00:00';
        if (key === 'CHECKIN_CLOSE_TIME') return '23:59';
        if (key === 'CHECKIN_TIMEZONE') return 'UTC';
        if (key === 'CHECKIN_REQUIRE_GEOLOCATION') return 'true';
        if (key === 'CHECKIN_MAIN_LAT') return -34.6037;
        if (key === 'CHECKIN_MAIN_LNG') return -58.3816;
        if (key === 'CHECKIN_MAIN_RADIUS_METERS') return 200;
        return undefined;
      });

      userRepo.findOne.mockResolvedValue({
        id: 1,
        uuid: 'user-uuid',
        status: MembershipStatus.ACTIVE,
        firstName: 'Juan',
        lastName: 'Pérez',
      });
      subscriptionRepo.findOne.mockResolvedValue({
        id: 11,
        status: MembershipStatus.ACTIVE,
        endDate: new Date('2099-01-01T00:00:00.000Z'),
      });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2099, 0, 1) });

      await expect(
        service.registerCheckIn('user-uuid', {
          activitySlug: 'yoga',
          gymLocation: 'main',
          qrToken: service.generateCheckInQr('main').token,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateCheckInQr', () => {
    it('should generate QR payload for a valid gym location', () => {
      const result = service.generateCheckInQr('sede_centro');
      expect(result.gymLocation).toBe('sede_centro');
      expect(result.token).toEqual(expect.any(String));
      expect(result.checkInUrl).toContain('http://localhost:3000/check-in?gym=sede_centro&t=');
      expect(result.qrImageUrl).toContain(encodeURIComponent(result.checkInUrl));
      expect(result.generatedAt).toEqual(expect.any(String));
    });

    it('should fallback to main for invalid gym location values', () => {
      const result = service.generateCheckInQr('../../invalid');
      expect(result.gymLocation).toBe('main');
      expect(result.checkInUrl).toContain('http://localhost:3000/check-in?gym=main&t=');
    });

    it('should normalize FRONTEND_URL to origin when env contains a path', () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://demo.ngrok-free.app/auth/google/callback';
        if (key === 'CHECKIN_QR_SECRET') return 'test-qr-secret';
        if (key === 'CHECKIN_OPEN_TIME') return '00:00';
        if (key === 'CHECKIN_CLOSE_TIME') return '23:59';
        if (key === 'CHECKIN_TIMEZONE') return 'UTC';
        if (key === 'CHECKIN_REQUIRE_GEOLOCATION') return 'false';
        if (key === 'ACCESS_SINGLE_PERIOD_DAYS') return 30;
        if (key === 'ACCESS_SINGLE_GRACE_DAYS') return 7;
        return undefined;
      });

      const result = service.generateCheckInQr('main');
      expect(result.checkInUrl).toContain('https://demo.ngrok-free.app/check-in?gym=main&t=');
    });

    it('should keep the same daily token when requested multiple times on same day', () => {
      const first = service.generateCheckInQr('main');
      const second = service.generateCheckInQr('main');

      expect(first.token).toBe(second.token);
      expect(first.checkInUrl).toBe(second.checkInUrl);
    });
  });
});
