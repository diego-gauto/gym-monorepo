import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CurrencyCode, InvoiceStatus, MembershipStatus, PlanType } from '@gym-admin/shared';
import { randomUUID } from 'crypto';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { Invoice } from '../billing/entities/invoice.entity';
import { Plan } from '../billing/entities/plan.entity';
import { Subscription } from '../billing/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { CreateBenefitDto, UpdateBenefitDto } from './dto/benefit.dto';
import { UpsertPlanContentDto } from './dto/plan-content.dto';
import { UpdateSiteSettingsDto } from './dto/site-settings.dto';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainer.dto';
import { Activity } from './entities/activity.entity';
import { AdminContent } from './entities/admin-content.entity';
import { Benefit } from './entities/benefit.entity';
import { GymSiteSettings } from './entities/gym-site-settings.entity';
import { Trainer } from './entities/trainer.entity';

type SiteSettings = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBackgroundImage: string;
  gymName: string;
  gymAddress: string;
  gymEmail: string;
  gymPhone: string;
};

type TrainerItem = {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  active: boolean;
};

type ActivityItem = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  cardImage: string;
  level: string;
  duration: string;
  benefits: string[];
  schedule: string[];
  successCriteria: string[];
  trainerIds: string[];
  active: boolean;
};

type BenefitItem = {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  active: boolean;
};

type PlanItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  features: string[];
  highlight: boolean;
  badge?: string | null;
  active: boolean;
};

const LEGACY_KEY_SITE = 'site_settings';
const LEGACY_KEY_TRAINERS = 'trainers';
const LEGACY_KEY_ACTIVITIES = 'activities';
const LEGACY_KEY_BENEFITS = 'benefits';
const LEGACY_KEY_PLANS = 'plans';

const DEFAULT_SITE: SiteSettings = {
  heroBadge: '#1 EN FITNESS PREMIUM',
  heroTitle: 'Transformá tu cuerpo. Superá tus límites.',
  heroSubtitle: 'Unite al gimnasio más moderno de Argentina.',
  heroBackgroundImage: '/hero-bg.png',
  gymName: 'GYM MASTER',
  gymAddress: 'Av. del Libertador 1234, CABA',
  gymEmail: 'info@gymmaster.com.ar',
  gymPhone: '+54 11 4567-8900',
};

const DEFAULT_BENEFITS: Array<Omit<BenefitItem, 'id'>> = [
  { title: 'Equipamiento Premium', description: 'Máquinas de última generación.', iconKey: 'DUMBBELL', active: true },
  { title: 'Clases Grupales', description: 'Más de 15 clases semanales.', iconKey: 'GROUP', active: true },
  { title: 'Horarios Flexibles', description: 'Abierto de 6:00 a 23:00 hs.', iconKey: 'CLOCK', active: true },
  { title: 'Entrenadores Certificados', description: 'Profesionales con años de experiencia.', iconKey: 'TROPHY', active: true },
  { title: 'Seguimiento Personalizado', description: 'Planes adaptados a tus objetivos.', iconKey: 'HEART', active: true },
  { title: 'Resultados Medibles', description: 'Indicadores reales de progreso.', iconKey: 'BOLT', active: true },
];

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: PlanType.MONTHLY,
    name: 'Mensual',
    description: 'Ideal para empezar tu transformación',
    price: 15000,
    currency: CurrencyCode.ARS,
    features: ['Acceso completo al gimnasio', 'Uso de equipamiento premium'],
    highlight: false,
    badge: null,
    active: true,
  },
  {
    id: PlanType.QUARTERLY,
    name: 'Trimestral',
    description: 'La mejor relación precio-calidad',
    price: 36000,
    currency: CurrencyCode.ARS,
    features: ['Todo lo del plan mensual', 'Acceso a clases grupales'],
    highlight: true,
    badge: 'Más Popular',
    active: true,
  },
  {
    id: PlanType.YEARLY,
    name: 'Anual',
    description: 'Máximo compromiso, máximos beneficios',
    price: 120000,
    currency: CurrencyCode.ARS,
    features: ['Todo lo del plan trimestral', 'Seguimiento nutricional básico'],
    highlight: false,
    badge: null,
    active: true,
  },
];

@Injectable()
export class AdminContentService {
  private attemptedLegacyMigration = false;

  constructor(
    @InjectRepository(GymSiteSettings)
    private readonly siteSettingsRepository: Repository<GymSiteSettings>,
    @InjectRepository(Trainer)
    private readonly trainerRepository: Repository<Trainer>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Benefit)
    private readonly benefitRepository: Repository<Benefit>,
    @InjectRepository(AdminContent)
    private readonly legacyAdminContentRepository: Repository<AdminContent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  private fromRange(range?: string) {
    const now = new Date();
    const map: Record<string, number> = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    };
    const days = map[range ?? 'month'] ?? 30;
    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  }

  private toSiteSettings(payload: GymSiteSettings): SiteSettings {
    return {
      heroBadge: payload.heroBadge,
      heroTitle: payload.heroTitle,
      heroSubtitle: payload.heroSubtitle,
      heroBackgroundImage: payload.heroBackgroundImage,
      gymName: payload.gymName,
      gymAddress: payload.gymAddress,
      gymEmail: payload.gymEmail,
      gymPhone: payload.gymPhone,
    };
  }

  private toTrainerItem(payload: Trainer): TrainerItem {
    return {
      id: payload.id,
      name: payload.name,
      bio: payload.bio,
      avatarUrl: payload.avatarUrl,
      active: payload.active,
    };
  }

  private toActivityItem(payload: Activity): ActivityItem {
    return {
      id: payload.id,
      slug: payload.slug,
      name: payload.name,
      shortDescription: payload.shortDescription,
      description: payload.description,
      cardImage: payload.cardImage,
      level: payload.level,
      duration: payload.duration,
      benefits: payload.benefits ?? [],
      schedule: payload.schedule ?? [],
      successCriteria: payload.successCriteria ?? [],
      trainerIds: (payload.trainers ?? []).map((trainer) => trainer.id),
      active: payload.active,
    };
  }

  private toBenefitItem(payload: Benefit): BenefitItem {
    return {
      id: payload.id,
      title: payload.title,
      description: payload.description,
      iconKey: payload.iconKey,
      active: payload.active,
    };
  }

  private toPlanItem(payload: Plan): PlanItem {
    return {
      id: payload.id,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      currency: payload.currency,
      features: payload.features ?? [],
      highlight: payload.highlight,
      badge: payload.badge ?? null,
      active: payload.isActive,
    };
  }

  private asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asBoolean(value: unknown, fallback = true): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  private async getLegacyPayload<T>(key: string): Promise<T | null> {
    const row = await this.legacyAdminContentRepository.findOne({ where: { key } });
    if (!row) return null;
    return row.payload as T;
  }

  private async ensureLegacyMigration() {
    if (this.attemptedLegacyMigration) return;
    this.attemptedLegacyMigration = true;

    const [legacySite, legacyTrainers, legacyActivities, legacyBenefits, legacyPlans] = await Promise.all([
      this.getLegacyPayload<Record<string, unknown>>(LEGACY_KEY_SITE),
      this.getLegacyPayload<Array<Record<string, unknown>>>(LEGACY_KEY_TRAINERS),
      this.getLegacyPayload<Array<Record<string, unknown>>>(LEGACY_KEY_ACTIVITIES),
      this.getLegacyPayload<Array<Record<string, unknown>>>(LEGACY_KEY_BENEFITS),
      this.getLegacyPayload<Array<Record<string, unknown>>>(LEGACY_KEY_PLANS),
    ]);

    const [siteCount, trainerCount, activityCount, benefitCount] = await Promise.all([
      this.siteSettingsRepository.count(),
      this.trainerRepository.count(),
      this.activityRepository.count(),
      this.benefitRepository.count(),
    ]);

    if (siteCount === 0 && legacySite) {
      await this.siteSettingsRepository.save(
        this.siteSettingsRepository.create({
          ...DEFAULT_SITE,
          heroBadge: this.asString(legacySite.heroBadge, DEFAULT_SITE.heroBadge),
          heroTitle: this.asString(legacySite.heroTitle, DEFAULT_SITE.heroTitle),
          heroSubtitle: this.asString(legacySite.heroSubtitle, DEFAULT_SITE.heroSubtitle),
          heroBackgroundImage: this.asString(legacySite.heroBackgroundImage, DEFAULT_SITE.heroBackgroundImage),
          gymName: this.asString(legacySite.gymName, DEFAULT_SITE.gymName),
          gymAddress: this.asString(legacySite.gymAddress, DEFAULT_SITE.gymAddress),
          gymEmail: this.asString(legacySite.gymEmail, DEFAULT_SITE.gymEmail),
          gymPhone: this.asString(legacySite.gymPhone, DEFAULT_SITE.gymPhone),
        }),
      );
    }

    if (trainerCount === 0 && Array.isArray(legacyTrainers) && legacyTrainers.length > 0) {
      await this.trainerRepository.save(
        legacyTrainers.map((trainer) =>
          this.trainerRepository.create({
            id: this.asString(trainer.id, randomUUID()),
            name: this.asString(trainer.name, 'Profesor'),
            bio: this.asString(trainer.bio),
            avatarUrl: this.asString(trainer.avatarUrl),
            active: this.asBoolean(trainer.active, true),
          }),
        ),
      );
    }

    if (activityCount === 0 && Array.isArray(legacyActivities) && legacyActivities.length > 0) {
      const trainers = await this.trainerRepository.find();
      const trainersById = new Map(trainers.map((trainer) => [trainer.id, trainer]));
      const toSave: Activity[] = [];

      legacyActivities.forEach((activity) => {
        const trainerIds = this.asStringArray(activity.trainerIds);
        toSave.push(
          this.activityRepository.create({
            id: this.asString(activity.id, randomUUID()),
            slug: this.asString(activity.slug, 'actividad'),
            name: this.asString(activity.name, 'Actividad'),
            shortDescription: this.asString(activity.shortDescription),
            description: this.asString(activity.description),
            cardImage: this.asString(activity.cardImage),
            level: this.asString(activity.level, 'Todos'),
            duration: this.asString(activity.duration, '45 min'),
            benefits: this.asStringArray(activity.benefits),
            schedule: this.asStringArray(activity.schedule),
            successCriteria: this.asStringArray(activity.successCriteria),
            active: this.asBoolean(activity.active, true),
            trainers: trainerIds.map((trainerId) => trainersById.get(trainerId)).filter(Boolean) as Trainer[],
          }),
        );
      });

      await this.activityRepository.save(toSave);
    }

    if (benefitCount === 0 && Array.isArray(legacyBenefits) && legacyBenefits.length > 0) {
      await this.benefitRepository.save(
        legacyBenefits.map((benefit) =>
          this.benefitRepository.create({
            id: this.asString(benefit.id, randomUUID()),
            title: this.asString(benefit.title, 'Beneficio'),
            description: this.asString(benefit.description),
            iconKey: this.asString(benefit.iconKey, 'DUMBBELL'),
            active: this.asBoolean(benefit.active, true),
          }),
        ),
      );
    }

    if (Array.isArray(legacyPlans) && legacyPlans.length > 0) {
      for (const item of legacyPlans) {
        const planId = this.asString(item.id).toUpperCase() as PlanType;
        if (!planId) continue;
        const existing = await this.planRepository.findOne({ where: { id: planId } });
        const row = existing ?? this.planRepository.create({ id: planId });
        row.name = this.asString(item.name, row.name ?? planId);
        row.description = this.asString(item.description, row.description ?? '');
        row.price = Number(item.price ?? row.price ?? 0);
        row.currency = (item.currency as CurrencyCode) ?? row.currency ?? CurrencyCode.ARS;
        row.features = this.asStringArray(item.features);
        row.highlight = this.asBoolean(item.highlight, false);
        row.badge = this.asString(item.badge, '') || null;
        row.isActive = this.asBoolean(item.active, true);
        await this.planRepository.save(row);
      }
    }
  }

  private async ensureSiteSettings() {
    await this.ensureLegacyMigration();
    const existing = await this.siteSettingsRepository.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (existing) return existing;
    return this.siteSettingsRepository.save(this.siteSettingsRepository.create(DEFAULT_SITE));
  }

  private async ensureBenefitsDefaults() {
    await this.ensureLegacyMigration();
    const count = await this.benefitRepository.count();
    if (count > 0) return;

    await this.benefitRepository.save(
      DEFAULT_BENEFITS.map((benefit) =>
        this.benefitRepository.create({
          id: randomUUID(),
          ...benefit,
        }),
      ),
    );
  }

  private async ensurePlanDefaults() {
    const count = await this.planRepository.count();
    if (count > 0) return;

    await this.planRepository.save(
      DEFAULT_PLANS.map((plan) =>
        this.planRepository.create({
          id: plan.id as PlanType,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          features: plan.features,
          highlight: plan.highlight,
          badge: plan.badge ?? null,
          isActive: plan.active,
        }),
      ),
    );
  }

  async getSiteSettings() {
    const row = await this.ensureSiteSettings();
    return this.toSiteSettings(row);
  }

  async updateSiteSettings(payload: UpdateSiteSettingsDto) {
    const current = await this.ensureSiteSettings();
    Object.assign(current, payload);
    const saved = await this.siteSettingsRepository.save(current);
    return this.toSiteSettings(saved);
  }

  async getTrainers() {
    await this.ensureLegacyMigration();
    const rows = await this.trainerRepository.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toTrainerItem(row));
  }

  async createTrainer(payload: CreateTrainerDto) {
    await this.ensureLegacyMigration();
    const created = await this.trainerRepository.save(
      this.trainerRepository.create({
        id: randomUUID(),
        ...payload,
      }),
    );
    return this.toTrainerItem(created);
  }

  async updateTrainer(id: string, payload: UpdateTrainerDto) {
    await this.ensureLegacyMigration();
    const current = await this.trainerRepository.findOne({ where: { id } });
    if (!current) return null;

    Object.assign(current, payload);
    const updated = await this.trainerRepository.save(current);
    return this.toTrainerItem(updated);
  }

  async deleteTrainer(id: string) {
    await this.ensureLegacyMigration();
    const current = await this.trainerRepository.findOne({
      where: { id },
      relations: { activities: { trainers: true } },
    });
    if (!current) return { deleted: true };

    if (current.activities?.length > 0) {
      for (const activity of current.activities) {
        activity.trainers = (activity.trainers ?? []).filter((trainer) => trainer.id !== id);
        await this.activityRepository.save(activity);
      }
    }

    await this.trainerRepository.delete({ id });
    return { deleted: true };
  }

  async getActivities() {
    await this.ensureLegacyMigration();
    const rows = await this.activityRepository.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toActivityItem(row));
  }

  async createActivity(payload: CreateActivityDto) {
    await this.ensureLegacyMigration();
    const trainers =
      payload.trainerIds.length > 0
        ? await this.trainerRepository.find({ where: { id: In(payload.trainerIds) } })
        : [];

    const created = await this.activityRepository.save(
      this.activityRepository.create({
        id: randomUUID(),
        slug: payload.slug,
        name: payload.name,
        shortDescription: payload.shortDescription,
        description: payload.description,
        cardImage: payload.cardImage,
        level: payload.level,
        duration: payload.duration,
        benefits: payload.benefits,
        schedule: payload.schedule,
        successCriteria: payload.successCriteria,
        active: payload.active,
        trainers,
      }),
    );
    return this.toActivityItem(created);
  }

  async updateActivity(id: string, payload: UpdateActivityDto) {
    await this.ensureLegacyMigration();
    const current = await this.activityRepository.findOne({ where: { id } });
    if (!current) return null;

    if (payload.slug !== undefined) current.slug = payload.slug;
    if (payload.name !== undefined) current.name = payload.name;
    if (payload.shortDescription !== undefined) current.shortDescription = payload.shortDescription;
    if (payload.description !== undefined) current.description = payload.description;
    if (payload.cardImage !== undefined) current.cardImage = payload.cardImage;
    if (payload.level !== undefined) current.level = payload.level;
    if (payload.duration !== undefined) current.duration = payload.duration;
    if (payload.benefits !== undefined) current.benefits = payload.benefits;
    if (payload.schedule !== undefined) current.schedule = payload.schedule;
    if (payload.successCriteria !== undefined) current.successCriteria = payload.successCriteria;
    if (payload.active !== undefined) current.active = payload.active;

    if (payload.trainerIds !== undefined) {
      current.trainers =
        payload.trainerIds.length > 0
          ? await this.trainerRepository.find({ where: { id: In(payload.trainerIds) } })
          : [];
    }

    const updated = await this.activityRepository.save(current);
    return this.toActivityItem(updated);
  }

  async deleteActivity(id: string) {
    await this.ensureLegacyMigration();
    await this.activityRepository.delete({ id });
    return { deleted: true };
  }

  async getBenefits() {
    await this.ensureBenefitsDefaults();
    const rows = await this.benefitRepository.find({ order: { createdAt: 'ASC' } });
    return rows.map((row) => this.toBenefitItem(row));
  }

  async createBenefit(payload: CreateBenefitDto) {
    await this.ensureLegacyMigration();
    const created = await this.benefitRepository.save(
      this.benefitRepository.create({
        id: randomUUID(),
        ...payload,
      }),
    );
    return this.toBenefitItem(created);
  }

  async updateBenefit(id: string, payload: UpdateBenefitDto) {
    await this.ensureLegacyMigration();
    const current = await this.benefitRepository.findOne({ where: { id } });
    if (!current) return null;

    Object.assign(current, payload);
    const updated = await this.benefitRepository.save(current);
    return this.toBenefitItem(updated);
  }

  async deleteBenefit(id: string) {
    await this.ensureLegacyMigration();
    await this.benefitRepository.delete({ id });
    return { deleted: true };
  }

  async getPlanContent() {
    await this.ensureLegacyMigration();
    await this.ensurePlanDefaults();
    const rows = await this.planRepository.find({ order: { price: 'ASC' } });
    return rows.map((row) => this.toPlanItem(row));
  }

  async upsertPlanContent(payload: UpsertPlanContentDto) {
    await this.ensureLegacyMigration();

    const planId = payload.id.toUpperCase() as PlanType;
    const current = await this.planRepository.findOne({ where: { id: planId } });
    const row = current ?? this.planRepository.create({ id: planId });
    row.name = payload.name;
    row.description = payload.description;
    row.price = payload.price;
    row.currency = payload.currency;
    row.features = payload.features;
    row.highlight = payload.highlight;
    row.badge = payload.badge ?? null;
    row.isActive = payload.active;

    const saved = await this.planRepository.save(row);
    return this.toPlanItem(saved);
  }

  async deletePlanContent(id: string) {
    const planId = id.toUpperCase() as PlanType;
    const current = await this.planRepository.findOne({ where: { id: planId } });
    if (!current) return { deleted: true };
    current.isActive = false;
    await this.planRepository.save(current);
    return { deleted: true };
  }

  async getPublicHomeContent() {
    const [site, benefits, activities, plans, trainers] = await Promise.all([
      this.getSiteSettings(),
      this.getBenefits(),
      this.getActivities(),
      this.getPlanContent(),
      this.getTrainers(),
    ]);
    const trainerMap = new Map(trainers.map((trainer) => [trainer.id, trainer]));
    const normalizedActivities = activities
      .filter((activity) => activity.active)
      .map((activity) => ({
      ...activity,
      teachers: activity.trainerIds
        .map((trainerId) => trainerMap.get(trainerId))
        .filter((trainer): trainer is TrainerItem => Boolean(trainer?.active))
        .map((trainer) => trainer.name),
    }));

    return {
      site,
      benefits: benefits.filter((item) => item.active),
      activities: normalizedActivities,
      plans: plans.filter((plan) => plan.active),
    };
  }

  async getPublicActivities() {
    const content = await this.getPublicHomeContent();
    return content.activities;
  }

  async getPublicActivityBySlug(slug: string) {
    const activities = await this.getPublicActivities();
    return activities.find((activity) => activity.slug === slug) ?? null;
  }

  async getStats(range?: string) {
    const fromDate = this.fromRange(range);
    const now = new Date();
    const activeStatuses = [MembershipStatus.ACTIVE, MembershipStatus.PENDING_CANCELLATION, MembershipStatus.GRACE_PERIOD];

    const [
      totalUsers,
      newUsers,
      activeUsers,
      activeSubscriptions,
      stoppedSubscriptions,
      cancelledSubscriptions,
      oneTimePaidInvoices,
      activeSubs,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { createdAt: MoreThan(fromDate) } }),
      this.userRepository.count({ where: { status: MembershipStatus.ACTIVE } }),
      this.subscriptionRepository.count({ where: { status: In(activeStatuses), endDate: MoreThan(now) } as any }),
      this.subscriptionRepository.count({
        where: { status: In([MembershipStatus.REJECTED, MembershipStatus.REJECTED_FATAL, MembershipStatus.EXPIRED]) } as any,
      }),
      this.subscriptionRepository.count({ where: { status: MembershipStatus.CANCELLED } }),
      this.invoiceRepository.find({ where: { status: InvoiceStatus.PAID, paidAt: MoreThan(fromDate), subscriptionId: IsNull() } }),
      this.subscriptionRepository.find({ where: { status: In(activeStatuses), endDate: MoreThan(now) } as any }),
    ]);

    const byPlan = activeSubs.reduce<Record<string, number>>((acc, subscription) => {
      acc[subscription.planId] = (acc[subscription.planId] ?? 0) + 1;
      return acc;
    }, {});

    const oneTimeByAmount = oneTimePaidInvoices.reduce<Record<string, number>>((acc, invoice) => {
      const key = `${invoice.currency} ${invoice.amount}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return {
      range: range ?? 'month',
      from: fromDate,
      totals: {
        users: totalUsers,
        newUsers,
        activeUsers,
        activeSubscriptions,
        oneTimePaidUsers: oneTimePaidInvoices.length,
        stoppedPaying: stoppedSubscriptions,
        cancelled: cancelledSubscriptions,
      },
      subscriptionsByPlan: byPlan,
      oneTimeByAmount,
    };
  }
}
