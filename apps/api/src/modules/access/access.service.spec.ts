import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccessService } from './access.service';
import { User } from '../users/entities/user.entity';
import { MedicalCertificate } from './entities/medical-certificate.entity';
import { MembershipStatus } from '@gym-admin/shared';
import { UnauthorizedException } from '@nestjs/common';

describe('AccessService', () => {
  let service: AccessService;
  let userRepo: any;
  let certRepo: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
    };
    certRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(MedicalCertificate), useValue: certRepo },
      ],
    }).compile();

    service = module.get<AccessService>(AccessService);
  });

  describe('canAccess', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.canAccess('uuid')).rejects.toThrow(UnauthorizedException);
    });

    it('should deny access for REJECTED status', async () => {
      userRepo.findOne.mockResolvedValue({ status: MembershipStatus.REJECTED });
      const result = await service.canAccess('uuid');
      expect(result).toBe(false);
    });

    it('should allow access for ACTIVE with valid certificate', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, status: MembershipStatus.ACTIVE });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2099, 0, 1) });
      const result = await service.canAccess('uuid');
      expect(result).toBe(true);
    });

    it('should deny access if certificate is expired', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, status: MembershipStatus.ACTIVE });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2000, 0, 1) });
      const result = await service.canAccess('uuid');
      expect(result).toBe(false);
    });

    it('should allow access for GRACE_PERIOD with valid certificate', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, status: MembershipStatus.GRACE_PERIOD });
      certRepo.findOne.mockResolvedValue({ validUntil: new Date(2099, 0, 1) });
      const result = await service.canAccess('uuid');
      expect(result).toBe(true);
    });
  });
});
