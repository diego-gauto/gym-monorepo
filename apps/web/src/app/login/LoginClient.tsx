"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import styles from "../auth/page.module.css";
import {
  buildCheckoutUrl,
  findUserByEmail,
  loginUser,
  persistOrigin,
  persistPlan,
  resolveOrigin,
  resolvePlan,
} from "../../lib/auth-flow";

type Props = {
  initialPlan: string | null;
  initialOrigin: string | null;
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      setMessage("Ingresá tu email para continuar.");
      return;
    }

    const user = findUserByEmail(email);
    if (!user) {
      setMessage("No encontramos esa cuenta. Podés crearla desde register.");
      return;
    }

    if (!user.emailVerified) {
      setMessage("Debés verificar tu email antes de iniciar sesión.");
      return;
    }

    if (planId) persistPlan(planId);
    persistOrigin(origin);

    loginUser({ email: user.email, role: user.role, origin });

    if (user.role === "admin") {
      router.push("/admin/dashboard");
      return;
    }

    if (origin === "login_manual") {
      router.push("/profile");
      return;
    }

    if (!user.hasSubscription && !user.hasPaidPeriod) {
      if (!planId) {
        setMessage("ERROR DE FLUJO: faltó el plan seleccionado para ir a checkout.");
        return;
      }
      router.push(buildCheckoutUrl(planId));
      return;
    }

    if (user.hasSubscription) {
      router.push("/");
      return;
    }

    if (user.hasPaidPeriod && !user.hasSubscription) {
      setMessage("Tu nueva suscripción se activará al finalizar el período ya abonado");
      router.push("/");
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

          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="tu@email.com" />

            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" placeholder="********" />

            <button type="submit" className={styles.submit}>Ingresar</button>
          </form>

          {message && <p>{message}</p>}

          <div className={styles.separator}><span>o</span></div>
          <Link href={registerHref} className={styles.googleButton}>No tengo cuenta, ir a register</Link>
        </div>
      </section>
    </main>
  );
}
