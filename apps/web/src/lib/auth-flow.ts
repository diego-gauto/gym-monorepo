export type PlanId = "monthly" | "quarterly" | "yearly";

const VALID_PLANS = new Set<PlanId>(["monthly", "quarterly", "yearly"]);

export function isPlanId(value: string | null): value is PlanId {
  return value !== null && VALID_PLANS.has(value as PlanId);
}

export function buildCheckoutUrl(planId: PlanId) {
  return `/checkout/mercadopago?plan=${planId}`;
}

export function resolvePlan(planFromQuery: string | null): PlanId | null {
  if (isPlanId(planFromQuery)) return planFromQuery;
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem("gym.selectedPlan");
  return isPlanId(stored) ? stored : null;
}

export function buildAuthParams(planId: PlanId, next?: string | null) {
  const params = new URLSearchParams();
  params.set("plan", planId);
  params.set("next", next && next.trim().length > 0 ? next : buildCheckoutUrl(planId));
  return params;
}

export function persistPlan(planId: PlanId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("gym.selectedPlan", planId);
}

type StoredUser = { email: string; password: string };

function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem("gym.users");
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
  window.localStorage.setItem("gym.users", JSON.stringify(users));
}

export function findUserByEmail(email: string) {
  return loadUsers().find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function createUser(email: string, password: string) {
  const users = loadUsers();
  users.push({ email, password });
  saveUsers(users);
}

export function loginUser(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("gym.session", JSON.stringify({ email }));
}
