import { CurrencyCode } from "@gym-admin/shared";

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

function isValidHomeContent(payload: unknown): payload is PublicHomeContentResponse {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<PublicHomeContentResponse>;
  return Boolean(candidate.site) && Array.isArray(candidate.activities) && Array.isArray(candidate.benefits) && Array.isArray(candidate.plans);
}

export async function fetchPublicHomeContent(): Promise<PublicHomeContentResponse> {
  const response = await fetch(`${getApiBase()}/content/home`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener contenido público (status ${response.status})`);
  }

  const parsed = (await response.json()) as unknown;
  if (!isValidHomeContent(parsed)) {
    throw new Error("Respuesta inválida de /content/home");
  }

  return parsed;
}

export async function fetchPublicActivities(): Promise<PublicActivityContent[]> {
  const home = await fetchPublicHomeContent();
  return home.activities;
}

export async function fetchPublicActivityBySlug(slug: string): Promise<PublicActivityContent | null> {
  const response = await fetch(`${getApiBase()}/content/activities/${slug}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`No se pudo obtener actividad ${slug} (status ${response.status})`);
  }

  const parsed = (await response.json()) as PublicActivityContent | null;
  if (!parsed) {
    return null;
  }

  return {
    ...parsed,
    trainerIds: parsed.trainerIds ?? [],
    teachers: parsed.teachers ?? [],
  };
}
