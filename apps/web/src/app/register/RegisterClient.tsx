"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "../auth/page.module.css";
import {
  buildCheckoutUrl,
  persistOrigin,
  persistPlan,
  registerUser,
  resolveOrigin,
  resolvePlan,
  saveAuthSession,
} from "../../lib/auth-flow";
import { startGoogleOAuth } from "../../lib/google-oauth";

type Props = {
  initialPlan: string | null;
  initialOrigin: string | null;
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

export default function RegisterClient({ initialPlan, initialOrigin, initialGoogleNotRegistered = false }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(
    initialGoogleNotRegistered ? "Tu cuenta de Google todavía no está registrada. Completá el alta primero." : null,
  );
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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
  const passwordValue = watch("password");

  const loginHref = useMemo(() => {
    const params = new URLSearchParams({ origin });
    if (planId) params.set("plan", planId);
    return `/login?${params.toString()}`;
  }, [origin, planId]);

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

    try {
      saveAuthSession(response.access_token, response.user.email, response.user.role, origin);
    } catch {
      // If local session persistence fails, continue with navigation after successful register.
    }

    if (origin === "elegir_plan" && planId) {
      router.push(buildCheckoutUrl(planId));
    } else {
      router.push("/");
    }
  };

  const onGoogleSubmit = async () => {
    setMessage(null);

    setIsGoogleSubmitting(true);
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
      startGoogleOAuth(clientId, { origin, planId });
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
            <h2>Crear cuenta</h2>
            <p>Completá tus datos para continuar.</p>
            <p style={{ marginTop: "0.6rem" }}>
              <Link href={loginHref} className={styles.inlineLink}>Ya tengo cuenta / Ingresar</Link>
            </p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <label htmlFor="firstName">Nombre</label>
            <input
              id="firstName"
              type="text"
              placeholder="Juan"
              {...register("firstName", {
                required: "El nombre es obligatorio",
                maxLength: { value: 50, message: "El nombre no puede superar 50 caracteres" },
                validate: (value) => value.trim().length > 0 || "El nombre es obligatorio",
              })}
            />
            {errors.firstName && <p className={styles.fieldError}>{errors.firstName.message}</p>}

            <label htmlFor="lastName">Apellido</label>
            <input
              id="lastName"
              type="text"
              placeholder="Pérez"
              {...register("lastName", {
                required: "El apellido es obligatorio",
                maxLength: { value: 50, message: "El apellido no puede superar 50 caracteres" },
                validate: (value) => value.trim().length > 0 || "El apellido es obligatorio",
              })}
            />
            {errors.lastName && <p className={styles.fieldError}>{errors.lastName.message}</p>}

            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
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
              {...register("confirmPassword", {
                required: "Confirmá tu contraseña",
                validate: (value) => value === passwordValue || "Las contraseñas no coinciden",
              })}
            />
            {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword.message}</p>}

            <button type="submit" className={styles.submit} disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          {message && <p className={styles.formMessage}>{message}</p>}
          {message === "Ya tenés una cuenta" && (
            <p>
              <Link href={loginHref} className={styles.inlineLink}>Ya tengo cuenta / Ingresar</Link>
            </p>
          )}

          <div className={styles.separator}><span>o</span></div>
          <button type="button" className={styles.googleButton} onClick={onGoogleSubmit} disabled={isGoogleSubmitting}>
            {isGoogleSubmitting ? "Conectando con Google..." : "Continuar con Google"}
          </button>
        </div>
      </section>
    </main>
  );
}
