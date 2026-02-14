"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildCheckoutUrl, loginWithGoogleCode, saveAuthSession } from "../../../../lib/auth-flow";
import { consumeGoogleOAuthState, getGoogleCallbackRedirectTarget } from "../../../../lib/google-oauth";

export default function GoogleCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Procesando login con Google...");
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    let cancelled = false;

    (async () => {
      const googleError = params.get("error");
      if (googleError) {
        setMessage("Google canceló o rechazó la autorización.");
        router.replace("/login?origin=login_manual");
        return;
      }

      const code = params.get("code");
      const state = params.get("state");
      const expectedState = consumeGoogleOAuthState();

      if (!code || !state || !expectedState || state !== expectedState) {
        setMessage("No se pudo validar la sesión de Google.");
        router.replace("/login?origin=login_manual");
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const response = await loginWithGoogleCode(code, redirectUri);
        const { origin, planId } = getGoogleCallbackRedirectTarget();

        saveAuthSession(response.access_token, response.user.email, response.user.role, origin);

        if (!cancelled) {
          if (origin === "elegir_plan" && planId) {
            router.replace(buildCheckoutUrl(planId));
          } else {
            router.replace("/");
          }
        }
      } catch (error) {
        if (!cancelled) {
          const text = error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.";
          setMessage(text);
          const { origin, planId } = getGoogleCallbackRedirectTarget();
          if (text.toLowerCase().includes("registrate primero")) {
            const params = new URLSearchParams({ origin, googleNotRegistered: "1" });
            if (planId) params.set("plan", planId);
            router.replace(`/register?${params.toString()}`);
            return;
          }
          router.replace("/login?origin=login_manual");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main style={{ padding: "2rem", minHeight: "50vh", display: "grid", placeItems: "center" }}>
      <p>{message}</p>
    </main>
  );
}
