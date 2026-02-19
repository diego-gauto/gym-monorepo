"use client";

import React from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "../auth/page.module.css";
import GoogleMark from "../../components/GoogleMark";
import {
  persistOrigin,
  persistPlan,
  registerUser,
  resendVerificationEmail,
  resolveOrigin,
  resolvePlan,
} from "../../lib/auth-flow";
import { startGoogleOAuth } from "../../lib/google-oauth";

type Props = {
  initialPlan: string | null;
  initialOrigin: string | null;
  initialNext?: string | null;
  initialGoogleNotRegistered?: boolean;
};

type RegisterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const ARGENTINA_PHONE_REGEX = /^(?:\+54\s?)?(?:9\s?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}$/;

export default function RegisterClient({
  initialPlan,
  initialOrigin,
  initialNext = null,
  initialGoogleNotRegistered = false,
}: Props) {
  const [message, setMessage] = useState<string | null>(
    initialGoogleNotRegistered ? "Tu cuenta de Google todavía no está registrada. Completá el alta primero." : null,
  );
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<RegisterFormValues>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const planId = useMemo(() => resolvePlan(initialPlan), [initialPlan]);
  const origin = useMemo(() => resolveOrigin(initialOrigin), [initialOrigin]);
  const nextPath = useMemo(() => {
    if (!initialNext) return null;
    if (!initialNext.startsWith('/')) return null;
    if (initialNext.startsWith('//')) return null;
    return initialNext;
  }, [initialNext]);
  const passwordValue = watch("password");

  const loginHref = useMemo(() => {
    const params = new URLSearchParams({ origin });
    if (planId) params.set("plan", planId);
    if (nextPath) params.set("next", nextPath);
    return `/login?${params.toString()}`;
  }, [origin, planId, nextPath]);

  const onSubmit = async (values: RegisterFormValues) => {
    setMessage(null);

    if (planId) persistPlan(planId);
    persistOrigin(origin);

    let response;
    try {
      response = await registerUser(values);
    } catch (error) {
      const apiError = error instanceof Error ? error.message : "No pudimos completar el registro.";
      const normalized = apiError.toLowerCase();
      if (normalized.includes("already exists") || normalized.includes("ya tenés una cuenta")) {
        setMessage("Ya tenés una cuenta");
      } else {
        setMessage(apiError);
      }
      return;
    }

    setRegisteredEmail(values.email);
    setMessage(response.message ?? "Te enviamos un email para activar tu cuenta.");
    setResendMessage(null);
  };

  const onResendVerification = async () => {
    if (!registeredEmail || isResending) return;
    setResendMessage(null);
    setIsResending(true);
    try {
      const response = await resendVerificationEmail(registeredEmail);
      setResendMessage(response.message);
    } catch (error) {
      const text = error instanceof Error ? error.message : "No se pudo reenviar el email.";
      setResendMessage(text);
    } finally {
      setIsResending(false);
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
      const text = error instanceof Error ? error.message : "No se pudo continuar con Google.";
      setMessage(text);
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className={styles.authPage}>
      <section className={styles.visualPanel}>
        <div className={styles.overlay} />
        <div className={styles.visualContent}>
          <p className={styles.kicker}>Nueva inscripción</p>
          <h1>Comenzá hoy tu camino en el gimnasio.</h1>
          <p>Creá tu cuenta para activar tu acceso y continuar con el plan que elijas.</p>
        </div>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header>
            <p className={styles.sectionTag}>Alta presencial y online</p>
            <h2>Crear cuenta</h2>
          </header>
          <p className={styles.microCopy}>
            ¿Ya tenés cuenta?{" "}
            <Link href={loginHref} className={styles.microLink}>
              Inicia sesión
            </Link>
          </p>

          <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.formCols}>
              <div className={styles.fieldGroup}>
                <label htmlFor="firstName">Nombre</label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  autoComplete="given-name"
                  {...register("firstName", {
                    required: "El nombre es obligatorio",
                    maxLength: { value: 50, message: "El nombre no puede superar 50 caracteres" },
                    validate: (value) => value.trim().length > 0 || "El nombre es obligatorio",
                  })}
                />
                {errors.firstName && <p className={styles.fieldError}>{errors.firstName.message}</p>}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="lastName">Apellido</label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Pérez"
                  autoComplete="family-name"
                  {...register("lastName", {
                    required: "El apellido es obligatorio",
                    maxLength: { value: 50, message: "El apellido no puede superar 50 caracteres" },
                    validate: (value) => value.trim().length > 0 || "El apellido es obligatorio",
                  })}
                />
                {errors.lastName && <p className={styles.fieldError}>{errors.lastName.message}</p>}
              </div>
            </div>

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

            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              type="tel"
              placeholder="11 5555 1234"
              autoComplete="tel-national"
              {...register("phone", {
                required: "El teléfono es obligatorio",
                pattern: { value: ARGENTINA_PHONE_REGEX, message: "Ingresá un teléfono válido de Argentina" },
              })}
            />
            {errors.phone && <p className={styles.fieldError}>{errors.phone.message}</p>}

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="********"
              autoComplete="new-password"
              {...register("password", {
                required: "La contraseña es obligatoria",
                minLength: { value: 8, message: "La contraseña debe tener al menos 8 caracteres" },
                pattern: {
                  value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                  message: "La contraseña debe incluir al menos una letra y un número",
                },
              })}
            />
            {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}

            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="********"
              autoComplete="new-password"
              {...register("confirmPassword", {
                required: "Confirmá tu contraseña",
                validate: (value) => value === passwordValue || "Las contraseñas no coinciden",
              })}
            />
            {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword.message}</p>}

            <button type="submit" className={`${styles.submit} ${styles.submitFull}`} disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          {message && <p className={styles.formMessage}>{message}</p>}
          {registeredEmail && (
            <div className={styles.inlineActions}>
              <button type="button" className={styles.secondaryButton} onClick={onResendVerification} disabled={isResending}>
                {isResending ? "Reenviando..." : "Reenviar email de verificación"}
              </button>
            </div>
          )}
          {resendMessage && <p className={styles.formMessage}>{resendMessage}</p>}
          {message === "Ya tenés una cuenta" && (
            <p>
              <Link href={loginHref} className={styles.inlineLink}>Ya tengo cuenta / Ingresar</Link>
            </p>
          )}

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
