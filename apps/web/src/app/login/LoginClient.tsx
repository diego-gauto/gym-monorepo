"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "../auth/page.module.css";
import GoogleMark from "../../components/GoogleMark";
import {
  buildCheckoutUrl,
  loginWithCredentials,
  persistOrigin,
  persistPlan,
  resolveOrigin,
  resolvePlan,
  saveAuthSession,
} from "../../lib/auth-flow";
import { startGoogleOAuth } from "../../lib/google-oauth";

type Props = {
  initialPlan: string | null;
  initialOrigin: string | null;
  initialNext?: string | null;
};

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginClient({ initialPlan, initialOrigin, initialNext = null }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoginFormValues>({
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const planId = useMemo(() => resolvePlan(initialPlan), [initialPlan]);
  const origin = useMemo(() => resolveOrigin(initialOrigin), [initialOrigin]);
  const nextPath = useMemo(() => {
    if (!initialNext) return null;
    if (!initialNext.startsWith('/')) return null;
    if (initialNext.startsWith('//')) return null;
    return initialNext;
  }, [initialNext]);

  const registerHref = useMemo(() => {
    const params = new URLSearchParams({ origin });
    if (planId) params.set("plan", planId);
    if (nextPath) params.set("next", nextPath);
    return `/register?${params.toString()}`;
  }, [origin, planId, nextPath]);

  const onSubmit = async (values: LoginFormValues) => {
    setMessage(null);

    if (planId) persistPlan(planId);
    persistOrigin(origin);

    try {
      const response = await loginWithCredentials(values);
      saveAuthSession(response.access_token, response.user.email, response.user.role, origin);
      if (nextPath) {
        router.push(nextPath);
      } else if (origin === "elegir_plan" && planId) {
        router.push(buildCheckoutUrl(planId));
      } else {
        router.push("/");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Credenciales incorrectas. Revisá tu email y contraseña.";
      setMessage(text);
    }
  };

  const onGoogleSubmit = async () => {
    setMessage(null);

    setIsGoogleSubmitting(true);
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
      const oauthContext = nextPath ? { origin, planId, nextPath } : { origin, planId };
      startGoogleOAuth(clientId, oauthContext);
    } catch (error) {
      const text = error instanceof Error ? error.message : "No se pudo iniciar sesión con Google.";
      setMessage(text);
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className={styles.authPage}>
      <section className={styles.visualPanel}>
        <div className={styles.overlay} />
        <div className={styles.visualContent}>
          <p className={styles.kicker}>Comunidad GymPro</p>
          <h1>Entrená mejor con tu plan y progreso centralizados.</h1>
          <p>Iniciá sesión para continuar con tu inscripción o gestionar tu membresía.</p>
        </div>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header>
            <p className={styles.sectionTag}>Acceso seguro</p>
            <h2>Iniciar sesión</h2>
          </header>

          <p className={styles.microCopy}>
            ¿No tenés cuenta?{" "}
            <Link href={registerHref} className={styles.microLink}>
              Registrate
            </Link>
          </p>

          <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              {...register("email", {
                required: "El email es obligatorio",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Ingresá un email válido" },
              })}
            />
            {errors.email && <p className={styles.fieldError}>{errors.email.message}</p>}

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="********"
              autoComplete="current-password"
              {...register("password", {
                required: "La contraseña es obligatoria",
              })}
            />
            {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}

            <div className={styles.passwordAssist}>
              <Link href="/recover-password" className={styles.hintLink}>¿Olvidaste tu contraseña?</Link>
            </div>
            <button type="submit" className={`${styles.submit} ${styles.submitFull}`} disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {message && <p className={styles.formMessage}>{message}</p>}

          <div className={styles.separator}><span>o</span></div>
          <button type="button" className={styles.googleButton} onClick={onGoogleSubmit} disabled={isGoogleSubmitting}>
            {isGoogleSubmitting ? (
              "Conectando con Google..."
            ) : (
              <span className={styles.googleButtonContent}>
                <GoogleMark className={styles.googleMark} />
                <span>Continuar con Google</span>
              </span>
            )}
          </button>
        </div>
      </section>
    </main>
  );
}
