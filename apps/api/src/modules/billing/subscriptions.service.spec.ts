import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { PlanType, MembershipStatus } from '@gym-admin/shared';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  const mockRepository = {
    save: jest.fn().mockImplementation((sub) => Promise.resolve(sub)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('calculateNextExpiration', () => {
    it('should handle Anchor Day snapback (Rule 5: 31/03 -> 30/04 -> 31/05)', () => {
      const anchor = 31;
      const march31 = new Date(2024, 2, 31);
      
      const aprilResult = service.calculateNextExpiration(anchor, PlanType.MONTHLY, march31);
      expect(aprilResult.getDate()).toBe(30);
      expect(aprilResult.getMonth()).toBe(3); // April

      const mayResult = service.calculateNextExpiration(anchor, PlanType.MONTHLY, aprilResult);
      expect(mayResult.getDate()).toBe(31);
      expect(mayResult.getMonth()).toBe(4); // May
    });

    it('should handle end of February in leap year', () => {
      const anchor = 30;
      const jan30 = new Date(2024, 0, 30);
      const febResult = service.calculateNextExpiration(anchor, PlanType.MONTHLY, jan30);
      expect(febResult.getDate()).toBe(29);
      expect(febResult.getMonth()).toBe(1); // Feb
    });
  });

  describe('extendActiveSubscription', () => {
    it('should extend maintaining original anchor day', async () => {
      const sub = {
        billingCycleAnchorDay: 15,
        planId: PlanType.MONTHLY,
        endDate: new Date(2024, 5, 15),
        status: MembershipStatus.GRACE_PERIOD,
      } as Subscription;

      const result = await service.extendActiveSubscription(sub);
      expect(result.status).toBe(MembershipStatus.ACTIVE);
      expect(result.endDate.getDate()).toBe(15);
      expect(result.endDate.getMonth()).toBe(6); // July
    });
  });

  describe('reactivateFromDebt', () => {
    it('should reset anchor day based on today', async () => {
      const sub = {
        billingCycleAnchorDay: 1,
        planId: PlanType.MONTHLY,
        status: MembershipStatus.REJECTED,
      } as Subscription;

      // Mocking today as 20th
      const mockToday = new Date(2024, 9, 20);
      jest.useFakeTimers().setSystemTime(mockToday);

      const result = await service.reactivateFromDebt(sub);
      
      expect(result.billingCycleAnchorDay).toBe(20);
      expect(result.status).toBe(MembershipStatus.ACTIVE);
      expect(result.endDate.getDate()).toBe(20);
      expect(result.endDate.getMonth()).toBe(10); // Nov

      jest.useRealTimers();
    });
  });
});
