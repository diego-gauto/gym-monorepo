"use client";

import type { LoginOrigin, PlanId } from "./auth-flow";

const GOOGLE_OAUTH_STATE_KEY = "gym.googleOAuthState";
const GOOGLE_OAUTH_CONTEXT_KEY = "gym.googleOAuthContext";

type GoogleOAuthContext = {
  origin: LoginOrigin;
  planId: PlanId | null;
};

function randomState(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function startGoogleOAuth(clientId: string, context: GoogleOAuthContext) {
  if (!clientId) {
    throw new Error("Google no está configurado en esta aplicación.");
  }

  if (typeof window === "undefined") {
    throw new Error("Google OAuth solo está disponible en navegador.");
  }

  const state = randomState();
  window.localStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
  window.localStorage.setItem(GOOGLE_OAUTH_CONTEXT_KEY, JSON.stringify(context));

  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function consumeGoogleOAuthState(): string | null {
  if (typeof window === "undefined") return null;
  const state = window.localStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
  window.localStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
  return state;
}

export function getGoogleCallbackRedirectTarget() {
  if (typeof window === "undefined") return { origin: "login_manual" as const, planId: null };
  const raw = window.localStorage.getItem(GOOGLE_OAUTH_CONTEXT_KEY);
  window.localStorage.removeItem(GOOGLE_OAUTH_CONTEXT_KEY);

  if (!raw) return { origin: "login_manual" as const, planId: null };

  try {
    const parsed = JSON.parse(raw) as Partial<GoogleOAuthContext>;
    const origin = parsed.origin === "elegir_plan" || parsed.origin === "login_manual" ? parsed.origin : "login_manual";
    const planId = parsed.planId === "monthly" || parsed.planId === "quarterly" || parsed.planId === "yearly" ? parsed.planId : null;
    return { origin, planId };
  } catch {
    return { origin: "login_manual" as const, planId: null };
  }
}
