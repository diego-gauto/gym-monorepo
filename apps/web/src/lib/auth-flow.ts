import { IRegisterRequest } from "@gym-admin/shared";

export type PlanId = "monthly" | "quarterly" | "yearly";
export type LoginOrigin = "elegir_plan" | "login_manual";
export type UserRole = "user" | "admin";

type RegisterUserBase = Omit<IRegisterRequest, "confirmPassword">;

export type StoredUser = RegisterUserBase & {
  emailVerified: boolean;
  role: UserRole;
  hasSubscription: boolean;
  hasPaidPeriod: boolean;
};

export type SessionUser = {
  email: string;
  role: UserRole;
  origin: LoginOrigin;
};

const VALID_PLANS = new Set<PlanId>(["monthly", "quarterly", "yearly"]);

const STORAGE = {
  selectedPlan: "gym.selectedPlan",
  origin: "gym.loginOrigin",
  users: "gym.users",
  session: "gym.session",
} as const;

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

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE.users);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE.users, JSON.stringify(users));
}

export function findUserByEmail(email: string) {
  return loadUsers().find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function createUser(user: RegisterUserBase) {
  const users = loadUsers();
  users.push({
    ...user,
    emailVerified: false,
    role: "user",
    hasSubscription: false,
    hasPaidPeriod: false,
  });
  saveUsers(users);
}

export function verifyUserEmail(email: string) {
  const users = loadUsers();
  const nextUsers = users.map((u) =>
    u.email.toLowerCase() === email.toLowerCase()
      ? { ...u, emailVerified: true }
      : u,
  );
  saveUsers(nextUsers);
}

export function loginUser(session: SessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE.session, JSON.stringify(session));
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE.session);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.email) return null;
    if (parsed.role !== "user" && parsed.role !== "admin") return null;
    if (parsed.origin !== "elegir_plan" && parsed.origin !== "login_manual") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getLoggedInUser(): StoredUser | null {
  const session = getSession();
  if (!session) return null;
  return findUserByEmail(session.email);
}
