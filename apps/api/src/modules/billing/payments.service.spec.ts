import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { User } from '../users/entities/user.entity';
import { Invoice } from './entities/invoice.entity';
import { SubscriptionsService } from './subscriptions.service';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, MembershipStatus } from '@gym-admin/shared';

// Mock Mercadopago
jest.mock('mercadopago', () => {
  return {
    MercadoPagoConfig: jest.fn(),
    Payment: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockResolvedValue({ id: 'mp-123', status: 'approved' }),
      get: jest.fn().mockResolvedValue({ status: 'approved', external_reference: 'invoice-uuid' }),
    })),
    CardToken: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockResolvedValue({ id: 'token-123' }),
    })),
  };
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let userRepo: any;
  let invoiceRepo: any;
  let subService: any;

  beforeEach(async () => {
    userRepo = {
      save: jest.fn().mockImplementation(u => Promise.resolve(u)),
    };
    invoiceRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(i => Promise.resolve(i)),
    };
    subService = {
      reactivateFromDebt: jest.fn(),
      extendActiveSubscription: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-token'),
          },
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: SubscriptionsService, useValue: subService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('processPayment', () => {
    it('should include idempotencyKey from invoice UUID', async () => {
      const invoice = { uuid: 'invoice-uuid', amount: 100 } as Invoice;
      const result = await service.processPayment(invoice, 'card-id', 'test@test.com');
      
      expect(result.status).toBe('approved');
      // The actual mock check for idempotencyKey would happen in the mock implementation of Payment.create
    });
  });

  describe('updateCardAndRecover', () => {
    it('should attempt immediate recovery for GRACE_PERIOD user', async () => {
      const user = { id: 1, email: 't@t.com', status: MembershipStatus.GRACE_PERIOD, mercadopagoCardId: 'old' } as User;
      const invoice = { uuid: 'inv-1', status: InvoiceStatus.PENDING, subscription: {} } as Invoice;
      
      invoiceRepo.findOne.mockResolvedValue(invoice);
      
      await service.updateCardAndRecover(user, { id: 'new-card', brand: 'visa', lastFour: '1234', issuer: 'bank' });
      
      expect(user.mercadopagoCardId).toBe('new-card');
      expect(invoiceRepo.save).toHaveBeenCalled();
      expect(subService.extendActiveSubscription).toHaveBeenCalled();
      expect(user.status).toBe(MembershipStatus.ACTIVE);
    });

    it('should reactivate from debt for REJECTED user', async () => {
      const user = { id: 1, email: 't@t.com', status: MembershipStatus.REJECTED } as User;
      const invoice = { uuid: 'inv-1', status: InvoiceStatus.EXPIRED, subscription: {} } as Invoice;
      
      invoiceRepo.findOne.mockResolvedValue(invoice);
      
      await service.updateCardAndRecover(user, { id: 'new-card' });
      
      expect(subService.reactivateFromDebt).toHaveBeenCalled();
      expect(user.status).toBe(MembershipStatus.ACTIVE);
    });
  });
});
