import { CurrencyCode } from "@gym-admin/shared";
import { ACTIVITIES, ACTIVITIES_BY_SLUG } from "../data/activities";

export type PublicSiteContent = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBackgroundImage: string;
  gymName: string;
  gymAddress: string;
  gymEmail: string;
  gymPhone: string;
};

export type PublicBenefitContent = {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  active: boolean;
};

export type PublicActivityContent = {
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
  teachers: string[];
  trainerIds: string[];
  active: boolean;
};

export type PublicPlanContent = {
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

export type PublicHomeContentResponse = {
  site: PublicSiteContent;
  benefits: PublicBenefitContent[];
  activities: PublicActivityContent[];
  plans: PublicPlanContent[];
};

function getApiBase() {
  return process.env.INTERNAL_API_BASE_URL || "http://localhost:3001/api";
}

function toFallbackHome(): PublicHomeContentResponse {
  return {
    site: {
      heroBadge: "#1 EN FITNESS PREMIUM",
      heroTitle: "Transformá tu cuerpo. Superá tus límites.",
      heroSubtitle: "Unite al gimnasio más moderno de Argentina.",
      heroBackgroundImage: "/hero-bg.png",
      gymName: "GYM MASTER",
      gymAddress: "Av. del Libertador 1234, CABA",
      gymEmail: "info@gymmaster.com.ar",
      gymPhone: "+54 11 4567-8900",
    },
    benefits: [
      {
        id: "benefit-1",
        title: "Equipamiento Premium",
        description: "Máquinas de última generación y pesas de competencia para un entrenamiento efectivo.",
        iconKey: "DUMBBELL",
        active: true,
      },
      {
        id: "benefit-2",
        title: "Clases Grupales",
        description: "Más de 15 clases semanales: funcional, spinning, yoga, crosstraining y más.",
        iconKey: "GROUP",
        active: true,
      },
      {
        id: "benefit-3",
        title: "Horarios Flexibles",
        description: "Abierto de 6:00 a 23:00 hs. Entrená cuando mejor te convenga.",
        iconKey: "CLOCK",
        active: true,
      },
      {
        id: "benefit-4",
        title: "Entrenadores Certificados",
        description: "Profesionales con años de experiencia para guiarte en cada paso.",
        iconKey: "TROPHY",
        active: true,
      },
      {
        id: "benefit-5",
        title: "Seguimiento Personalizado",
        description: "Evaluaciones físicas y planes adaptados a tus objetivos.",
        iconKey: "HEART",
        active: true,
      },
      {
        id: "benefit-6",
        title: "Resultados Garantizados",
        description: "Metodología probada para que veas cambios reales en tu cuerpo.",
        iconKey: "BOLT",
        active: true,
      },
    ],
    activities: ACTIVITIES.map((activity) => ({
      id: activity.slug,
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
      teachers: activity.teachers,
      trainerIds: [],
      active: true,
    })),
    plans: [
      {
        id: "MONTHLY",
        name: "Mensual",
        description: "Ideal para empezar tu transformación",
        price: 15000,
        currency: CurrencyCode.ARS,
        features: ["Acceso completo al gimnasio", "Uso de equipamiento premium", "Vestuarios con lockers", "WiFi gratis"],
        highlight: false,
        badge: null,
        active: true,
      },
      {
        id: "QUARTERLY",
        name: "Trimestral",
        description: "La mejor relación precio-calidad",
        price: 36000,
        currency: CurrencyCode.ARS,
        features: [
          "Todo lo del plan Mensual",
          "Acceso a clases grupales",
          "Evaluación física inicial",
          "Plan de entrenamiento personalizado",
          "10% descuento en tienda",
        ],
        highlight: true,
        badge: "Más Popular",
        active: true,
      },
      {
        id: "YEARLY",
        name: "Anual",
        description: "Máximo compromiso, máximos beneficios",
        price: 120000,
        currency: CurrencyCode.ARS,
        features: [
          "Todo lo del plan Trimestral",
          "Acceso prioritario a nuevas clases",
          "Seguimiento nutricional básico",
          "2 sesiones de PT incluidas",
          "20% descuento en tienda",
          "Congelamiento de membresía (30 días)",
        ],
        highlight: false,
        badge: null,
        active: true,
      },
    ],
  };
}

export async function fetchPublicHomeContent(): Promise<PublicHomeContentResponse> {
  try {
    const response = await fetch(`${getApiBase()}/content/home`, {
      cache: "no-store",
    });
    if (!response.ok) return toFallbackHome();
    const parsed = (await response.json()) as PublicHomeContentResponse;
    if (!parsed?.site || !Array.isArray(parsed.activities)) return toFallbackHome();
    return parsed;
  } catch {
    return toFallbackHome();
  }
}

export async function fetchPublicActivities(): Promise<PublicActivityContent[]> {
  const home = await fetchPublicHomeContent();
  return home.activities;
}

export async function fetchPublicActivityBySlug(slug: string): Promise<PublicActivityContent | null> {
  try {
    const response = await fetch(`${getApiBase()}/content/activities/${slug}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const parsed = (await response.json()) as PublicActivityContent | null;
      if (parsed) return parsed;
    }
  } catch {
    // fallback below
  }

  const fallback = ACTIVITIES_BY_SLUG[slug];
  if (!fallback) return null;
  return {
    id: fallback.slug,
    slug: fallback.slug,
    name: fallback.name,
    shortDescription: fallback.shortDescription,
    description: fallback.description,
    cardImage: fallback.cardImage,
    level: fallback.level,
    duration: fallback.duration,
    benefits: fallback.benefits,
    schedule: fallback.schedule,
    successCriteria: fallback.successCriteria,
    teachers: fallback.teachers,
    trainerIds: [],
    active: true,
  };
}

