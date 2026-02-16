import type { IAuthResponse, ILoginRequest, IRegisterRequest } from "@gym-admin/shared";
import {
  AuthProvider,
  CurrencyCode,
  InvoiceStatus,
  MembershipStatus,
  PaymentMethod,
  PlanType,
  SubscriptionChangeRequestStatus,
  UserRole,
} from "@gym-admin/shared";

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

export type CheckInActivity = {
  slug: string;
  name: string;
};

export type CheckInEligibility = {
  canCheckIn: boolean;
  reason: string | null;
  user: {
    uuid: string;
    name: string;
  };
  membership: {
    ok: boolean;
    source: "SUBSCRIPTION" | "ONE_TIME_PERIOD" | "NONE";
    inGrace: boolean;
    graceEndsAt: string | null;
  };
  medicalCertificate: {
    ok: boolean;
    validUntil: string | null;
  };
};

export type SubmitCheckInPayload = {
  activitySlug: string;
  gymLocation?: string;
  qrToken: string;
  latitude?: number;
  longitude?: number;
  deviceId?: string;
};

export type SubmitCheckInResponse = {
  message: string;
  checkIn: {
    uuid: string;
    checkInAt: string;
    activitySlug?: string;
    gymLocation?: string;
  };
};

export type UserProfileResponse = {
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: MembershipStatus;
  authProvider: AuthProvider;
  emailVerifiedAt: string | null;
  createdAt: string;
  billingCard: {
    cardBrand: string | null;
    cardLastFour: string | null;
    cardIssuer: string | null;
    cardholderName: string | null;
    cardExpirationMonth: number | null;
    cardExpirationYear: number | null;
  } | null;
};

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type AttendanceRange = "week" | "month" | "quarter" | "year";

export type AttendanceHistoryResponse = {
  range: AttendanceRange;
  from: string;
  total: number;
  items: Array<{
    uuid: string;
    checkInAt: string;
    activitySlug: string | null;
    activityName: string;
    gymLocation: string | null;
    deviceId: string | null;
  }>;
};

export type PaymentHistoryResponse = {
  total: number;
  items: Array<{
    uuid: string;
    amount: number;
    currency: CurrencyCode;
    status: InvoiceStatus;
    paymentMethod: PaymentMethod;
    paidAt: string | null;
    createdAt: string;
    appliedTo: string;
    subscriptionId: number | null;
  }>;
};

export type SubscriptionOverviewResponse = {
  currentSubscription: {
    uuid: string;
    planId: PlanType;
    status: MembershipStatus;
    autoRenew: boolean;
    startDate: string;
    endDate: string;
    billingCycleAnchorDay: number;
  } | null;
  pendingChange: {
    uuid: string;
    newPlanId: PlanType | null;
    status: SubscriptionChangeRequestStatus;
    effectiveAt: string;
    createdAt: string;
  } | null;
  plans: Array<{
    id: PlanType;
    name: string;
    price: number;
    currency: CurrencyCode;
  }>;
};

export type AdminCheckInQrResponse = {
  gymLocation: string;
  token?: string;
  checkInUrl: string;
  qrImageUrl: string;
  generatedAt: string;
};

export type AdminRange = "week" | "month" | "quarter" | "year";

export type AdminStatsResponse = {
  range: AdminRange | string;
  from: string;
  totals: {
    users: number;
    newUsers: number;
    activeUsers: number;
    activeSubscriptions: number;
    oneTimePaidUsers: number;
    stoppedPaying: number;
    cancelled: number;
  };
  subscriptionsByPlan: Record<string, number>;
  oneTimeByAmount: Record<string, number>;
};

export type AdminSiteSettings = {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBackgroundImage: string;
  gymName: string;
  gymAddress: string;
  gymEmail: string;
  gymPhone: string;
};

export type AdminTrainer = {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  active: boolean;
};

export type AdminActivity = {
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

export type AdminBenefit = {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  active: boolean;
};

export type AdminPlan = {
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

const VALID_PLANS = new Set<PlanId>(["monthly", "quarterly", "yearly"]);

const STORAGE = {
  selectedPlan: "gym.selectedPlan",
  origin: "gym.loginOrigin",
  session: "gym.session",
} as const;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
}

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

async function authRequestWithToken<TResponse>(path: string, token: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: object): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
      throw new Error("Tu sesión expiró. Ingresá nuevamente.");
    }
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
    if (isJwtExpired(accessToken)) {
      window.localStorage.removeItem(STORAGE.session);
      window.dispatchEvent(new Event("auth-session-changed"));
      return null;
    }

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

export async function fetchCheckInEligibility(accessToken: string, gymLocation: string, qrToken: string) {
  const query = new URLSearchParams({ gym: gymLocation, token: qrToken });
  return authRequestWithToken<CheckInEligibility>(`/access/check-in/eligibility?${query.toString()}`, accessToken, "GET");
}

export async function fetchCheckInActivities(accessToken: string, gymLocation: string, qrToken: string) {
  const query = new URLSearchParams({ gym: gymLocation, token: qrToken });
  return authRequestWithToken<{ activities: CheckInActivity[] }>(`/access/check-in/activities?${query.toString()}`, accessToken, "GET");
}

export async function submitCheckIn(accessToken: string, payload: SubmitCheckInPayload) {
  return authRequestWithToken<SubmitCheckInResponse>("/access/check-in", accessToken, "POST", payload);
}

export async function fetchAdminCheckInQr(accessToken: string, gymLocation: string, baseUrl?: string) {
  const query = new URLSearchParams({ gym: gymLocation });
  if (baseUrl) query.set('baseUrl', baseUrl);
  return authRequestWithToken<AdminCheckInQrResponse>(`/access/check-in/admin/qr?${query.toString()}`, accessToken, "GET");
}

export async function fetchAdminStats(accessToken: string, range: AdminRange) {
  const query = new URLSearchParams({ range });
  return authRequestWithToken<AdminStatsResponse>(`/admin/stats?${query.toString()}`, accessToken, "GET");
}

export async function fetchAdminSiteSettings(accessToken: string) {
  return authRequestWithToken<AdminSiteSettings>("/admin/content/site", accessToken, "GET");
}

export async function updateAdminSiteSettings(accessToken: string, payload: AdminSiteSettings) {
  return authRequestWithToken<AdminSiteSettings>("/admin/content/site", accessToken, "PATCH", payload);
}

export async function fetchAdminTrainers(accessToken: string) {
  return authRequestWithToken<AdminTrainer[]>("/admin/content/trainers", accessToken, "GET");
}

export async function createAdminTrainer(accessToken: string, payload: Omit<AdminTrainer, "id">) {
  return authRequestWithToken<AdminTrainer>("/admin/content/trainers", accessToken, "POST", payload);
}

export async function updateAdminTrainer(accessToken: string, id: string, payload: Partial<Omit<AdminTrainer, "id">>) {
  return authRequestWithToken<AdminTrainer>(`/admin/content/trainers/${id}`, accessToken, "PATCH", payload);
}

export async function deleteAdminTrainer(accessToken: string, id: string) {
  return authRequestWithToken<{ deleted: boolean }>(`/admin/content/trainers/${id}`, accessToken, "DELETE");
}

export async function fetchAdminActivities(accessToken: string) {
  return authRequestWithToken<AdminActivity[]>("/admin/content/activities", accessToken, "GET");
}

export async function createAdminActivity(accessToken: string, payload: Omit<AdminActivity, "id">) {
  return authRequestWithToken<AdminActivity>("/admin/content/activities", accessToken, "POST", payload);
}

export async function updateAdminActivity(accessToken: string, id: string, payload: Partial<Omit<AdminActivity, "id">>) {
  return authRequestWithToken<AdminActivity>(`/admin/content/activities/${id}`, accessToken, "PATCH", payload);
}

export async function deleteAdminActivity(accessToken: string, id: string) {
  return authRequestWithToken<{ deleted: boolean }>(`/admin/content/activities/${id}`, accessToken, "DELETE");
}

export async function fetchAdminBenefits(accessToken: string) {
  return authRequestWithToken<AdminBenefit[]>("/admin/content/benefits", accessToken, "GET");
}

export async function createAdminBenefit(accessToken: string, payload: Omit<AdminBenefit, "id">) {
  return authRequestWithToken<AdminBenefit>("/admin/content/benefits", accessToken, "POST", payload);
}

export async function updateAdminBenefit(accessToken: string, id: string, payload: Partial<Omit<AdminBenefit, "id">>) {
  return authRequestWithToken<AdminBenefit>(`/admin/content/benefits/${id}`, accessToken, "PATCH", payload);
}

export async function deleteAdminBenefit(accessToken: string, id: string) {
  return authRequestWithToken<{ deleted: boolean }>(`/admin/content/benefits/${id}`, accessToken, "DELETE");
}

export async function fetchAdminPlans(accessToken: string) {
  return authRequestWithToken<AdminPlan[]>("/admin/content/plans", accessToken, "GET");
}

export async function upsertAdminPlan(accessToken: string, payload: AdminPlan) {
  return authRequestWithToken<AdminPlan>("/admin/content/plans", accessToken, "POST", payload);
}

export async function deleteAdminPlan(accessToken: string, id: string) {
  return authRequestWithToken<{ deleted: boolean }>(`/admin/content/plans/${id}`, accessToken, "DELETE");
}

export async function fetchMyProfile(accessToken: string) {
  return authRequestWithToken<UserProfileResponse>("/users/me", accessToken, "GET");
}

export async function updateMyProfile(accessToken: string, payload: UpdateProfilePayload) {
  return authRequestWithToken<{ message: string; user: { firstName: string; lastName: string; phone: string | null; avatarUrl: string | null } }>(
    "/users/me",
    accessToken,
    "PATCH",
    payload,
  );
}

export async function changeMyPassword(accessToken: string, payload: ChangePasswordPayload) {
  return authRequestWithToken<{ message: string }>("/users/me/password", accessToken, "POST", payload);
}

export async function fetchMyAttendance(accessToken: string, range: AttendanceRange) {
  const query = new URLSearchParams({ range });
  return authRequestWithToken<AttendanceHistoryResponse>(`/users/me/attendance?${query.toString()}`, accessToken, "GET");
}

export async function fetchMyPayments(accessToken: string) {
  return authRequestWithToken<PaymentHistoryResponse>("/users/me/payments", accessToken, "GET");
}

export async function fetchMySubscriptionOverview(accessToken: string) {
  return authRequestWithToken<SubscriptionOverviewResponse>("/users/me/subscription", accessToken, "GET");
}

export async function cancelMySubscription(accessToken: string) {
  return authRequestWithToken<{ message: string }>("/billing/cancel", accessToken, "POST");
}

export function verifyUserEmail(_email?: string) {
  return;
}
