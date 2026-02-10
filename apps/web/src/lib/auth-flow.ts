export type PlanId = "monthly" | "quarterly" | "yearly";
export type LoginOrigin = "elegir_plan" | "login_manual";
export type UserRole = "user" | "admin";

type ApiErrorShape = {
  message?: string | string[];
  error?: string;
};

export type SessionUser = {
  email: string;
  role: UserRole;
  origin: LoginOrigin;
  accessToken: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const VALID_PLANS = new Set<PlanId>(["monthly", "quarterly", "yearly"]);

const STORAGE = {
  selectedPlan: "gym.selectedPlan",
  origin: "gym.loginOrigin",
  session: "gym.session",
} as const;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function parseApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorShape;
    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message[0] ?? "Ocurrió un error";
    }

    if (typeof payload.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  } catch {
    return "Ocurrió un error";
  }

  return "Ocurrió un error";
}

async function authRequest<TResponse>(path: string, body: object): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

export async function registerUser(payload: RegisterPayload) {
  return authRequest<{ access_token: string; user: { email: string; role: string } }>("/auth/register", payload);
}

export async function loginWithCredentials(payload: LoginPayload) {
  return authRequest<{ access_token: string; user: { email: string; role: string } }>("/auth/login", payload);
}

export function isPlanId(value: string | null): value is PlanId {
  return value !== null && VALID_PLANS.has(value as PlanId);
}

export function buildCheckoutUrl(planId: PlanId) {
  return `/checkout/mercadopago?plan=${planId}`;
}

export function resolvePlan(planFromQuery: string | null): PlanId | null {
  if (isPlanId(planFromQuery)) return planFromQuery;
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE.selectedPlan);
  return isPlanId(stored) ? stored : null;
}

export function persistPlan(planId: PlanId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE.selectedPlan, planId);
}

export function clearSelectedPlan() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE.selectedPlan);
}

export function persistOrigin(origin: LoginOrigin) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE.origin, origin);
}

export function resolveOrigin(originFromQuery: string | null): LoginOrigin {
  if (originFromQuery === "elegir_plan" || originFromQuery === "login_manual") return originFromQuery;
  if (typeof window === "undefined") return "login_manual";
  const stored = window.localStorage.getItem(STORAGE.origin);
  return stored === "elegir_plan" || stored === "login_manual" ? stored : "login_manual";
}

function normalizeRole(role: string): UserRole {
  return role.toLowerCase() === "admin" ? "admin" : "user";
}

export function loginUser(session: SessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE.session, JSON.stringify(session));
}

export function saveAuthSession(accessToken: string, email: string, role: string, origin: LoginOrigin) {
  loginUser({
    accessToken,
    email,
    role: normalizeRole(role),
    origin,
  });
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE.session);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.email || !parsed.accessToken) return null;
    if (parsed.role !== "user" && parsed.role !== "admin") return null;
    if (parsed.origin !== "elegir_plan" && parsed.origin !== "login_manual") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function verifyUserEmail(_email?: string) {
  return;
}
