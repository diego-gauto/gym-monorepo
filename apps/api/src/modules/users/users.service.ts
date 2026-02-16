import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthProvider, MembershipStatus, SubscriptionChangeRequestStatus } from '@gym-admin/shared';
import * as bcrypt from 'bcrypt';
import { subDays, subMonths, subYears } from 'date-fns';
import { In, MoreThan, Repository } from 'typeorm';
import { Attendance } from '../access/entities/attendance.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Plan } from '../billing/entities/plan.entity';
import { SubscriptionChangeRequest } from '../billing/entities/subscription-change-request.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AttendanceRange } from './dto/attendance-range.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserAuth } from './entities/user-auth.entity';
import { User } from './entities/user.entity';

const ACTIVITY_LABELS: Record<string, string> = {
  musculacion: 'Musculación',
  crossfit: 'Crossfit',
  yoga: 'Yoga',
  boxing: 'Boxeo',
  spinning: 'Spinning',
  funcional: 'Funcional',
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAuth)
    private readonly userAuthRepository: Repository<UserAuth>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionChangeRequest)
    private readonly changeRequestRepository: Repository<SubscriptionChangeRequest>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  private normalizeText(value?: string): string | null {
    if (value === undefined) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveAttendanceFromDate(range?: AttendanceRange): Date {
    const now = new Date();
    switch (range) {
      case AttendanceRange.MONTH:
        return subMonths(now, 1);
      case AttendanceRange.QUARTER:
        return subMonths(now, 3);
      case AttendanceRange.YEAR:
        return subYears(now, 1);
      case AttendanceRange.WEEK:
      default:
        return subDays(now, 7);
    }
  }

  async getMyProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['auth', 'billingProfile'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    return {
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      status: user.status,
      authProvider: user.auth?.authProvider ?? AuthProvider.LOCAL,
      emailVerifiedAt: user.auth?.emailVerifiedAt ?? null,
      createdAt: user.createdAt,
      billingCard: user.billingProfile
        ? {
            cardBrand: user.billingProfile.cardBrand ?? null,
            cardLastFour: user.billingProfile.cardLastFour ?? null,
            cardIssuer: user.billingProfile.cardIssuer ?? null,
            cardholderName: user.billingProfile.cardholderName ?? null,
            cardExpirationMonth: user.billingProfile.cardExpirationMonth ?? null,
            cardExpirationYear: user.billingProfile.cardExpirationYear ?? null,
          }
        : null,
    };
  }

  async updateMyProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    if (dto.firstName !== undefined) {
      const value = this.normalizeText(dto.firstName);
      if (!value) throw new BadRequestException('El nombre no puede estar vacío.');
      user.firstName = value;
    }

    if (dto.lastName !== undefined) {
      const value = this.normalizeText(dto.lastName);
      if (!value) throw new BadRequestException('El apellido no puede estar vacío.');
      user.lastName = value;
    }

    if (dto.phone !== undefined) {
      user.phone = this.normalizeText(dto.phone);
    }

    if (dto.avatarUrl !== undefined) {
      const value = this.normalizeText(dto.avatarUrl);
      if (!value) {
        user.avatarUrl = null;
      } else {
        const isImageDataUrl = value.startsWith('data:image/');
        const isHttpUrl = /^https?:\/\//i.test(value);
        if (!isImageDataUrl && !isHttpUrl) {
          throw new BadRequestException('El formato del avatar no es válido.');
        }
        user.avatarUrl = value;
      }
    }

    const saved = await this.userRepository.save(user);
    return {
      message: 'Perfil actualizado correctamente.',
      user: {
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone ?? null,
        avatarUrl: saved.avatarUrl ?? null,
      },
    };
  }

  async changeMyPassword(userId: number, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('La confirmación no coincide con la nueva contraseña.');
    }

    const auth = await this.userAuthRepository
      .createQueryBuilder('auth')
      .addSelect('auth.password')
      .where('auth.user_id = :userId', { userId })
      .getOne();

    if (!auth) {
      throw new NotFoundException('No se encontró configuración de autenticación para este usuario.');
    }

    if (auth.authProvider !== AuthProvider.LOCAL) {
      throw new ForbiddenException('El cambio de contraseña solo está disponible para cuentas registradas con email y contraseña.');
    }

    if (!auth.password) {
      throw new BadRequestException('No hay contraseña local configurada para esta cuenta.');
    }

    const passwordMatches = await bcrypt.compare(dto.currentPassword, auth.password);
    if (!passwordMatches) {
      throw new BadRequestException('La contraseña actual no es correcta.');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, auth.password);
    if (isSamePassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual.');
    }

    auth.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userAuthRepository.save(auth);

    return { message: 'Contraseña actualizada correctamente.' };
  }

  async getAttendanceHistory(userId: number, range?: AttendanceRange) {
    const fromDate = this.resolveAttendanceFromDate(range);
    const attendances = await this.attendanceRepository.find({
      where: {
        userId,
        checkInAt: MoreThan(fromDate),
      },
      order: { checkInAt: 'DESC' },
      take: 300,
    });

    return {
      range: range ?? AttendanceRange.WEEK,
      from: fromDate.toISOString(),
      total: attendances.length,
      items: attendances.map((attendance) => ({
        uuid: attendance.uuid,
        checkInAt: attendance.checkInAt,
        activitySlug: attendance.activitySlug ?? null,
        activityName: attendance.activitySlug ? (ACTIVITY_LABELS[attendance.activitySlug] ?? attendance.activitySlug) : 'Actividad',
        gymLocation: attendance.gymLocation ?? null,
        deviceId: attendance.deviceId ?? null,
      })),
    };
  }

  async getPaymentHistory(userId: number) {
    const invoices = await this.invoiceRepository.find({
      where: { userId },
      relations: ['subscription'],
      order: { createdAt: 'DESC' },
      take: 200,
    });

    return {
      total: invoices.length,
      items: invoices.map((invoice) => {
        const appliedTo = invoice.subscriptionId
          ? `Suscripción ${invoice.subscription?.planId ?? ''}`.trim()
          : 'Período puntual';

        return {
          uuid: invoice.uuid,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
          paymentMethod: invoice.paymentMethod,
          paidAt: invoice.paidAt ?? null,
          createdAt: invoice.createdAt,
          appliedTo,
          subscriptionId: invoice.subscriptionId ?? null,
        };
      }),
    };
  }

  async getSubscriptionOverview(userId: number) {
    const currentSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: In([MembershipStatus.ACTIVE, MembershipStatus.PENDING_CANCELLATION, MembershipStatus.GRACE_PERIOD]),
      },
      order: { endDate: 'DESC' },
    });

    const pendingChange = await this.changeRequestRepository.findOne({
      where: {
        userId,
        status: SubscriptionChangeRequestStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    const plans = await this.planRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });

    return {
      currentSubscription: currentSubscription
        ? {
            uuid: currentSubscription.uuid,
            planId: currentSubscription.planId,
            status: currentSubscription.status,
            autoRenew: currentSubscription.autoRenew,
            startDate: currentSubscription.startDate,
            endDate: currentSubscription.endDate,
            billingCycleAnchorDay: currentSubscription.billingCycleAnchorDay,
          }
        : null,
      pendingChange: pendingChange
        ? {
            uuid: pendingChange.uuid,
            newPlanId: pendingChange.newPlanId ?? null,
            status: pendingChange.status,
            effectiveAt: pendingChange.effectiveAt,
            createdAt: pendingChange.createdAt,
          }
        : null,
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
      })),
    };
  }
}

