import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { MembershipStatus } from '@gym-admin/shared';
import { MedicalCertificate } from './entities/medical-certificate.entity';

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MedicalCertificate)
    private readonly medicalCertificateRepository: Repository<MedicalCertificate>,
  ) {}

  /**
   * Rule 3: Conditional Access (QR).
   * Validates if a user can enter based on billing status and medical certificate.
   */
  async canAccess(userUuid: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { uuid: userUuid },
    });

    if (!user) throw new UnauthorizedException('User not found');

    // Rule 3: Allow only ACTIVE or GRACE_PERIOD
    const allowedStatuses = [MembershipStatus.ACTIVE, MembershipStatus.GRACE_PERIOD, MembershipStatus.PENDING_CANCELLATION];
    if (!allowedStatuses.includes(user.status)) {
      return false;
    }

    // Rule 3: Check MedicalCertificate
    const certificate = await this.medicalCertificateRepository.findOne({
      where: { userId: user.id },
      order: { validUntil: 'DESC' },
    });

    if (!certificate || certificate.validUntil < new Date()) {
      return false;
    }

    return true;
  }
}
