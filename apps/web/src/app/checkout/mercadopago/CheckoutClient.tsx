"use client";

import { useSearchParams } from "next/navigation";
import { getSession, resolvePlan } from "../../../lib/auth-flow";

export default function CheckoutClient() {
  const params = useSearchParams();
  const plan = resolvePlan(params.get("plan"));
  const session = getSession();

  if (!session) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Flujo no habilitado</h1>
        <p>Debés iniciar sesión desde el flujo permitido para acceder al checkout.</p>
      </main>
    );
  }

  if (session.role === "admin") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Checkout no disponible</h1>
        <p>Los administradores no pueden acceder a checkout.</p>
      </main>
    );
  }

  if (session.origin !== "elegir_plan") {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Checkout no disponible</h1>
        <p>Este checkout solo se habilita desde el flujo de elegir plan.</p>
      </main>
    );
  }

  if (!plan) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>ERROR DE FLUJO</h1>
        <p>Falta el plan seleccionado para continuar con checkout.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Checkout</h1>
      <p>Plan seleccionado: {plan}</p>
      <p>Continuación de pago en Mercado Pago.</p>
    </main>
  );
}
