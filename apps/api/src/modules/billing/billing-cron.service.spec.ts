import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BillingCronService } from './billing-cron.service';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { SubscriptionChangeRequest } from './entities/subscription-change-request.entity';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentsService } from './payments.service';
import { MembershipStatus, InvoiceStatus } from '@gym-admin/shared';

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
      processPayment: jest.fn(),
    };
    subscriptionsService = {
      extendActiveSubscription: jest.fn(),
      reactivateFromDebt: jest.fn(),
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
      const sub = { uuid: 'sub-1', planId: 'OLD', autoRenew: true } as Subscription;
      const change = { uuid: 'c-1', newPlanId: 'NEW', newAutoRenew: false, status: 'PENDING', subscription: sub } as SubscriptionChangeRequest;
      
      changeRequestRepo.find.mockResolvedValue([change]);
      
      await service['processPendingPlanChanges']();
      
      expect(sub.planId).toBe('NEW');
      expect(sub.autoRenew).toBe(false);
      expect(subRepo.save).toHaveBeenCalledWith(sub);
      expect(change.status).toBe('APPLIED');
    });
  });

  describe('attemptPayment Rejection Logic', () => {
    const mockInvoice = { uuid: 'inv-1', status: InvoiceStatus.PENDING } as Invoice;
    const mockSub = { id: 1, userId: 1, status: MembershipStatus.ACTIVE } as Subscription;
    const mockUser = { id: 1, email: 't@t.com', mercadopagoCardId: 'card' } as User;

    beforeEach(() => {
      userRepo.findOne.mockResolvedValue(mockUser);
    });

    it('should transition to GRACE_PERIOD on soft error (rejected_insufficient_amount)', async () => {
      paymentsService.processPayment.mockResolvedValue({ status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' });
      
      await service['attemptPayment'](mockInvoice, mockSub);
      
      expect(mockSub.status).toBe(MembershipStatus.GRACE_PERIOD);
      expect(mockUser.status).toBe(MembershipStatus.GRACE_PERIOD);
    });

    it('should transition to REJECTED_FATAL on fatal error (rejected_high_risk)', async () => {
      paymentsService.processPayment.mockResolvedValue({ status: 'rejected', status_detail: 'rejected_high_risk' });
      
      await service['attemptPayment'](mockInvoice, mockSub);
      
      expect(mockSub.status).toBe(MembershipStatus.REJECTED_FATAL);
      expect(mockUser.status).toBe(MembershipStatus.REJECTED_FATAL);
    });
  });
});
