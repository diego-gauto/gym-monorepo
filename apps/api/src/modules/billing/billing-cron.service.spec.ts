import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BillingCronService } from './billing-cron.service';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { SubscriptionChangeRequest } from './entities/subscription-change-request.entity';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentsService } from './payments.service';
import { MembershipStatus, InvoiceStatus, PlanType, SubscriptionChangeRequestStatus } from '@gym-admin/shared';
import { UserBillingProfile } from '../users/entities/user-billing-profile.entity';

describe('BillingCronService', () => {
  let service: BillingCronService;
  let subRepo: any;
  let invoiceRepo: any;
  let userRepo: any;
  let changeRequestRepo: any;
  let paymentsService: any;
  let subscriptionsService: any;

  beforeEach(async () => {
    subRepo = {
      find: jest.fn(),
      create: jest.fn().mockImplementation(s => s),
      save: jest.fn().mockImplementation(s => Promise.resolve(s)),
    };
    invoiceRepo = {
      create: jest.fn().mockImplementation(i => i),
      save: jest.fn().mockImplementation(i => Promise.resolve(i)),
      find: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(u => Promise.resolve(u)),
    };
    changeRequestRepo = {
      find: jest.fn(),
      save: jest.fn().mockImplementation(c => Promise.resolve(c)),
    };
    paymentsService = {
      processPaymentWithSavedCard: jest.fn(),
    };
    subscriptionsService = {
      extendActiveSubscription: jest.fn(),
      reactivateFromDebt: jest.fn(),
      calculateNextExpiration: jest.fn().mockReturnValue(new Date('2026-05-10T00:00:00.000Z')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingCronService,
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(SubscriptionChangeRequest), useValue: changeRequestRepo },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: SubscriptionsService, useValue: subscriptionsService },
      ],
    }).compile();

    service = module.get<BillingCronService>(BillingCronService);
  });

  describe('processPendingPlanChanges', () => {
    it('should apply pending plan and autoRenew changes', async () => {
      const sub = { uuid: 'sub-1', planId: PlanType.MONTHLY, autoRenew: true } as unknown as Subscription;
      const change = {
        uuid: 'c-1',
        newPlanId: PlanType.QUARTERLY,
        newAutoRenew: false,
        status: SubscriptionChangeRequestStatus.PENDING,
        subscription: sub,
      } as unknown as SubscriptionChangeRequest;
      
      changeRequestRepo.find.mockResolvedValue([change]);
      
      await service['processPendingPlanChanges']();
      
      expect(sub.planId).toBe(PlanType.QUARTERLY);
      expect(sub.autoRenew).toBe(false);
      expect(subRepo.save).toHaveBeenCalledWith(sub);
      expect(change.status).toBe(SubscriptionChangeRequestStatus.APPLIED);
    });

    it('should create deferred subscription when request has no subscriptionId', async () => {
      const user = { id: 15, email: 'deferred@test.com', status: MembershipStatus.CANCELLED } as unknown as User;
      const change = {
        uuid: 'c-2',
        userId: 15,
        newPlanId: PlanType.MONTHLY,
        newAutoRenew: true,
        status: SubscriptionChangeRequestStatus.PENDING,
        effectiveAt: new Date('2026-04-10T00:00:00.000Z'),
      } as unknown as SubscriptionChangeRequest;

      changeRequestRepo.find.mockResolvedValue([change]);
      userRepo.findOne.mockResolvedValue(user);
      subRepo.save.mockImplementation(async (payload: any) => ({ id: 99, ...payload }));

      await service['processPendingPlanChanges']();

      expect(subRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 15,
          planId: PlanType.MONTHLY,
          status: MembershipStatus.ACTIVE,
        }),
      );
      expect(change.subscriptionId).toBe(99);
      expect(change.status).toBe(SubscriptionChangeRequestStatus.APPLIED);
    });
  });

  describe('attemptPayment Rejection Logic', () => {
    const mockInvoice = { uuid: 'inv-1', status: InvoiceStatus.PENDING } as Invoice;
    const mockSub = { id: 1, userId: 1, status: MembershipStatus.ACTIVE } as Subscription;
    const mockUser = {
      id: 1,
      email: 't@t.com',
      billingProfile: { mercadopagoCardId: 'card' } as UserBillingProfile,
    } as unknown as User;

    beforeEach(() => {
      userRepo.findOne.mockResolvedValue(mockUser);
    });

    it('should transition to GRACE_PERIOD on soft error (rejected_insufficient_amount)', async () => {
      paymentsService.processPaymentWithSavedCard.mockResolvedValue({ status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' });
      
      await service['attemptPayment'](mockInvoice, mockSub);
      
      expect(mockSub.status).toBe(MembershipStatus.GRACE_PERIOD);
      expect(mockUser.status).toBe(MembershipStatus.GRACE_PERIOD);
    });

    it('should transition to REJECTED_FATAL on fatal error (rejected_high_risk)', async () => {
      paymentsService.processPaymentWithSavedCard.mockResolvedValue({ status: 'rejected', status_detail: 'rejected_high_risk' });
      
      await service['attemptPayment'](mockInvoice, mockSub);
      
      expect(mockSub.status).toBe(MembershipStatus.REJECTED_FATAL);
      expect(mockUser.status).toBe(MembershipStatus.REJECTED_FATAL);
    });
  });
});
