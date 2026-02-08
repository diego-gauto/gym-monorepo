import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addMonths, addYears, setDate, lastDayOfMonth, getDate } from 'date-fns';
import { Subscription } from './entities/subscription.entity';
import { PlanType, MembershipStatus } from '@gym-admin/shared';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  /**
   * Rule 5 & 6: Implementation of the Anchor Day logic.
   * Calculates the next expiration date based on the plan type and the original anchor day.
   */
  calculateNextExpiration(currentAnchor: number, planType: PlanType, fromDate: Date = new Date()): Date {
    let nextDate: Date;

    switch (planType) {
      case PlanType.MONTHLY:
        nextDate = addMonths(fromDate, 1);
        break;
      case PlanType.QUARTERLY:
        nextDate = addMonths(fromDate, 3);
        break;
      case PlanType.YEARLY:
        nextDate = addYears(fromDate, 1);
        break;
      default:
        nextDate = addMonths(fromDate, 1);
    }

    // Apply Rule 5: Adjust to anchor day if the month allows, otherwise last day of month
    const lastDay = lastDayOfMonth(nextDate);
    const maxDayInMonth = getDate(lastDay);

    if (currentAnchor > maxDayInMonth) {
      return lastDay;
    } else {
      return setDate(nextDate, currentAnchor);
    }
  }

  /**
   * Rule 5: MAINTENANCE - Extends the subscription keeping the original Anchor Day.
   * Used during Grace Period (GRACE_PERIOD) or normal renewal (ACTIVE).
   */
  async extendActiveSubscription(subscription: Subscription) {
    const nextEndDate = this.calculateNextExpiration(
      subscription.billingCycleAnchorDay,
      subscription.planId as PlanType,
      subscription.endDate // Extiende desde el vencimiento original
    );
    
    subscription.startDate = subscription.endDate;
    subscription.endDate = nextEndDate;
    subscription.status = MembershipStatus.ACTIVE;
    
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Rule 5: RESET (Reactivation) - Establishes a NEW Anchor Day based on payment date.
   * Used when the member pays from the REJECTED state.
   */
  async reactivateFromDebt(subscription: Subscription) {
    const now = new Date();
    const newAnchor = getDate(now);
    
    subscription.billingCycleAnchorDay = newAnchor;
    subscription.startDate = now;
    subscription.endDate = this.calculateNextExpiration(newAnchor, subscription.planId as PlanType, now);
    subscription.status = MembershipStatus.ACTIVE;
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Scenario 4: Cancellation logic.
   */
  async cancelSubscription(subscription: Subscription) {
    if (subscription.status === MembershipStatus.ACTIVE) {
      // Scenario 4.1: ACTIVE -> PENDING_CANCELLATION
      subscription.status = MembershipStatus.PENDING_CANCELLATION;
      subscription.autoRenew = false;
    } else if (subscription.status === MembershipStatus.GRACE_PERIOD) {
      // Scenario 4.2: GRACE_PERIOD -> CANCELLED (immediate)
      subscription.status = MembershipStatus.CANCELLED;
      subscription.autoRenew = false;
      
      // We also need to void the invoice in the controller/service that calls this
    }
    
    return this.subscriptionRepository.save(subscription);
  }
}
