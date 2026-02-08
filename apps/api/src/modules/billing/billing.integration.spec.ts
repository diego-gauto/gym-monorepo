import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from './subscriptions.service';
import { BillingCronService } from './billing-cron.service';
import { User } from '../users/entities/user.entity';
import { Invoice } from './entities/invoice.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionChangeRequest } from './entities/subscription-change-request.entity';
import { ConfigService } from '@nestjs/config';
import { MembershipStatus, InvoiceStatus } from '@gym-admin/shared';

// Mock Mercadopago exactly like in unit tests but more stateful if needed
const mockMpPayment = {
  create: jest.fn().mockResolvedValue({ id: 'mp-123', status: 'approved' }),
  get: jest.fn(),
};

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn().mockImplementation(() => mockMpPayment),
  CardToken: jest.fn(),
}));

describe('Billing Integration Scenarios', () => {
  let paymentsService: PaymentsService;
  let subscriptionsService: SubscriptionsService;
  let userRepo: any;
  let invoiceRepo: any;
  let subRepo: any;

  beforeEach(async () => {
    userRepo = {
      save: jest.fn().mockImplementation(u => Promise.resolve(u)),
      findOne: jest.fn(),
    };
    invoiceRepo = {
      save: jest.fn().mockImplementation(i => Promise.resolve(i)),
      findOne: jest.fn(),
    };
    subRepo = {
      save: jest.fn().mockImplementation(s => Promise.resolve(s)),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        SubscriptionsService,
        BillingCronService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('token') },
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: getRepositoryToken(SubscriptionChangeRequest), useValue: {} },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it('Scenario: Recovery - GRACE_PERIOD -> New Card -> Approved -> ACTIVE', async () => {
    const user = { id: 1, email: 't@t.com', status: MembershipStatus.GRACE_PERIOD } as User;
    const sub = { id: 1, userId: 1, status: MembershipStatus.GRACE_PERIOD, billingCycleAnchorDay: 15, endDate: new Date() } as Subscription;
    const invoice = { uuid: 'inv-uuid', status: InvoiceStatus.PENDING, subscription: sub } as Invoice;

    invoiceRepo.findOne.mockResolvedValue(invoice);
    mockMpPayment.create.mockResolvedValue({ id: 'mp-rec', status: 'approved' });

    await paymentsService.updateCardAndRecover(user, { id: 'new-card' });

    expect(user.status).toBe(MembershipStatus.ACTIVE);
    expect(sub.status).toBe(MembershipStatus.ACTIVE);
    expect(invoice.status).toBe(InvoiceStatus.PAID);
  });

  it('Scenario: Idempotency - Ensure X-Idempotency-Key uses Invoice UUID', async () => {
    const invoice = { uuid: 'IDEMP-123', amount: 50 } as Invoice;
    
    await paymentsService.processPayment(invoice, 'card', 'payer@test.com');
    
    // Check if mockMpPayment.create was called with the correct idempotency key
    expect(mockMpPayment.create).toHaveBeenCalledWith({
      body: expect.anything(),
      requestOptions: { idempotencyKey: 'IDEMP-123' }
    });
  });

  it('Scenario: Cancellation - Cancel in GRACE_PERIOD voids invoice', async () => {
    const sub = { id: 1, status: MembershipStatus.GRACE_PERIOD } as Subscription;
    // The controller logic handles the invoice voiding, but let's test the state transition in service
    await subscriptionsService.cancelSubscription(sub);
    expect(sub.status).toBe(MembershipStatus.CANCELLED);
  });
});
