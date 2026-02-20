import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CurrencyCode, InvoiceStatus, MembershipStatus, PaymentMethod, PlanType, UserRole } from '@gym-admin/shared';
import { Repository } from 'typeorm';
import { Invoice } from '../billing/entities/invoice.entity';
import { Plan } from '../billing/entities/plan.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AdminBillingService } from './admin-billing.service';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function createRepoMock(): RepoMock {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((payload: unknown) => payload),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

function createSubscriptionQueryBuilder(returnRows: Subscription[]) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(returnRows),
  };
}

function createInvoiceQueryBuilder(returnRows: Invoice[]) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(returnRows),
  };
}

describe('AdminBillingService', () => {
  let service: AdminBillingService;

  const userRepository = createRepoMock();
  const subscriptionRepository = createRepoMock();
  const invoiceRepository = createRepoMock();
  const planRepository = createRepoMock();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminBillingService(
      userRepository as unknown as Repository<User>,
      subscriptionRepository as unknown as Repository<Subscription>,
      invoiceRepository as unknown as Repository<Invoice>,
      planRepository as unknown as Repository<Plan>,
    );
  });

  it('returns empty list in counter-payment search when query is shorter than 2 chars', async () => {
    const result = await service.searchStudentsForCounterPayment('a');
    expect(result).toEqual({ items: [] });
    expect(userRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects counter payment when user does not exist', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.registerCounterOneTimePayment({
        userUuid: 'ba9f24dc-8f56-40af-b16e-47bc3bfcf3a9',
        planId: PlanType.MONTHLY,
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects counter payment when user already has active subscription', async () => {
    const existingUser = {
      id: 18,
      uuid: '4e46575d-f4b4-4cf6-b627-98f48c3d2f0d',
      role: UserRole.USER,
      email: 'diegogauto01@gmail.com',
      firstName: 'Diego',
      lastName: 'Gauto',
      status: MembershipStatus.EXPIRED,
    } as User;
    const activeSubscription = {
      id: 10,
      userId: 18,
      planId: PlanType.MONTHLY,
      status: MembershipStatus.ACTIVE,
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    } as Subscription;

    userRepository.findOne.mockResolvedValue(existingUser);
    subscriptionRepository.findOne.mockResolvedValue(activeSubscription);

    await expect(
      service.registerCounterOneTimePayment({
        userUuid: existingUser.uuid,
        planId: PlanType.MONTHLY,
        paymentMethod: PaymentMethod.CASH,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('registers counter one-time payment and activates the user', async () => {
    const user = {
      id: 18,
      uuid: '4e46575d-f4b4-4cf6-b627-98f48c3d2f0d',
      role: UserRole.USER,
      email: 'diegogauto01@gmail.com',
      firstName: 'Diego',
      lastName: 'Gauto',
      status: MembershipStatus.EXPIRED,
    } as User;
    const plan = {
      id: PlanType.MONTHLY,
      name: 'Mensual',
      price: 15000,
      currency: CurrencyCode.ARS,
      isActive: true,
    } as Plan;

    userRepository.findOne.mockResolvedValue(user);
    subscriptionRepository.findOne.mockResolvedValue(null);
    planRepository.findOne.mockResolvedValue(plan);
    invoiceRepository.findOne.mockResolvedValue(null);
    invoiceRepository.create.mockImplementation((payload: unknown) => payload);
    invoiceRepository.save.mockImplementation(async (payload: Record<string, unknown>) => ({
      ...payload,
      uuid: 'inv-uuid',
      paidAt: payload.paidAt as Date,
    }));
    userRepository.save.mockResolvedValue(user);

    const result = await service.registerCounterOneTimePayment({
      userUuid: user.uuid,
      planId: PlanType.MONTHLY,
      paymentMethod: PaymentMethod.QR,
    });

    expect(invoiceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        amount: plan.price,
        currency: plan.currency,
        status: InvoiceStatus.PAID,
        paymentMethod: PaymentMethod.QR,
      }),
    );
    expect(user.status).toBe(MembershipStatus.ACTIVE);
    expect(userRepository.save).toHaveBeenCalledWith(user);
    expect(result.message).toBe('Pago físico registrado correctamente.');
    expect(result.invoice.uuid).toBe('inv-uuid');
  });

  it('builds admin stats scoped to USER role for snapshot view', async () => {
    userRepository.count.mockResolvedValueOnce(12).mockResolvedValueOnce(9);

    const activeSubsQb = createSubscriptionQueryBuilder([
      { userId: 1, planId: PlanType.MONTHLY } as Subscription,
      { userId: 2, planId: PlanType.YEARLY } as Subscription,
    ]);
    const oneTimeInvoicesQb = createInvoiceQueryBuilder([
      {
        userId: 8,
        currency: CurrencyCode.ARS,
        amount: 15000,
        status: InvoiceStatus.PAID,
        createdAt: new Date(),
        paidAt: new Date(),
      } as Invoice,
    ]);

    subscriptionRepository.createQueryBuilder
      .mockReturnValueOnce(activeSubsQb);
    invoiceRepository.createQueryBuilder
      .mockReturnValueOnce(oneTimeInvoicesQb);
    planRepository.find.mockResolvedValue([
      { id: PlanType.MONTHLY, currency: CurrencyCode.ARS, price: 15000 } as Plan,
      { id: PlanType.QUARTERLY, currency: CurrencyCode.ARS, price: 36000 } as Plan,
      { id: PlanType.YEARLY, currency: CurrencyCode.ARS, price: 120000 } as Plan,
    ]);

    const result = await service.getStats('snapshot');

    expect(userRepository.count).toHaveBeenNthCalledWith(1, { where: { role: UserRole.USER } });
    expect(userRepository.count).toHaveBeenNthCalledWith(2, {
      where: { role: UserRole.USER, status: MembershipStatus.ACTIVE },
    });
    expect(result.totals.users).toBe(12);
    expect(result.totals.activeUsers).toBe(9);
    expect(result.totals.activeSubscriptions).toBe(2);
    expect(result.totals.oneTimePaidUsers).toBe(1);
    expect(result.subscriptionsByPlan).toEqual({
      [PlanType.MONTHLY]: 1,
      [PlanType.YEARLY]: 1,
    });
    expect(result.oneTimeByPlan).toEqual({
      [PlanType.MONTHLY]: 1,
    });
    expect(result.period.usersStoppedPaying).toBe(0);
    expect(result.period.usersCancelled).toBe(0);
  });
});
