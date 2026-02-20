import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CurrencyCode, PlanType } from '@gym-admin/shared';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { Plan } from '../billing/entities/plan.entity';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { AdminBillingService } from './admin-billing.service';
import { CreateBenefitDto, UpdateBenefitDto } from './dto/benefit.dto';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { RegisterCounterPaymentDto } from './dto/register-counter-payment.dto';
import { UpsertPlanContentDto } from './dto/plan-content.dto';
import { UpdateSiteSettingsDto } from './dto/site-settings.dto';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainer.dto';
import { Activity } from './entities/activity.entity';
import { AdminContent } from './entities/admin-content.entity';
import { Benefit } from './entities/benefit.entity';
import { GymBranch } from './entities/gym-branch.entity';
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

type BranchItem = {
  id: string;
  code: string;
  name: string;
  address: string;
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

const DEFAULT_TRAINERS: TrainerItem[] = [
  { id: 'tr-juan-perez', name: 'Juan Pérez', bio: 'Entrenador de fuerza y rendimiento.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-maria-garcia', name: 'María García', bio: 'Especialista en hipertrofia y técnica.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-carlos-lopez', name: 'Carlos López', bio: 'Coach de alto rendimiento funcional.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-lucia-fernandez', name: 'Lucía Fernández', bio: 'Preparadora física y movilidad.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-sofia-ruiz', name: 'Sofía Ruiz', bio: 'Instructora de yoga y respiración.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-valentina-mora', name: 'Valentina Mora', bio: 'Profesora de yoga terapéutico.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-nicolas-rojas', name: 'Nicolás Rojas', bio: 'Coach de boxeo técnico.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-bruno-diaz', name: 'Bruno Díaz', bio: 'Entrenador de combate y resistencia.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-micaela-soto', name: 'Micaela Soto', bio: 'Instructora de spinning y cardio.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-ramiro-paz', name: 'Ramiro Paz', bio: 'Coach de potencia aeróbica.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-camila-torres', name: 'Camila Torres', bio: 'Entrenadora funcional y core.', avatarUrl: '/logo.png', active: true },
  { id: 'tr-leandro-nunez', name: 'Leandro Núñez', bio: 'Especialista en acondicionamiento.', avatarUrl: '/logo.png', active: true },
];

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-musculacion',
    slug: 'musculacion',
    name: 'Musculación',
    shortDescription: 'Fuerza y masa muscular',
    description: 'Entrenamiento de fuerza guiado para ganar músculo, mejorar postura y construir una base sólida.',
    cardImage: '/musculacion.png',
    level: 'Todos los niveles',
    duration: '45 a 60 minutos',
    benefits: ['Aumento de masa muscular', 'Mejora de densidad ósea', 'Metabolismo activo'],
    schedule: ['Lunes a Viernes · 06:00 a 23:00', 'Sábados · 08:00 a 20:00'],
    successCriteria: ['Completar rutina semanal', 'Mejorar técnica de base', 'Incrementar cargas de forma progresiva'],
    trainerIds: ['tr-juan-perez', 'tr-maria-garcia'],
    active: true,
  },
  {
    id: 'act-crossfit',
    slug: 'crossfit',
    name: 'Crossfit',
    shortDescription: 'Rendimiento integral',
    description: 'WODs dinámicos para mejorar fuerza, coordinación y resistencia en un entorno de comunidad.',
    cardImage: '/crossfit.png',
    level: 'Intermedio a avanzado',
    duration: '50 minutos',
    benefits: ['Capacidad aeróbica', 'Fuerza funcional', 'Motivación grupal'],
    schedule: ['Lunes a Viernes · Clases cada 1 hora desde las 07:00', 'Sábados · 09:00, 10:00 y 11:00'],
    successCriteria: ['Mejorar tiempos de WOD', 'Mantener técnica bajo fatiga', 'Aumentar constancia mensual'],
    trainerIds: ['tr-carlos-lopez', 'tr-lucia-fernandez'],
    active: true,
  },
  {
    id: 'act-yoga',
    slug: 'yoga',
    name: 'Yoga',
    shortDescription: 'Cuerpo y mente',
    description: 'Sesiones enfocadas en movilidad, respiración y equilibrio para reducir estrés y mejorar bienestar.',
    cardImage: '/yoga.png',
    level: 'Inicial a intermedio',
    duration: '60 minutos',
    benefits: ['Mayor movilidad', 'Menor estrés', 'Mejor respiración'],
    schedule: ['Lunes, Miércoles y Viernes · 08:00 y 19:00', 'Martes y Jueves · 20:00'],
    successCriteria: ['Lograr secuencias fluidas', 'Aumentar flexibilidad', 'Mejorar control postural'],
    trainerIds: ['tr-sofia-ruiz', 'tr-valentina-mora'],
    active: true,
  },
  {
    id: 'act-boxing',
    slug: 'boxing',
    name: 'Boxeo',
    shortDescription: 'Técnica y explosión',
    description: 'Entrenamiento técnico y físico que combina coordinación, potencia y trabajo cardiovascular.',
    cardImage: '/boxing.png',
    level: 'Todos los niveles',
    duration: '55 minutos',
    benefits: ['Mejor coordinación', 'Potencia de golpe', 'Alta quema calórica'],
    schedule: ['Lunes a Viernes · 18:00 y 20:00', 'Sábados · 10:30'],
    successCriteria: ['Dominar guardia y desplazamiento', 'Mejorar resistencia por rounds', 'Perfeccionar combinaciones'],
    trainerIds: ['tr-nicolas-rojas', 'tr-bruno-diaz'],
    active: true,
  },
  {
    id: 'act-spinning',
    slug: 'spinning',
    name: 'Spinning',
    shortDescription: 'Cardio intensivo',
    description: 'Clases de bici indoor con música y cambios de ritmo para maximizar resistencia y energía.',
    cardImage: '/spinning.png',
    level: 'Inicial a avanzado',
    duration: '45 minutos',
    benefits: ['Resistencia cardiovascular', 'Trabajo de piernas', 'Alto gasto energético'],
    schedule: ['Lunes a Viernes · 07:00, 13:00 y 19:00', 'Sábados · 09:00'],
    successCriteria: ['Sostener cadencia objetivo', 'Controlar zonas de esfuerzo', 'Aumentar rendimiento semanal'],
    trainerIds: ['tr-micaela-soto', 'tr-ramiro-paz'],
    active: true,
  },
  {
    id: 'act-funcional',
    slug: 'funcional',
    name: 'Funcional',
    shortDescription: 'Entrenamiento funcional',
    description: 'Circuitos integrales que mejoran movimientos del día a día con foco en fuerza, agilidad y estabilidad.',
    cardImage: '/funcional.svg',
    level: 'Todos los niveles',
    duration: '50 minutos',
    benefits: ['Mejor coordinación global', 'Mayor estabilidad de core', 'Movilidad aplicada'],
    schedule: ['Lunes a Viernes · 08:00, 12:00 y 19:30', 'Sábados · 11:00'],
    successCriteria: ['Completar circuitos con buena técnica', 'Progresar en repeticiones', 'Mejorar agilidad y control'],
    trainerIds: ['tr-camila-torres', 'tr-leandro-nunez'],
    active: true,
  },
];

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: PlanType.MONTHLY,
    name: 'Mensual',
    description: 'Ideal para empezar tu transformación con acceso completo a sala y equipamiento premium.',
    price: 15000,
    currency: CurrencyCode.ARS,
    features: ['Acceso completo al gimnasio', 'Uso de equipamiento premium', 'Vestuarios con lockers', 'WiFi gratis'],
    highlight: false,
    badge: null,
    active: true,
  },
  {
    id: PlanType.QUARTERLY,
    name: 'Trimestral',
    description: 'La mejor relación precio-calidad para sostener progreso con clases y seguimiento inicial.',
    price: 36000,
    currency: CurrencyCode.ARS,
    features: [
      'Todo lo del plan Mensual',
      'Acceso a clases grupales',
      'Evaluación física inicial',
      'Plan de entrenamiento personalizado',
      '10% descuento en tienda',
    ],
    highlight: true,
    badge: 'Más Popular',
    active: true,
  },
  {
    id: PlanType.YEARLY,
    name: 'Anual',
    description: 'Máximo compromiso con beneficios exclusivos para mantener resultados durante todo el año.',
    price: 120000,
    currency: CurrencyCode.ARS,
    features: [
      'Todo lo del plan Trimestral',
      'Acceso prioritario a nuevas clases',
      'Seguimiento nutricional básico',
      '2 sesiones de PT incluidas',
      '20% descuento en tienda',
      'Congelamiento de membresía (30 días)',
    ],
    highlight: false,
    badge: null,
    active: true,
  },
];

const DEFAULT_BRANCHES: BranchItem[] = [
  {
    id: 'branch-main',
    code: 'main',
    name: 'Sede Principal',
    address: 'Av. del Libertador 1234, CABA',
    active: true,
  },
  {
    id: 'branch-centro',
    code: 'centro',
    name: 'Sede Centro',
    address: 'Av. Corrientes 2100, CABA',
    active: false,
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
    @InjectRepository(GymBranch)
    private readonly branchRepository: Repository<GymBranch>,
    @InjectRepository(AdminContent)
    private readonly legacyAdminContentRepository: Repository<AdminContent>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly adminBillingService: AdminBillingService,
  ) {}

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

  private toBranchItem(payload: GymBranch): BranchItem {
    return {
      id: payload.id,
      code: payload.code,
      name: payload.name,
      address: payload.address,
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

  private toActivitySlug(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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

  private async ensureTrainersDefaults() {
    await this.ensureLegacyMigration();
    const count = await this.trainerRepository.count();
    if (count > 0) return;

    await this.trainerRepository.save(
      DEFAULT_TRAINERS.map((trainer) =>
        this.trainerRepository.create({
          id: trainer.id,
          name: trainer.name,
          bio: trainer.bio,
          avatarUrl: trainer.avatarUrl,
          active: trainer.active,
        }),
      ),
    );
  }

  private async ensureActivitiesDefaults() {
    await this.ensureLegacyMigration();
    const count = await this.activityRepository.count();
    if (count > 0) return;

    await this.ensureTrainersDefaults();
    const trainers = await this.trainerRepository.find();
    const trainerMap = new Map(trainers.map((trainer) => [trainer.id, trainer]));

    await this.activityRepository.save(
      DEFAULT_ACTIVITIES.map((activity) =>
        this.activityRepository.create({
          id: activity.id,
          slug: activity.slug,
          name: activity.name,
          shortDescription: activity.shortDescription,
          description: activity.description,
          cardImage: activity.cardImage,
          level: activity.level,
          duration: activity.duration,
          benefits: activity.benefits,
          schedule: activity.schedule,
          successCriteria: activity.successCriteria,
          active: activity.active,
          trainers: activity.trainerIds
            .map((trainerId) => trainerMap.get(trainerId))
            .filter((trainer): trainer is Trainer => Boolean(trainer)),
        }),
      ),
    );
  }

  private async ensurePlanDefaults() {
    await this.ensureLegacyMigration();
    const currentPlans = await this.planRepository.find();
    const byId = new Map(currentPlans.map((plan) => [plan.id, plan]));
    const toSave: Plan[] = [];

    for (const defaultPlan of DEFAULT_PLANS) {
      const planId = defaultPlan.id as PlanType;
      const existing = byId.get(planId);
      const row = existing ?? this.planRepository.create({ id: planId });

      if (!existing || !row.name) row.name = defaultPlan.name;
      if (!existing || !row.price) row.price = defaultPlan.price;
      if (!existing || !row.currency) row.currency = defaultPlan.currency;
      if (!row.description || row.description.trim().length === 0) row.description = defaultPlan.description;
      if (!Array.isArray(row.features) || row.features.length === 0) row.features = [...defaultPlan.features];
      if (row.badge == null && defaultPlan.badge) row.badge = defaultPlan.badge;
      if (!existing) row.highlight = defaultPlan.highlight;
      if (!existing) row.isActive = defaultPlan.active;

      toSave.push(row);
    }

    if (toSave.length > 0) {
      await this.planRepository.save(toSave);
    }
  }

  private async ensureBranchDefaults() {
    await this.ensureLegacyMigration();
    const count = await this.branchRepository.count();
    if (count > 0) return;

    await this.branchRepository.save(
      DEFAULT_BRANCHES.map((branch) =>
        this.branchRepository.create({
          id: branch.id,
          code: branch.code,
          name: branch.name,
          address: branch.address,
          active: branch.active,
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
    await this.ensureTrainersDefaults();
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
    await this.ensureActivitiesDefaults();
    const rows = await this.activityRepository.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toActivityItem(row));
  }

  async createActivity(payload: CreateActivityDto) {
    await this.ensureLegacyMigration();
    const derivedSlug = this.toActivitySlug(payload.name);
    const trainers =
      payload.trainerIds.length > 0
        ? await this.trainerRepository.find({ where: { id: In(payload.trainerIds) } })
        : [];

    const created = await this.activityRepository.save(
      this.activityRepository.create({
        id: randomUUID(),
        slug: derivedSlug || payload.slug.trim().toLowerCase(),
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

    if (payload.name !== undefined) {
      current.name = payload.name;
      const derivedSlug = this.toActivitySlug(payload.name);
      if (derivedSlug) current.slug = derivedSlug;
    }
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

  async getBranches() {
    await this.ensureBranchDefaults();
    const rows = await this.branchRepository.find({ order: { createdAt: 'ASC' } });
    return rows.map((row) => this.toBranchItem(row));
  }

  async createBranch(payload: CreateBranchDto) {
    await this.ensureLegacyMigration();
    const created = await this.branchRepository.save(
      this.branchRepository.create({
        id: randomUUID(),
        code: payload.code.trim().toLowerCase(),
        name: payload.name.trim(),
        address: payload.address?.trim() ?? '',
        active: payload.active,
      }),
    );
    return this.toBranchItem(created);
  }

  async updateBranch(id: string, payload: UpdateBranchDto) {
    await this.ensureLegacyMigration();
    const current = await this.branchRepository.findOne({ where: { id } });
    if (!current) return null;

    if (payload.code !== undefined) current.code = payload.code.trim().toLowerCase();
    if (payload.name !== undefined) current.name = payload.name.trim();
    if (payload.address !== undefined) current.address = payload.address.trim();
    if (payload.active !== undefined) current.active = payload.active;
    const updated = await this.branchRepository.save(current);
    return this.toBranchItem(updated);
  }

  async deleteBranch(id: string) {
    await this.ensureLegacyMigration();
    const current = await this.branchRepository.findOne({ where: { id } });
    if (!current) return { deleted: true };
    current.active = false;
    await this.branchRepository.save(current);
    return { deleted: true };
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

  async searchStudentsForCounterPayment(query: string) {
    return this.adminBillingService.searchStudentsForCounterPayment(query);
  }

  async registerCounterOneTimePayment(payload: RegisterCounterPaymentDto) {
    return this.adminBillingService.registerCounterOneTimePayment(payload);
  }

  async getStats(range?: string) {
    return this.adminBillingService.getStats(range);
  }
}
