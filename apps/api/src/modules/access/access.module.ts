import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "../users/users.module";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";
import { Attendance } from "./entities/attendance.entity";
import { MedicalCertificate } from "./entities/medical-certificate.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, MedicalCertificate]),
    UsersModule,
  ],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [TypeOrmModule],
})
export class AccessModule {}
