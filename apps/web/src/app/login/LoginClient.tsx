"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "../auth/page.module.css";
import {
  loginWithCredentials,
  persistOrigin,
  persistPlan,
  resolveOrigin,
  resolvePlan,
  saveAuthSession,
} from "../../lib/auth-flow";

type Props = {
  initialPlan: string | null;
  initialOrigin: string | null;
};

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginClient({ initialPlan, initialOrigin }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const planId = useMemo(() => resolvePlan(initialPlan), [initialPlan]);
  const origin = useMemo(() => resolveOrigin(initialOrigin), [initialOrigin]);

  const registerHref = useMemo(() => {
    const params = new URLSearchParams({ origin });
    if (planId) params.set("plan", planId);
    return `/register?${params.toString()}`;
  }, [origin, planId]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormValues>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setMessage(null);

    if (planId) persistPlan(planId);
    persistOrigin(origin);

    try {
      const response = await loginWithCredentials(values);
      saveAuthSession(response.access_token, response.user.email, response.user.role, origin);
      router.push("/");
    } catch {
      setMessage("Credenciales incorrectas. Revisá tu email y contraseña.");
    }
  };

  return (
    <main className={styles.authPage}>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header>
            <h2>Iniciar sesión</h2>
            <p>Entrá para continuar.</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              {...register("email", {
                required: "El email es obligatorio",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Ingresá un email válido",
                },
              })}
            />
            {errors.email && <p className={styles.fieldError}>{errors.email.message}</p>}

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="********"
              {...register("password", {
                required: "La contraseña es obligatoria",
              })}
            />
            {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}

            <button type="submit" className={styles.submit} disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {message && <p className={styles.formMessage}>{message}</p>}

          <div className={styles.separator}>
            <span>o</span>
          </div>
          <Link href={registerHref} className={styles.googleButton}>
            No tengo cuenta / Registrarme
          </Link>
        </div>
      </section>
    </main>
  );
}
