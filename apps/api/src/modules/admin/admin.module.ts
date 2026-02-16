import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../billing/entities/invoice.entity';
import { Plan } from '../billing/entities/plan.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { AdminContentController } from './admin-content.controller';
import { AdminContentService } from './admin-content.service';
import { Activity } from './entities/activity.entity';
import { Benefit } from './entities/benefit.entity';
import { AdminContent } from './entities/admin-content.entity';
import { GymSiteSettings } from './entities/gym-site-settings.entity';
import { Trainer } from './entities/trainer.entity';

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
      Trainer,
      Activity,
      Benefit,
      // Legacy table kept only to migrate existing JSON content to normalized tables.
      AdminContent,
    ]),
  ],
  controllers: [AdminContentController],
  providers: [AdminContentService],
  exports: [AdminContentService],
})
export class AdminModule {}
