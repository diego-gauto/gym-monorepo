"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "../auth/page.module.css";
import {
  persistOrigin,
  persistPlan,
  registerUser,
  resolveOrigin,
  resolvePlan,
  saveAuthSession,
} from "../../lib/auth-flow";

type Props = {
  initialPlan: string | null;
  initialOrigin: string | null;
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

function validateForm(values: RegisterFormValues) {
  const errors: Partial<Record<keyof RegisterFormValues, string>> = {};

  if (!values.firstName.trim()) errors.firstName = "El nombre es obligatorio";
  else if (values.firstName.trim().length > 50) errors.firstName = "El nombre no puede superar 50 caracteres";

  if (!values.lastName.trim()) errors.lastName = "El apellido es obligatorio";
  else if (values.lastName.trim().length > 50) errors.lastName = "El apellido no puede superar 50 caracteres";

  if (!values.email.trim()) errors.email = "El email es obligatorio";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Ingresá un email válido";

  if (!values.phone.trim()) errors.phone = "El teléfono es obligatorio";
  else if (!ARGENTINA_PHONE_REGEX.test(values.phone)) errors.phone = "Ingresá un teléfono válido de Argentina";

  if (!values.password) errors.password = "La contraseña es obligatoria";
  else if (values.password.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres";
  else if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(values.password)) {
    errors.password = "La contraseña debe incluir al menos una letra y un número";
  }

  if (!values.confirmPassword) errors.confirmPassword = "Confirmá tu contraseña";
  else if (values.confirmPassword !== values.password) errors.confirmPassword = "Las contraseñas no coinciden";

  return errors;
}

export default function RegisterClient({ initialPlan, initialOrigin }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState<RegisterFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormValues, string>>>({});

  const planId = useMemo(() => resolvePlan(initialPlan), [initialPlan]);
  const origin = useMemo(() => resolveOrigin(initialOrigin), [initialOrigin]);

  const loginHref = useMemo(() => {
    const params = new URLSearchParams({ origin });
    if (planId) params.set("plan", planId);
    return `/login?${params.toString()}`;
  }, [origin, planId]);

  const onChange = (field: keyof RegisterFormValues, value: string) => {
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
      const response = await registerUser(values);
      saveAuthSession(response.access_token, response.user.email, response.user.role, origin);
      router.push("/");
    } catch (error) {
      const apiError = error instanceof Error ? error.message : "No pudimos completar el registro.";
      if (apiError.toLowerCase().includes("already exists")) {
        setMessage("Ya tenés una cuenta.");
      } else {
        setMessage(apiError);
      }
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
            <h2>Crear cuenta</h2>
            <p>Completá tus datos para continuar.</p>
          </header>

          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <label htmlFor="firstName">Nombre</label>
            <input id="firstName" type="text" placeholder="Juan" value={values.firstName} onChange={(e) => onChange("firstName", e.target.value)} />
            {errors.firstName && <p className={styles.fieldError}>{errors.firstName}</p>}

            <label htmlFor="lastName">Apellido</label>
            <input id="lastName" type="text" placeholder="Pérez" value={values.lastName} onChange={(e) => onChange("lastName", e.target.value)} />
            {errors.lastName && <p className={styles.fieldError}>{errors.lastName}</p>}

            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="tu@email.com" value={values.email} onChange={(e) => onChange("email", e.target.value)} />
            {errors.email && <p className={styles.fieldError}>{errors.email}</p>}

            <label htmlFor="phone">Teléfono</label>
            <input id="phone" type="tel" placeholder="11 5555 1234" value={values.phone} onChange={(e) => onChange("phone", e.target.value)} />
            {errors.phone && <p className={styles.fieldError}>{errors.phone}</p>}

            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" placeholder="********" value={values.password} onChange={(e) => onChange("password", e.target.value)} />
            {errors.password && <p className={styles.fieldError}>{errors.password}</p>}

            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input id="confirmPassword" type="password" placeholder="********" value={values.confirmPassword} onChange={(e) => onChange("confirmPassword", e.target.value)} />
            {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword}</p>}

            <button type="submit" className={styles.submit} disabled={hasErrors || isSubmitting}>
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          {message && <p className={styles.formMessage}>{message}</p>}
          {message === "Ya tenés una cuenta." && (
            <p>
              <Link href={loginHref} className={styles.inlineLink}>Ya tengo cuenta / Ingresar</Link>
            </p>
          )}

          <div className={styles.separator}><span>o</span></div>
          <Link href={loginHref} className={styles.googleButton}>Ya tengo cuenta / Ingresar</Link>
        </div>
      </section>
    </main>
  );
}
