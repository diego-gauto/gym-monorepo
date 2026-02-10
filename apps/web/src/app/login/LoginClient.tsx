"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
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

function validateForm(values: LoginFormValues) {
  const errors: Partial<Record<keyof LoginFormValues, string>> = {};

  if (!values.email.trim()) errors.email = "El email es obligatorio";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Ingresá un email válido";

  if (!values.password) errors.password = "La contraseña es obligatoria";

  return errors;
}

export default function LoginClient({ initialPlan, initialOrigin }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});

  const planId = useMemo(() => resolvePlan(initialPlan), [initialPlan]);
  const origin = useMemo(() => resolveOrigin(initialOrigin), [initialOrigin]);

  const registerHref = useMemo(() => {
    const params = new URLSearchParams({ origin });
    if (planId) params.set("plan", planId);
    return `/register?${params.toString()}`;
  }, [origin, planId]);

  const onChange = (field: keyof LoginFormValues, value: string) => {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    setErrors(validateForm(nextValues));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const nextErrors = validateForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (planId) persistPlan(planId);
    persistOrigin(origin);

    setIsSubmitting(true);
    try {
      const response = await loginWithCredentials(values);
      saveAuthSession(response.access_token, response.user.email, response.user.role, origin);
      router.push("/");
    } catch {
      setMessage("Credenciales incorrectas. Revisá tu email y contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className={styles.authPage}>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header>
            <h2>Iniciar sesión</h2>
            <p>Entrá para continuar.</p>
          </header>

          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="tu@email.com" value={values.email} onChange={(e) => onChange("email", e.target.value)} />
            {errors.email && <p className={styles.fieldError}>{errors.email}</p>}

            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" placeholder="********" value={values.password} onChange={(e) => onChange("password", e.target.value)} />
            {errors.password && <p className={styles.fieldError}>{errors.password}</p>}

            <button type="submit" className={styles.submit} disabled={hasErrors || isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {message && <p className={styles.formMessage}>{message}</p>}

          <div className={styles.separator}><span>o</span></div>
          <Link href={registerHref} className={styles.googleButton}>No tengo cuenta / Registrarme</Link>
        </div>
      </section>
    </main>
  );
}
