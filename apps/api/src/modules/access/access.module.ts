import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Invoice } from '../billing/entities/invoice.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { Attendance } from './entities/attendance.entity';
import { MedicalCertificate } from './entities/medical-certificate.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([User, Subscription, Invoice, Attendance, MedicalCertificate]),
  ],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [TypeOrmModule],
})
export class AccessModule {}
