import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserAuth } from './entities/user-auth.entity';
import { UserBillingProfile } from './entities/user-billing-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserAuth, UserBillingProfile])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
