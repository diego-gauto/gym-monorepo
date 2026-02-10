"use client";

import React, { useMemo, useState } from "react";
import styles from "./Plans.module.css";
import { buildCheckoutUrl, persistOrigin, persistPlan, type PlanId } from "../../lib/auth-flow";

type BillingContext = {
  isAuthenticated: boolean;
  activeSubscriptionEndDate?: string | null;
  paidAccessEndsAt?: string | null;
};

type DialogState =
  | { kind: "none" }
  | { kind: "alreadySubscribed"; planId: PlanId; endDate: string | null }
  | { kind: "paidPeriod"; planId: PlanId; endDate: string };

const PLANS = [
  {
    id: "monthly" as const,
    name: "Mensual",
    description: "Ideal para empezar tu transformación",
    monthlyNumeric: 15000,
    features: ["Acceso completo al gimnasio", "Uso de equipamiento premium", "Vestuarios con lockers", "WiFi gratis"],
    highlight: false,
  },
  {
    id: "quarterly" as const,
    name: "Trimestral",
    description: "La mejor relación precio-calidad",
    monthlyNumeric: 12000,
    features: [
      "Todo lo del plan Mensual",
      "Acceso a clases grupales",
      "Evaluación física inicial",
      "Plan de entrenamiento personalizado",
      "10% descuento en tienda",
    ],
    highlight: true,
    badge: "Más Popular",
  },
  {
    id: "yearly" as const,
    name: "Anual",
    description: "Máximo compromiso, máximos beneficios",
    monthlyNumeric: 10000,
    features: [
      "Todo lo del plan Trimestral",
      "Acceso prioritario a nuevas clases",
      "Seguimiento nutricional básico",
      "2 sesiones de PT incluidas",
      "20% descuento en tienda",
      "Congelamiento de membresía (30 días)",
    ],
    highlight: false,
  },
];

function formatNumber(n: number) {
  return n.toLocaleString("es-AR");
}

function parseDate(dateLike?: string | null): Date | null {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(dateLike?: string | null): string {
  const date = parseDate(dateLike);
  if (!date) return "fecha pendiente de confirmación";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function Plans() {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  const billingContext = useMemo<BillingContext>(() => {
    if (typeof window === "undefined") return { isAuthenticated: false };

    const globalContext = (window as Window & { __GYM_BILLING_CONTEXT__?: BillingContext }).__GYM_BILLING_CONTEXT__;

    return globalContext ?? { isAuthenticated: false };
  }, []);

  const goToCheckout = (planId: PlanId, mode?: "scheduled_change" | "deferred_activation") => {
    const checkoutUrl = buildCheckoutUrl(planId);
    if (mode) {
      const params = new URLSearchParams({ plan: planId, mode });
      window.location.href = `/checkout/mercadopago?${params.toString()}`;
      return;
    }
    window.location.href = checkoutUrl;
  };

  const handleChoosePlan = (planId: PlanId) => {
    persistPlan(planId);
    persistOrigin("elegir_plan");

    if (!billingContext.isAuthenticated) {
      window.location.href = `/register?plan=${planId}&origin=elegir_plan`;
      return;
    }

    if (billingContext.activeSubscriptionEndDate) {
      setDialog({ kind: "alreadySubscribed", planId, endDate: billingContext.activeSubscriptionEndDate });
      return;
    }

    const paidPeriodEnd = parseDate(billingContext.paidAccessEndsAt);
    if (paidPeriodEnd && paidPeriodEnd.getTime() > Date.now()) {
      setDialog({ kind: "paidPeriod", planId, endDate: billingContext.paidAccessEndsAt! });
      return;
    }

    goToCheckout(planId);
  };

  return (
    <section id="planes" className={styles.plans}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          Elegí tu <span className="accent-font">Pase</span>
        </h2>
        <div className={styles.grid}>
          {PLANS.map((plan) => (
            <div key={plan.id} className={`${styles.card} ${plan.highlight ? styles.highlighted : ""}`}>
              {plan.badge && <span className={styles.badge}>{plan.badge}</span>}
              <div className={styles.planHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDescription}>{plan.description}</p>
              </div>
              <div className={styles.priceContainer}>
                <div className={styles.priceMain}>
                  <span className={styles.currency}>$</span>
                  <span className={styles.amount}>
                    {formatNumber(
                      plan.id === "monthly" ? plan.monthlyNumeric : plan.id === "quarterly" ? plan.monthlyNumeric * 3 : plan.monthlyNumeric * 12,
                    )}
                  </span>
                  {plan.id === "monthly" && <span className={styles.period}>/mes</span>}
                </div>
                <div className={styles.priceSub}>{plan.id === "monthly" ? "\u00a0" : `te queda en $${formatNumber(plan.monthlyNumeric)} / mes`}</div>
              </div>
              <ul className={styles.features}>
                {plan.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <button type="button" className={styles.ctaSecondary} onClick={() => handleChoosePlan(plan.id)}>
                Elegir Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {dialog.kind !== "none" && (
        <div className={styles.modalOverlay} onClick={() => setDialog({ kind: "none" })}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            {dialog.kind === "alreadySubscribed" && (
              <>
                <h3 className={styles.modalTitle}>Ya tenés una suscripción activa</h3>
                <p className={styles.modalText}>
                  Podés hacer upgrade o downgrade sin interrupciones. El cambio se hará efectivo al terminar el período actual ({formatDate(dialog.endDate)}).
                </p>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalButtonPrimary} onClick={() => goToCheckout(dialog.planId, "scheduled_change")}>
                    Solicitar cambio de plan
                  </button>
                  <button type="button" className={styles.modalButtonSecondary} onClick={() => setDialog({ kind: "none" })}>
                    Entendido
                  </button>
                </div>
              </>
            )}

            {dialog.kind === "paidPeriod" && (
              <>
                <h3 className={styles.modalTitle}>Tenés un período pago vigente</h3>
                <p className={styles.modalText}>
                  Tu nueva suscripción se activará al finalizar el período ya abonado ({formatDate(dialog.endDate)}).
                </p>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalButtonPrimary} onClick={() => goToCheckout(dialog.planId, "deferred_activation")}>
                    Continuar a checkout
                  </button>
                  <button type="button" className={styles.modalButtonSecondary} onClick={() => setDialog({ kind: "none" })}>
                    Volver
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
