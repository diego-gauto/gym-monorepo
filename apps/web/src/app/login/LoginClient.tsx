"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "../auth/page.module.css";
import {
  buildAuthParams,
  buildCheckoutUrl,
  findUserByEmail,
  loginUser,
  persistPlan,
  resolvePlan,
} from "../../lib/auth-flow";

type Props = {
  initialPlan: string | null;
  initialNext: string | null;
};

export default function LoginClient({ initialPlan, initialNext }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const planId = useMemo(() => resolvePlan(initialPlan), [initialPlan]);

  const registerHref = useMemo(() => {
    if (!planId) return "/register";
    return `/register?${buildAuthParams(planId, initialNext).toString()}`;
  }, [initialNext, planId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      setMessage("Ingresá tu email para continuar.");
      return;
    }

    if (!planId) {
      setMessage("No encontramos el plan elegido. Volvé a planes y seleccioná uno nuevamente.");
      return;
    }

    persistPlan(planId);

    if (!findUserByEmail(email)) {
      setMessage("No encontramos esa cuenta. Podés crearla desde register.");
      return;
    }

    loginUser(email);
    router.push(initialNext && initialNext.trim().length > 0 ? initialNext : buildCheckoutUrl(planId));
  };

  return (
    <main className={styles.authPage}>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header>
            <h2>Iniciar sesión</h2>
            <p>Entrá para continuar con el plan seleccionado.</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="tu@email.com" />

            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" placeholder="********" />

            <button type="submit" className={styles.submit}>Ingresar y continuar</button>
          </form>

          {message && <p>{message}</p>}

          <div className={styles.separator}><span>o</span></div>
          <Link href={registerHref} className={styles.googleButton}>No tengo cuenta, ir a register</Link>
        </div>
      </section>
    </main>
  );
}
