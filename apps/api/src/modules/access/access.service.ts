import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { InvoiceStatus, MembershipStatus, PlanType } from '@gym-admin/shared';
import { createHmac, timingSafeEqual } from 'crypto';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { Invoice } from '../billing/entities/invoice.entity';
import { Plan } from '../billing/entities/plan.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { Attendance } from './entities/attendance.entity';
import { MedicalCertificate } from './entities/medical-certificate.entity';

type CheckInActivity = {
  slug: string;
  name: string;
};

type CheckInQrValidation = {
  ok: boolean;
  reason: string | null;
};

type GymGeoConfig = {
  lat: number;
  lng: number;
  radiusMeters: number;
};

type MembershipEligibility = {
  ok: boolean;
  source: 'SUBSCRIPTION' | 'ONE_TIME_PERIOD' | 'NONE';
  inGrace: boolean;
  graceEndsAt: string | null;
};

type MedicalEligibility = {
  ok: boolean;
  validUntil: string | null;
};

export type CheckInEligibilityResponse = {
  canCheckIn: boolean;
  reason: string | null;
  user: {
    uuid: string;
    name: string;
  };
  membership: MembershipEligibility;
  medicalCertificate: MedicalEligibility;
};

export type RegisterCheckInInput = {
  activitySlug: string;
  gymLocation?: string;
  deviceId?: string;
};

const CHECK_IN_ACTIVITIES: CheckInActivity[] = [
  { slug: 'musculacion', name: 'Musculación' },
  { slug: 'crossfit', name: 'Crossfit' },
  { slug: 'yoga', name: 'Yoga' },
  { slug: 'boxing', name: 'Boxeo' },
  { slug: 'spinning', name: 'Spinning' },
  { slug: 'funcional', name: 'Funcional' },
];

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MedicalCertificate)
    private readonly medicalCertificateRepository: Repository<MedicalCertificate>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    private readonly configService: ConfigService,
  ) {}

  getAvailableActivities() {
    return CHECK_IN_ACTIVITIES;
  }

  private normalizeGymLocation(gymLocation?: string | null): string {
    const normalized = (gymLocation ?? 'main').trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,40}$/.test(normalized)) return 'main';
    return normalized;
  }

  private parseTimeToMinutes(value: string): number {
    const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
    if (!match) return 0;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return 0;
    return (hours * 60) + minutes;
  }

  private getCheckInTimezone() {
    return this.configService.get<string>('CHECKIN_TIMEZONE') ?? 'America/Argentina/Buenos_Aires';
  }

  private getOpenMinutes() {
    const raw = this.configService.get<string>('CHECKIN_OPEN_TIME') ?? '06:00';
    return this.parseTimeToMinutes(raw);
  }

  private getCloseMinutes() {
    const raw = this.configService.get<string>('CHECKIN_CLOSE_TIME') ?? '23:00';
    return this.parseTimeToMinutes(raw);
  }

  private getCurrentZonedDateInfo(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.getCheckInTimezone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
    const dateKey = `${year}-${month}-${day}`;

    return {
      dateKey,
      minutesOfDay: (hour * 60) + minute,
    };
  }

  private isWithinCheckInWindow(minutesOfDay: number): boolean {
    const open = this.getOpenMinutes();
    const close = this.getCloseMinutes();

    if (open === close) return true;
    if (close > open) return minutesOfDay >= open && minutesOfDay < close;
    return minutesOfDay >= open || minutesOfDay < close;
  }

  private getDailyQrSecret() {
    return this.configService.get<string>('CHECKIN_QR_SECRET') ?? this.configService.get<string>('JWT_SECRET') ?? 'checkin-secret';
  }

  private buildDailyQrToken(gymLocation: string, dateKey: string): string {
    const signature = createHmac('sha256', this.getDailyQrSecret())
      .update(`${gymLocation}|${dateKey}`)
      .digest('hex')
      .slice(0, 32);

    return `${dateKey}.${signature}`;
  }

  private validateDailyQrToken(gymLocation: string, token?: string | null): CheckInQrValidation {
    if (!token) {
      return { ok: false, reason: 'QR inválido o ausente. Escaneá el código del gimnasio.' };
    }

    const match = /^(\d{4}-\d{2}-\d{2})\.([a-f0-9]{32})$/.exec(token.trim());
    if (!match) {
      return { ok: false, reason: 'QR inválido. Escaneá nuevamente el código.' };
    }

    const nowInfo = this.getCurrentZonedDateInfo(new Date());
    const tokenDate = match[1];
    const tokenSignature = match[2];

    if (tokenDate !== nowInfo.dateKey) {
      return { ok: false, reason: 'El QR está vencido. Solicitá el QR del día en recepción.' };
    }

    if (!this.isWithinCheckInWindow(nowInfo.minutesOfDay)) {
      return { ok: false, reason: 'El check-in no está habilitado en este horario.' };
    }

    const expectedToken = this.buildDailyQrToken(gymLocation, tokenDate);
    const expectedSignature = expectedToken.split('.')[1] ?? '';
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const providedBuffer = Buffer.from(tokenSignature, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
      return { ok: false, reason: 'QR inválido o manipulado.' };
    }

    return { ok: true, reason: null };
  }

  private getGeoConfigMap(): Record<string, GymGeoConfig> {
    const fromJson = this.configService.get<string>('CHECKIN_GYM_GEOFENCE_JSON');
    if (fromJson) {
      try {
        const parsed = JSON.parse(fromJson) as Record<string, { lat?: number; lng?: number; radiusMeters?: number }>;
        const result: Record<string, GymGeoConfig> = {};
        for (const [key, value] of Object.entries(parsed)) {
          const normalizedKey = this.normalizeGymLocation(key);
          const lat = Number(value.lat);
          const lng = Number(value.lng);
          const radius = Number(value.radiusMeters);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius) || radius <= 0) continue;
          result[normalizedKey] = { lat, lng, radiusMeters: radius };
        }
        if (Object.keys(result).length > 0) return result;
      } catch {
        // ignore malformed JSON and try fallback envs
      }
    }

    const mainLat = Number(this.configService.get<string | number>('CHECKIN_MAIN_LAT'));
    const mainLng = Number(this.configService.get<string | number>('CHECKIN_MAIN_LNG'));
    const mainRadius = Number(this.configService.get<string | number>('CHECKIN_MAIN_RADIUS_METERS') ?? 500);
    if (Number.isFinite(mainLat) && Number.isFinite(mainLng) && Number.isFinite(mainRadius) && mainRadius > 0) {
      return {
        main: { lat: mainLat, lng: mainLng, radiusMeters: mainRadius },
      };
    }

    return {};
  }

  private isGeolocationRequired() {
    const raw = (this.configService.get<string>('CHECKIN_REQUIRE_GEOLOCATION') ?? 'false').trim().toLowerCase();
    return raw !== 'false' && raw !== '0' && raw !== 'no';
  }

  private calculateDistanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const latDistance = toRadians(toLat - fromLat);
    const lngDistance = toRadians(toLng - fromLng);
    const a = Math.sin(latDistance / 2) ** 2
      + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(lngDistance / 2) ** 2;
    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private validateGeolocation(gymLocation: string, latitude?: number, longitude?: number) {
    if (!this.isGeolocationRequired()) return;

    const geofenceMap = this.getGeoConfigMap();
    const config = geofenceMap[gymLocation];
    if (!config) {
      throw new UnauthorizedException('No hay geocerca configurada para esta sede.');
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new UnauthorizedException('Debés habilitar geolocalización para registrar ingreso.');
    }

    const distanceMeters = this.calculateDistanceMeters(latitude!, longitude!, config.lat, config.lng);
    if (distanceMeters > config.radiusMeters) {
      throw new UnauthorizedException('Tu ubicación está fuera del área habilitada para esta sede.');
    }
  }

  private resolveFrontendBaseUrl(overrideBaseUrl?: string): string {
    const parseOrigin = (value?: string): string | null => {
      if (!value) return null;
      try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.origin;
      } catch {
        return null;
      }
    };

    const overrideOrigin = parseOrigin(overrideBaseUrl);
    if (overrideOrigin) return overrideOrigin;

    const configuredOrigin = parseOrigin(this.configService.get<string>('FRONTEND_URL'));
    if (configuredOrigin) return configuredOrigin;

    return 'http://localhost:3000';
  }

  generateCheckInQr(gymLocation?: string, overrideBaseUrl?: string) {
    const gym = this.normalizeGymLocation(gymLocation);
    const nowInfo = this.getCurrentZonedDateInfo(new Date());
    const dailyToken = this.buildDailyQrToken(gym, nowInfo.dateKey);
    const frontendBase = this.resolveFrontendBaseUrl(overrideBaseUrl);
    const checkInUrl = `${frontendBase}/check-in?gym=${encodeURIComponent(gym)}&t=${encodeURIComponent(dailyToken)}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&format=png&data=${encodeURIComponent(checkInUrl)}`;

    return {
      gymLocation: gym,
      token: dailyToken,
      checkInUrl,
      qrImageUrl,
      generatedAt: new Date().toISOString(),
    };
  }

  validateQrAccess(gymLocation?: string, token?: string | null): CheckInQrValidation {
    const gym = this.normalizeGymLocation(gymLocation);
    return this.validateDailyQrToken(gym, token);
  }

  private getSinglePeriodDays() {
    const raw = this.configService.get<string | number>('ACCESS_SINGLE_PERIOD_DAYS');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }

  private getSingleGraceDays() {
    const raw = this.configService.get<string | number>('ACCESS_SINGLE_GRACE_DAYS');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 7;
  }

  private getPeriodDaysByPlan(planId: PlanType) {
    switch (planId) {
      case PlanType.MONTHLY:
        return 30;
      case PlanType.QUARTERLY:
        return 90;
      case PlanType.YEARLY:
        return 365;
      default:
        return this.getSinglePeriodDays();
    }
  }

  private async resolveSinglePeriodDaysFromInvoice(invoice: Invoice): Promise<number> {
    const matchedPlan = await this.planRepository.findOne({
      where: {
        currency: invoice.currency,
        price: invoice.amount,
        isActive: true,
      },
    });
    if (!matchedPlan) return this.getSinglePeriodDays();
    return this.getPeriodDaysByPlan(matchedPlan.id);
  }

  private getUserName(user: User) {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (fullName.length > 0) return fullName;
    if (user.email) return user.email;
    return 'Usuario';
  }

  private async resolveMembershipEligibility(user: User): Promise<MembershipEligibility> {
    const now = new Date();
    const statusAllowed = [MembershipStatus.ACTIVE, MembershipStatus.GRACE_PERIOD, MembershipStatus.PENDING_CANCELLATION];

    const activeSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId: user.id,
        status: In(statusAllowed),
        endDate: MoreThan(now),
      },
      order: { endDate: 'DESC' },
    });

    if (activeSubscription) {
      return {
        ok: true,
        source: 'SUBSCRIPTION',
        inGrace: activeSubscription.status === MembershipStatus.GRACE_PERIOD,
        graceEndsAt: activeSubscription.status === MembershipStatus.GRACE_PERIOD ? activeSubscription.endDate.toISOString() : null,
      };
    }

    const latestSingleInvoice = await this.invoiceRepository.findOne({
      where: {
        userId: user.id,
        status: InvoiceStatus.PAID,
        subscriptionId: IsNull(),
      },
      order: { paidAt: 'DESC', createdAt: 'DESC' },
    });

    if (latestSingleInvoice) {
      const paidReference = latestSingleInvoice.paidAt ?? latestSingleInvoice.createdAt;
      const periodDays = await this.resolveSinglePeriodDaysFromInvoice(latestSingleInvoice);
      const periodEnd = addDays(paidReference, periodDays);
      const graceEnd = addDays(periodEnd, this.getSingleGraceDays());
      if (graceEnd >= now) {
        return {
          ok: true,
          source: 'ONE_TIME_PERIOD',
          inGrace: now > periodEnd,
          graceEndsAt: graceEnd.toISOString(),
        };
      }
    }

    return {
      ok: false,
      source: 'NONE',
      inGrace: false,
      graceEndsAt: null,
    };
  }

  private async resolveMedicalEligibility(userId: number): Promise<MedicalEligibility> {
    const certificate = await this.medicalCertificateRepository.findOne({
      where: { userId },
      order: { validUntil: 'DESC' },
    });

    if (!certificate) {
      return { ok: false, validUntil: null };
    }

    return {
      ok: certificate.validUntil >= new Date(),
      validUntil: certificate.validUntil.toISOString(),
    };
  }

  async getCheckInEligibility(userUuid: string, gymLocation?: string, qrToken?: string): Promise<CheckInEligibilityResponse> {
    const gym = this.normalizeGymLocation(gymLocation);
    const tokenValidation = this.validateDailyQrToken(gym, qrToken);
    if (!tokenValidation.ok) {
      throw new UnauthorizedException(tokenValidation.reason ?? 'QR inválido');
    }

    const user = await this.userRepository.findOne({
      where: { uuid: userUuid },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const membership = await this.resolveMembershipEligibility(user);
    const medicalCertificate = await this.resolveMedicalEligibility(user.id);

    if (!membership.ok) {
      return {
        canCheckIn: false,
        reason: 'No tenés suscripción activa o período pago vigente para usar las instalaciones.',
        user: { uuid: user.uuid, name: this.getUserName(user) },
        membership,
        medicalCertificate,
      };
    }

    if (!medicalCertificate.ok) {
      return {
        canCheckIn: false,
        reason: 'Necesitás un apto físico vigente para ingresar.',
        user: { uuid: user.uuid, name: this.getUserName(user) },
        membership,
        medicalCertificate,
      };
    }

    return {
      canCheckIn: true,
      reason: null,
      user: { uuid: user.uuid, name: this.getUserName(user) },
      membership,
      medicalCertificate,
    };
  }

  async canAccess(userUuid: string): Promise<boolean> {
    const eligibility = await this.getCheckInEligibility(userUuid);
    return eligibility.canCheckIn;
  }

  async registerCheckIn(
    userUuid: string,
    input: RegisterCheckInInput & { qrToken?: string; latitude?: number; longitude?: number },
  ): Promise<Attendance> {
    const user = await this.userRepository.findOne({
      where: { uuid: userUuid },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const activity = CHECK_IN_ACTIVITIES.find((item) => item.slug === input.activitySlug);
    if (!activity) {
      throw new BadRequestException('La actividad seleccionada no es válida.');
    }

    const gymLocation = this.normalizeGymLocation(input.gymLocation);
    const eligibility = await this.getCheckInEligibility(userUuid, gymLocation, input.qrToken);
    if (!eligibility.canCheckIn) {
      throw new UnauthorizedException(eligibility.reason ?? 'No podés hacer check-in en este momento.');
    }

    this.validateGeolocation(gymLocation, input.latitude, input.longitude);

    const attendance: Attendance = this.attendanceRepository.create({
      userId: user.id,
      checkInAt: new Date(),
      deviceId: input.deviceId,
      activitySlug: activity.slug,
      gymLocation,
    });

    return this.attendanceRepository.save(attendance);
  }
}
