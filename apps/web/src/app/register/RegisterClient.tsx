"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "../auth/page.module.css";
import {
  buildAuthParams,
  buildCheckoutUrl,
  createUser,
  findUserByEmail,
  loginUser,
  persistPlan,
  resolvePlan,
} from "../../lib/auth-flow";

type Props = {
  initialPlan: string | null;
  initialNext: string | null;
};

export default function RegisterClient({ initialPlan, initialNext }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const planId = useMemo(() => resolvePlan(initialPlan), [initialPlan]);

  const loginHref = useMemo(() => {
    if (!planId) return "/login";
    return `/login?${buildAuthParams(planId, initialNext).toString()}`;
  }, [initialNext, planId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!email || !password) {
      setMessage("Completá email y contraseña para continuar.");
      return;
    }

    if (!planId) {
      setMessage("No encontramos el plan elegido. Volvé a planes y seleccioná uno nuevamente.");
      return;
    }

    persistPlan(planId);

    if (findUserByEmail(email)) {
      setMessage("Esa cuenta ya existe. Te redirigimos a login para continuar.");
      router.push(`/login?${buildAuthParams(planId, initialNext).toString()}`);
      return;
    }

    createUser(email, password);
    loginUser(email);

    router.push(initialNext && initialNext.trim().length > 0 ? initialNext : buildCheckoutUrl(planId));
  };

  return (
    <main className={styles.authPage}>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header>
            <h2>Crear cuenta</h2>
            <p>Registrate para continuar con tu suscripción.</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="tu@email.com" />

            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" placeholder="********" />

            <button type="submit" className={styles.submit}>Crear cuenta y continuar</button>
          </form>

          {message && <p>{message}</p>}

          <div className={styles.separator}><span>o</span></div>
          <Link href={loginHref} className={styles.googleButton}>Ya tengo cuenta, ir a login</Link>
        </div>
      </section>
    </main>
  );
}
