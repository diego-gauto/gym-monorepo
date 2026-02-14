import type { IAuthResponse, ILoginRequest, IRegisterRequest } from "@gym-admin/shared";
import { PlanType, UserRole } from "@gym-admin/shared";

export type PlanId = "monthly" | "quarterly" | "yearly";
export type LoginOrigin = "elegir_plan" | "login_manual";

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

export type LoginPayload = ILoginRequest;

export type RegisterPayload = IRegisterRequest;
export type PlanRequestMode = "scheduled_change" | "deferred_activation";

export type BillingContext = {
  isAuthenticated: boolean;
  activeSubscriptionEndDate: string | null;
  paidAccessEndsAt: string | null;
  hasSavedCard: boolean;
};

export type RequestPlanChangePayload = {
  newPlanId: PlanType;
  mode: PlanRequestMode;
  paidAccessEndsAt?: string;
};

export type UpdateBillingCardPayload = {
  mercadopagoCardId: string;
  cardBrand: string;
  cardLastFour: string;
  cardIssuer: string;
  mercadopagoCustomerId?: string;
};

export type CheckoutPayPayload = {
  planId: PlanType;
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  cardholderName: string;
  identificationType: string;
  identificationNumber: string;
  cardBrand?: string;
  cardIssuer?: string;
  acceptedRecurringTerms: boolean;
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

async function authRequestWithToken<TResponse>(path: string, token: string, method: "GET" | "POST", body?: object): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

export async function registerUser(payload: RegisterPayload) {
  return authRequest<IAuthResponse>("/auth/register", payload);
}

export async function loginWithCredentials(payload: LoginPayload) {
  return authRequest<IAuthResponse>("/auth/login", payload);
}

export async function loginWithGoogleIdToken(idToken: string) {
  return authRequest<IAuthResponse>("/auth/google", { idToken });
}

export async function loginWithGoogleCode(code: string, redirectUri: string) {
  return authRequest<IAuthResponse>("/auth/google/code", { code, redirectUri });
}

export function isPlanId(value: string | null): value is PlanId {
  return value !== null && VALID_PLANS.has(value as PlanId);
}

export function buildCheckoutUrl(planId: PlanId) {
  return `/checkout/mercadopago?plan=${planId}`;
}

export function toPlanType(planId: PlanId): PlanType {
  switch (planId) {
    case "monthly":
      return PlanType.MONTHLY;
    case "quarterly":
      return PlanType.QUARTERLY;
    case "yearly":
      return PlanType.YEARLY;
    default:
      return PlanType.MONTHLY;
  }
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
  return role.toUpperCase() === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
}

export function loginUser(session: SessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE.session, JSON.stringify(session));
  window.dispatchEvent(new Event("auth-session-changed"));
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
    const parsed = JSON.parse(raw) as
      | (Partial<SessionUser> & { role?: string; origin?: string; access_token?: string; user?: { email?: string; role?: string } })
      | null;
    if (!parsed) return null;

    const accessToken =
      parsed.accessToken ??
      parsed.access_token;
    const email =
      parsed.email ??
      parsed.user?.email;
    const parsedRole =
      parsed.role ??
      parsed.user?.role;

    if (!accessToken || !email) return null;

    const role = typeof parsedRole === "string" ? normalizeRole(parsedRole) : UserRole.USER;
    const origin = parsed.origin === "elegir_plan" || parsed.origin === "login_manual" ? parsed.origin : resolveOrigin(null);

    return {
      email,
      accessToken,
      role,
      origin,
    };
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE.session);
  window.dispatchEvent(new Event("auth-session-changed"));
}

export function clearAuthFlowState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE.session);
  window.localStorage.removeItem(STORAGE.selectedPlan);
  window.localStorage.removeItem(STORAGE.origin);
  window.dispatchEvent(new Event("auth-session-changed"));
}

export async function fetchBillingContext(accessToken: string) {
  return authRequestWithToken<BillingContext>("/billing/context", accessToken, "GET");
}

export async function requestPlanChange(accessToken: string, payload: RequestPlanChangePayload) {
  return authRequestWithToken<{ message: string; requestId: string; effectiveAt: string; requiresCardSetup: boolean }>(
    "/billing/plan-request",
    accessToken,
    "POST",
    payload,
  );
}

export async function updateBillingCard(accessToken: string, payload: UpdateBillingCardPayload) {
  return authRequestWithToken<{ message: string }>("/billing/card", accessToken, "POST", payload);
}

export async function payCheckout(accessToken: string, payload: CheckoutPayPayload) {
  return authRequestWithToken<{
    message: string;
    invoiceUuid: string;
    subscriptionUuid: string;
    status: string;
    paidAt: string | null;
  }>("/billing/checkout/pay", accessToken, "POST", payload);
}

export function verifyUserEmail(_email?: string) {
  return;
}
