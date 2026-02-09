"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "../auth/page.module.css";
import {
  createUser,
  findUserByEmail,
  persistOrigin,
  persistPlan,
  resolveOrigin,
  resolvePlan,
} from "../../lib/auth-flow";

type Props = {
  initialPlan: string | null;
  initialOrigin: string | null;
};

export default function RegisterClient({ initialPlan, initialOrigin }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const planId = useMemo(() => resolvePlan(initialPlan), [initialPlan]);
  const origin = useMemo(() => resolveOrigin(initialOrigin), [initialOrigin]);

  const loginHref = useMemo(() => {
    const params = new URLSearchParams({ origin });
    if (planId) params.set("plan", planId);
    return `/login?${params.toString()}`;
  }, [origin, planId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();
    const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      setMessage("Completá todos los campos obligatorios para registrarte.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    if (origin === "elegir_plan" && !planId) {
      setMessage("ERROR DE FLUJO: falta el plan seleccionado.");
      return;
    }

    if (planId) persistPlan(planId);
    persistOrigin(origin);

    if (findUserByEmail(email)) {
      setMessage("Esa cuenta ya existe. Te redirigimos a login para continuar.");
      router.push(loginHref);
      return;
    }

    createUser({ firstName, lastName, email, phone, password });
    setMessage("Te enviamos un email para verificar tu cuenta");
  };

  return (
    <main className={styles.authPage}>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header>
            <h2>Crear cuenta</h2>
            <p>Completá tus datos para continuar.</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="firstName">Nombre</label>
            <input id="firstName" name="firstName" type="text" placeholder="Juan" />

            <label htmlFor="lastName">Apellido</label>
            <input id="lastName" name="lastName" type="text" placeholder="Pérez" />

            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="tu@email.com" />

            <label htmlFor="phone">Teléfono</label>
            <input id="phone" name="phone" type="tel" placeholder="11 5555 1234" />

            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" placeholder="********" />

            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input id="confirmPassword" name="confirmPassword" type="password" placeholder="********" />

            <button type="submit" className={styles.submit}>Crear cuenta</button>
          </form>

          {message && <p>{message}</p>}

          <div className={styles.separator}><span>o</span></div>
          <Link href={loginHref} className={styles.googleButton}>Ya tengo cuenta, ir a login</Link>
        </div>
      </section>
    </main>
  );
}
