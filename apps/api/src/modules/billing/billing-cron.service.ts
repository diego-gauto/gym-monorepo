import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { MembershipStatus, PaymentMethod } from '@gym-admin/shared';
import { randomUUID } from 'crypto';
const uuidv4 = randomUUID;

import { SubscriptionsService } from './subscriptions.service';
import { PaymentsService } from './payments.service';
import { SubscriptionChangeRequest } from './entities/subscription-change-request.entity';
import { InvoiceStatus } from '@gym-admin/shared';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SubscriptionChangeRequest)
    private readonly changeRequestRepository: Repository<SubscriptionChangeRequest>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleBillingCycle() {
    this.logger.log('Starting daily billing cycle...');

    // Rule 10: Process plan changes before generating invoices
    await this.processPendingPlanChanges();
    
    await this.processExpirations();
    await this.processRetries(3); // Attempt 2: Day 3
    await this.processRetries(7); // Attempt 3/Final: Day 7
  }

  private async processPendingPlanChanges() {
    this.logger.log('Processing pending plan changes...');
    const todayEnd = endOfDay(new Date());

    const pendingChanges = await this.changeRequestRepository.find({
      where: {
        status: 'PENDING',
        effectiveAt: LessThanOrEqual(todayEnd),
      },
      relations: ['subscription'],
    });

    for (const change of pendingChanges) {
      this.logger.log(`Applying change request ${change.uuid} for subscription ${change.subscription.uuid}`);
      
      if (change.newPlanId) {
        this.logger.log(`Changing plan from ${change.subscription.planId} to ${change.newPlanId}`);
        change.subscription.planId = change.newPlanId;
      }

      if (change.newAutoRenew !== undefined && change.newAutoRenew !== null) {
        this.logger.log(`Changing autoRenew from ${change.subscription.autoRenew} to ${change.newAutoRenew}`);
        change.subscription.autoRenew = change.newAutoRenew;
      }

      await this.subscriptionRepository.save(change.subscription);
      
      change.status = 'APPLIED';
      await this.changeRequestRepository.save(change);
    }
  }

  /**
   * Attempt 1: Find subscriptions expiring today
   */
  private async processExpirations() {
    const todayEnd = endOfDay(new Date());
    
    const expiringSubscriptions = await this.subscriptionRepository.find({
      where: {
        endDate: LessThanOrEqual(todayEnd),
        status: MembershipStatus.ACTIVE,
      },
      relations: ['user'],
    });

    for (const sub of expiringSubscriptions) {
      this.logger.log(`Processing expiration for user ${sub.user.email}`);
      
      // Rule 7: Invoice-First Model - Generate PENDING invoice
      const invoice = this.invoiceRepository.create({
        userId: sub.userId,
        subscriptionId: sub.id,
        amount: 50.00, // Should fetch plan price
        currency: 'ARS',
        status: InvoiceStatus.PENDING,
        paymentMethod: PaymentMethod.MP_CARD,
        idempotencyKey: uuidv4(), // Initial ID key
      });

      await this.invoiceRepository.save(invoice);
      
      // Simulate payment attempt 1
      await this.attemptPayment(invoice, sub);
    }
  }

  private async processRetries(daysAgo: number) {
    const targetDate = startOfDay(subDays(new Date(), daysAgo));
    
    // Find pending invoices created exactly `daysAgo` days ago
    const pendingInvoices = await this.invoiceRepository.find({
      where: {
        status: InvoiceStatus.PENDING,
        createdAt: LessThanOrEqual(endOfDay(targetDate)),
      },
      relations: ['subscription', 'subscription.user'],
    });

    for (const invoice of pendingInvoices) {
      if (daysAgo === 7) {
        // Fallo final tras Intento 3
        this.logger.log(`Final failure for invoice ${invoice.uuid}. Marking as REJECTED.`);
        await this.handleFinalFailure(invoice);
      } else {
        this.logger.log(`Retry attempt (Day ${daysAgo}) for invoice ${invoice.uuid}`);
        await this.attemptPayment(invoice, invoice.subscription);
      }
    }
  }

  private async attemptPayment(invoice: Invoice, sub: Subscription) {
    const user = await this.userRepository.findOne({ where: { id: sub.userId } });

    if (!user || !user.mercadopagoCardId) {
      this.logger.warn(`Skipping payment for user ${user?.email || sub.userId}: No MP Card ID found.`);
      return;
    }

    try {
      this.logger.log(`Executing MP payment attempt for Invoice ${invoice.uuid} (User: ${user.email})`);
      const result = await this.paymentsService.processPayment(invoice, user.mercadopagoCardId, user.email);

      if (result.status === 'approved') {
        this.logger.log(`Payment SUCCESS for invoice ${invoice.uuid}. MP Payment ID: ${result.id}`);
        invoice.status = InvoiceStatus.PAID;
        invoice.paidAt = new Date();
        await this.invoiceRepository.save(invoice);

        if (sub.status === MembershipStatus.REJECTED) {
          await this.subscriptionsService.reactivateFromDebt(sub);
        } else {
          await this.subscriptionsService.extendActiveSubscription(sub);
        }

        user.status = MembershipStatus.ACTIVE;
        await this.userRepository.save(user);
        } else {
          this.logger.warn(`Payment not approved for invoice ${invoice.uuid}. Status: ${result.status}`);
          
          // Rule 2 & 10: Identify fatal vs soft rejection
          const isFatal = ['rejected_high_risk', 'rejected_blacklist', 'rejected_insufficient_data'].includes(result.status_detail || '');
          await this.handlePaymentFailure(user, sub, isFatal);
        }
      } catch (error: any) {
        this.logger.error(`Error processing payment for invoice ${invoice.uuid}: ${error.message}`);
        
        // Rule 2: Most communication errors are 'Soft' (Allowing retry)
        await this.handlePaymentFailure(user, sub, false); 
      }
    }
  
    private async handlePaymentFailure(user: User, sub: Subscription, isFatal: boolean) {
      if (isFatal) {
        this.logger.error(`FATAL error for user ${user.email}. Transitioning to REJECTED_FATAL.`);
        sub.status = MembershipStatus.REJECTED_FATAL;
        user.status = MembershipStatus.REJECTED_FATAL;
      } else if (sub.status !== MembershipStatus.REJECTED) {
        // Soft error -> GRACE_PERIOD
        sub.status = MembershipStatus.GRACE_PERIOD;
        user.status = MembershipStatus.GRACE_PERIOD;
      }
  
      await this.subscriptionRepository.save(sub);
      await this.userRepository.save(user);
    }

  private async handleFinalFailure(invoice: Invoice) {
    invoice.status = InvoiceStatus.EXPIRED; // As per Regla 7
    await this.invoiceRepository.save(invoice);

    const sub = invoice.subscription;
    sub.status = MembershipStatus.REJECTED;
    await this.subscriptionRepository.save(sub);

    const user = await this.userRepository.findOne({ where: { id: sub.userId } });
    if (user) {
      user.status = MembershipStatus.REJECTED;
      await this.userRepository.save(user);
    }
  }
}
