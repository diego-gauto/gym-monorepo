import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../access/entities/attendance.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Plan } from '../billing/entities/plan.entity';
import { SubscriptionChangeRequest } from '../billing/entities/subscription-change-request.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { User } from './entities/user.entity';
import { UserAuth } from './entities/user-auth.entity';
import { UserBillingProfile } from './entities/user-billing-profile.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserAuth,
      UserBillingProfile,
      Attendance,
      Invoice,
      Subscription,
      SubscriptionChangeRequest,
      Plan,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
