import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvoiceStatus, MembershipStatus, PaymentMethod, PlanType, UserRole } from '@gym-admin/shared';
import { randomUUID } from 'crypto';
import { Brackets, In, IsNull, MoreThan, Repository } from 'typeorm';
import { Invoice } from '../billing/entities/invoice.entity';
import { Plan } from '../billing/entities/plan.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { RegisterCounterPaymentDto } from './dto/register-counter-payment.dto';

type CounterPaymentStudent = {
  uuid: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: MembershipStatus;
  hasActiveSubscription: boolean;
  activeSubscriptionEndDate: string | null;
  latestOneTimePaidAt: string | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = [
  MembershipStatus.ACTIVE,
  MembershipStatus.PENDING_CANCELLATION,
  MembershipStatus.GRACE_PERIOD,
] as const;

@Injectable()
export class AdminBillingService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  private fromRange(range?: string) {
    const now = new Date();
    const map: Record<string, number> = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    };
    const days = map[range ?? 'month'] ?? 30;
    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  }

  private getPeriodDaysByPlan(planId: PlanType): number {
    switch (planId) {
      case PlanType.MONTHLY:
        return 30;
      case PlanType.QUARTERLY:
        return 90;
      case PlanType.YEARLY:
        return 365;
      default:
        return 30;
    }
  }

  async searchStudentsForCounterPayment(query: string) {
    const trimmedQuery = query.trim();
    const q = trimmedQuery.toLowerCase();
    const normalizedFullNameQuery = q.replace(/\s+/g, ' ');
    const phoneDigitsQuery = trimmedQuery.replace(/\D+/g, '');
    if (q.length < 2) {
      return { items: [] as CounterPaymentStudent[] };
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.USER })
      .andWhere(
        new Brackets((qb) => {
          qb
            .where('LOWER(user.email) LIKE :q', { q: `%${q}%` })
            .orWhere('LOWER(user.first_name) LIKE :q', { q: `%${q}%` })
            .orWhere('LOWER(user.last_name) LIKE :q', { q: `%${q}%` })
            .orWhere(
              "REGEXP_REPLACE(LOWER(CONCAT_WS(' ', user.first_name, user.last_name)), '[[:space:]]+', ' ', 'g') LIKE :fullNameQuery",
              { fullNameQuery: `%${normalizedFullNameQuery}%` },
            )
            .orWhere('COALESCE(user.phone, \'\') LIKE :phoneQuery', { phoneQuery: `%${trimmedQuery}%` });
          if (phoneDigitsQuery.length >= 4) {
            qb.orWhere("REGEXP_REPLACE(COALESCE(user.phone, ''), '[^0-9]', '', 'g') LIKE :phoneDigitsQuery", {
              phoneDigitsQuery: `%${phoneDigitsQuery}%`,
            });
          }
        }),
      )
      .orderBy('user.createdAt', 'DESC')
      .take(20)
      .getMany();

    if (users.length === 0) {
      return { items: [] as CounterPaymentStudent[] };
    }

    const userIds = users.map((item) => item.id);
    const now = new Date();

    const [subscriptions, oneTimeInvoices] = await Promise.all([
      this.subscriptionRepository.find({
        where: {
          userId: In(userIds),
          status: In([...ACTIVE_SUBSCRIPTION_STATUSES]),
          endDate: MoreThan(now),
        },
        order: { endDate: 'DESC' },
      }),
      this.invoiceRepository.find({
        where: {
          userId: In(userIds),
          status: InvoiceStatus.PAID,
          subscriptionId: IsNull(),
        },
        order: { paidAt: 'DESC', createdAt: 'DESC' },
      }),
    ]);

    const activeSubByUser = new Map<number, Subscription>();
    for (const sub of subscriptions) {
      if (!activeSubByUser.has(sub.userId)) {
        activeSubByUser.set(sub.userId, sub);
      }
    }

    const latestOneTimeByUser = new Map<number, Invoice>();
    for (const invoice of oneTimeInvoices) {
      if (!latestOneTimeByUser.has(invoice.userId)) {
        latestOneTimeByUser.set(invoice.userId, invoice);
      }
    }

    return {
      items: users.map((user) => {
        const activeSubscription = activeSubByUser.get(user.id);
        const latestOneTime = latestOneTimeByUser.get(user.id);
        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
        return {
          uuid: user.uuid,
          fullName: fullName.length > 0 ? fullName : user.email,
          email: user.email,
          phone: user.phone ?? null,
          status: user.status,
          hasActiveSubscription: Boolean(activeSubscription),
          activeSubscriptionEndDate: activeSubscription?.endDate?.toISOString() ?? null,
          latestOneTimePaidAt: (latestOneTime?.paidAt ?? latestOneTime?.createdAt)?.toISOString() ?? null,
        };
      }),
    };
  }

  async registerCounterOneTimePayment(payload: RegisterCounterPaymentDto) {
    const user = await this.userRepository.findOne({
      where: {
        uuid: payload.userUuid,
        role: UserRole.USER,
      },
    });

    if (!user) {
      throw new NotFoundException('No encontramos al alumno indicado.');
    }

    const now = new Date();
    const activeSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId: user.id,
        status: In([...ACTIVE_SUBSCRIPTION_STATUSES]),
        endDate: MoreThan(now),
      },
      order: { endDate: 'DESC' },
    });
    if (activeSubscription) {
      throw new BadRequestException('El alumno ya tiene una suscripción activa. No corresponde registrar un pago único.');
    }

    const plan = await this.planRepository.findOne({
      where: {
        id: payload.planId,
        isActive: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('El plan seleccionado no está disponible.');
    }

    const latestOneTimeInvoice = await this.invoiceRepository.findOne({
      where: {
        userId: user.id,
        status: InvoiceStatus.PAID,
        subscriptionId: IsNull(),
      },
      order: { paidAt: 'DESC', createdAt: 'DESC' },
    });

    if (latestOneTimeInvoice) {
      const planByAmount = await this.planRepository.findOne({
        where: {
          currency: latestOneTimeInvoice.currency,
          price: latestOneTimeInvoice.amount,
          isActive: true,
        },
      });
      const previousPlanId = planByAmount?.id ?? PlanType.MONTHLY;
      const previousPeriodDays = this.getPeriodDaysByPlan(previousPlanId);
      const previousPaidAt = latestOneTimeInvoice.paidAt ?? latestOneTimeInvoice.createdAt;
      const previousPeriodEnd = new Date(previousPaidAt.getTime() + (previousPeriodDays * 24 * 60 * 60 * 1000));
      if (previousPeriodEnd > now) {
        throw new BadRequestException(
          `El alumno ya tiene un período pago vigente hasta ${previousPeriodEnd.toLocaleDateString('es-AR')}.`,
        );
      }
    }

    const invoice = this.invoiceRepository.create({
      userId: user.id,
      amount: plan.price,
      currency: plan.currency,
      status: InvoiceStatus.PAID,
      paymentMethod: payload.paymentMethod as PaymentMethod,
      idempotencyKey: `counter-${randomUUID()}`,
      paidAt: now,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);
    user.status = MembershipStatus.ACTIVE;
    await this.userRepository.save(user);

    return {
      message: 'Pago físico registrado correctamente.',
      invoice: {
        uuid: savedInvoice.uuid,
        userUuid: user.uuid,
        studentName: `${user.firstName} ${user.lastName}`.trim(),
        studentEmail: user.email,
        planId: plan.id,
        amount: savedInvoice.amount,
        currency: savedInvoice.currency,
        paymentMethod: savedInvoice.paymentMethod,
        paidAt: savedInvoice.paidAt?.toISOString() ?? now.toISOString(),
      },
    };
  }

  async getStats(range?: string) {
    const now = new Date();
    const activeStatuses = [MembershipStatus.ACTIVE, MembershipStatus.PENDING_CANCELLATION, MembershipStatus.GRACE_PERIOD];
    const stoppedPayingStatuses = [
      MembershipStatus.GRACE_PERIOD,
      MembershipStatus.REJECTED,
      MembershipStatus.REJECTED_FATAL,
      MembershipStatus.EXPIRED,
    ];

    const isSnapshot = !range || range === 'snapshot';
    const fromDate = this.fromRange(range);

    const [totalUsers, activeUsers, activeSubs, allOneTimePaidInvoices, plans, periodStoppedPaying, periodCancelled] = await Promise.all([
      this.userRepository.count({ where: { role: UserRole.USER } }),
      this.userRepository.count({ where: { role: UserRole.USER, status: MembershipStatus.ACTIVE } }),
      this.subscriptionRepository
        .createQueryBuilder('subscription')
        .innerJoin('subscription.user', 'user')
        .where('subscription.status IN (:...statuses)', { statuses: activeStatuses })
        .andWhere('subscription.endDate > :now', { now })
        .andWhere('user.role = :role', { role: UserRole.USER })
        .getMany(),
      (() => {
        const qb = this.invoiceRepository
          .createQueryBuilder('invoice')
          .innerJoin('invoice.user', 'user')
          .where('user.role = :role', { role: UserRole.USER })
          .andWhere('invoice.status = :paid', { paid: InvoiceStatus.PAID })
          .andWhere('invoice.subscriptionId IS NULL');
        if (!isSnapshot) {
          qb.andWhere('invoice.paidAt > :fromDate', { fromDate });
        }
        return qb.orderBy('invoice.paidAt', 'DESC').addOrderBy('invoice.createdAt', 'DESC').getMany();
      })(),
      this.planRepository.find(),
      isSnapshot
        ? Promise.resolve([])
        : this.subscriptionRepository
            .createQueryBuilder('subscription')
            .innerJoin('subscription.user', 'user')
            .where('subscription.status IN (:...statuses)', { statuses: stoppedPayingStatuses })
            .andWhere('subscription.updatedAt > :fromDate', { fromDate })
            .andWhere('user.role = :role', { role: UserRole.USER })
            .select(['subscription.id', 'subscription.userId'])
            .getMany(),
      isSnapshot
        ? Promise.resolve([])
        : this.subscriptionRepository
            .createQueryBuilder('subscription')
            .innerJoin('subscription.user', 'user')
            .where('subscription.status = :status', { status: MembershipStatus.CANCELLED })
            .andWhere('subscription.updatedAt > :fromDate', { fromDate })
            .andWhere('user.role = :role', { role: UserRole.USER })
            .select(['subscription.id', 'subscription.userId'])
            .getMany(),
    ]);

    const byPlan = activeSubs.reduce<Record<string, number>>((acc, subscription) => {
      acc[subscription.planId] = (acc[subscription.planId] ?? 0) + 1;
      return acc;
    }, {});

    const latestOneTimeByUser = new Map<number, Invoice>();
    for (const invoice of allOneTimePaidInvoices) {
      if (!latestOneTimeByUser.has(invoice.userId)) {
        latestOneTimeByUser.set(invoice.userId, invoice);
      }
    }
    const uniqueOneTimeInvoices = Array.from(latestOneTimeByUser.values());

    const oneTimeByAmount = uniqueOneTimeInvoices.reduce<Record<string, number>>((acc, invoice) => {
      const key = `${invoice.currency} ${invoice.amount}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const planKeyToId = new Map<string, string>();
    for (const plan of plans) {
      planKeyToId.set(`${plan.currency}|${Number(plan.price)}`, plan.id);
    }
    const oneTimeByPlan = uniqueOneTimeInvoices.reduce<Record<string, number>>((acc, invoice) => {
      const key = planKeyToId.get(`${invoice.currency}|${Number(invoice.amount)}`) ?? 'OTRO';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const activeSubscriptions = activeSubs.length;
    const periodStoppedPayingUsers = new Set(periodStoppedPaying.map((item) => item.userId));
    const periodCancelledUsers = new Set(periodCancelled.map((item) => item.userId));

    return {
      range: isSnapshot ? 'snapshot' : range,
      from: isSnapshot ? now : fromDate,
      totals: {
        users: totalUsers,
        activeUsers,
        activeSubscriptions,
        oneTimePaidUsers: uniqueOneTimeInvoices.length,
      },
      period: {
        usersStoppedPaying: periodStoppedPayingUsers.size,
        usersCancelled: periodCancelledUsers.size,
      },
      subscriptionsByPlan: byPlan,
      oneTimeByPlan,
      oneTimeByAmount,
    };
  }
}
