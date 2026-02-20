import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../billing/entities/invoice.entity';
import { Plan } from '../billing/entities/plan.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { AdminBillingService } from './admin-billing.service';
import { AdminContentController } from './admin-content.controller';
import { AdminContentService } from './admin-content.service';
import { Activity } from './entities/activity.entity';
import { Benefit } from './entities/benefit.entity';
import { AdminContent } from './entities/admin-content.entity';
import { GymSiteSettings } from './entities/gym-site-settings.entity';
import { Trainer } from './entities/trainer.entity';
import { GymBranch } from './entities/gym-branch.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      AdminContent,
      User,
      Subscription,
      Invoice,
      Plan,
      GymSiteSettings,
      GymBranch,
      Trainer,
      Activity,
      Benefit,
    ]),
  ],
  controllers: [AdminContentController],
  providers: [AdminContentService, AdminBillingService],
  exports: [AdminContentService],
})
export class AdminModule {}
