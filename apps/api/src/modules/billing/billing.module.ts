import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionsService } from './subscriptions.service';
import { BillingCronService } from './billing-cron.service';
import { PaymentsService } from './payments.service';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { Plan } from './entities/plan.entity';
import { User } from '../users/entities/user.entity';
import { UserBillingProfile } from '../users/entities/user-billing-profile.entity';
import { SubscriptionChangeRequest } from './entities/subscription-change-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription, Invoice, User, UserBillingProfile, SubscriptionChangeRequest])],
  controllers: [BillingController],
  providers: [BillingService, SubscriptionsService, BillingCronService, PaymentsService],
  exports: [TypeOrmModule, SubscriptionsService],
})
export class BillingModule {}
