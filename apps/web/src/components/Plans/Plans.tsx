"use client";

import React, { useState } from "react";
import styles from "./Plans.module.css";
import {
  buildCheckoutUrl,
  fetchBillingContext,
  getSession,
  loginUser,
  persistOrigin,
  persistPlan,
  requestPlanChange,
  toPlanType,
  type BillingContext,
  type PlanId,
} from "../../lib/auth-flow";
import type { PublicPlanContent } from "../../lib/public-content";

type DialogState =
  | { kind: "none" }
  | { kind: "alreadySubscribed"; planId: PlanId; endDate: string | null }
  | { kind: "paidPeriod"; planId: PlanId; endDate: string; hasSavedCard: boolean }
  | { kind: "result"; title: string; message: string };

type DisplayPlan = {
  id: PlanId | string;
  name: string;
  description: string;
  monthlyNumeric: number;
  features: string[];
  highlight: boolean;
  badge?: string | null;
};

function normalizePlanId(planId: string): PlanId | null {
  switch (planId.toLowerCase()) {
    case "monthly":
      return "monthly";
    case "quarterly":
      return "quarterly";
    case "yearly":
      return "yearly";
    default:
      return null;
  }
}

function toDisplayPlans(plans?: PublicPlanContent[]): DisplayPlan[] {
  if (!plans?.length) return [];
  return plans
    .filter((plan) => plan.active)
    .map((plan) => ({
      id: normalizePlanId(plan.id) ?? plan.id,
      name: plan.name,
      description: plan.description,
      monthlyNumeric: Number(plan.price),
      features: plan.features ?? [],
      highlight: plan.highlight,
      badge: plan.badge ?? null,
    }));
}

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

type PlansProps = {
  contentPlans?: PublicPlanContent[];
};

export default function Plans({ contentPlans }: PlansProps) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [billingContext, setBillingContext] = useState<BillingContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const plans = toDisplayPlans(contentPlans);

  const goToCheckout = (planId: PlanId, mode?: "scheduled_change" | "deferred_activation", paidAccessEndsAt?: string) => {
    const checkoutUrl = buildCheckoutUrl(planId);
    if (mode) {
      const params = new URLSearchParams({ plan: planId, mode });
      if (paidAccessEndsAt) params.set("paidAccessEndsAt", paidAccessEndsAt);
      window.location.href = `/checkout/mercadopago?${params.toString()}`;
      return;
    }
    window.location.href = checkoutUrl;
  };

  const loadContext = async (accessToken: string) => {
    if (billingContext) return billingContext;
    const context = await fetchBillingContext(accessToken);
    setBillingContext(context);
    return context;
  };

  const submitPlanRequest = async (planId: PlanId, mode: "scheduled_change" | "deferred_activation", paidAccessEndsAt?: string) => {
    const session = getSession();
    if (!session) {
      window.location.href = `/register?plan=${planId}&origin=elegir_plan`;
      return;
    }

    setIsProcessing(true);
    try {
      const response = await requestPlanChange(session.accessToken, {
        newPlanId: toPlanType(planId),
        mode,
        paidAccessEndsAt,
      });
      setDialog({
        kind: "result",
        title: "Solicitud registrada",
        message: `${response.message}. Se aplicará a partir de ${formatDate(response.effectiveAt)}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar la solicitud.";
      setDialog({
        kind: "result",
        title: "No se pudo completar",
        message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChoosePlan = async (planId: PlanId) => {
    persistPlan(planId);
    persistOrigin("elegir_plan");
    const session = getSession();

    if (!session) {
      window.location.href = `/register?plan=${planId}&origin=elegir_plan`;
      return;
    }

    loginUser({ ...session, origin: "elegir_plan" });

    setIsProcessing(true);
    try {
      const context = await loadContext(session.accessToken);

      if (context.activeSubscriptionEndDate) {
        setDialog({ kind: "alreadySubscribed", planId, endDate: context.activeSubscriptionEndDate });
        return;
      }

      const paidPeriodEnd = parseDate(context.paidAccessEndsAt);
      if (paidPeriodEnd && paidPeriodEnd.getTime() > Date.now()) {
        setDialog({ kind: "paidPeriod", planId, endDate: context.paidAccessEndsAt!, hasSavedCard: context.hasSavedCard });
        return;
      }

      goToCheckout(planId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo validar tu estado de suscripción.";
      setDialog({ kind: "result", title: "No se pudo continuar", message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section id="planes" className={styles.plans}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          Elegí tu <span className="accent-font">Pase</span>
        </h2>
        <div className={styles.grid}>
          {plans.map((plan) => {
            const onlinePlanId = normalizePlanId(String(plan.id));
            let priceNote = "\u00a0";
            if (onlinePlanId === "quarterly") {
              priceNote = `te queda en $${formatNumber(Math.round(plan.monthlyNumeric / 3))} / mes`;
            }
            if (onlinePlanId === "yearly") {
              priceNote = `te queda en $${formatNumber(Math.round(plan.monthlyNumeric / 12))} / mes`;
            }
            return (
              <div key={String(plan.id)} className={`${styles.card} ${plan.highlight ? styles.highlighted : ""}`}>
                {plan.badge && <span className={styles.badge}>{plan.badge}</span>}
                <div className={styles.planHeader}>
                  <h3 className={styles.planName}>{plan.name}</h3>
                  <p className={styles.planDescription}>{plan.description}</p>
                </div>
                <div className={styles.priceContainer}>
                  <div className={styles.priceMain}>
                    <span className={styles.currency}>$</span>
                    <span className={styles.amount}>{formatNumber(plan.monthlyNumeric)}</span>
                    {onlinePlanId === "monthly" && <span className={styles.period}>/mes</span>}
                  </div>
                  <div className={styles.priceSub}>{priceNote}</div>
                </div>
                <ul className={styles.features}>
                  {plan.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={styles.ctaSecondary}
                  onClick={() => onlinePlanId && handleChoosePlan(onlinePlanId)}
                  disabled={!onlinePlanId}
                >
                  {!onlinePlanId ? "No disponible online" : isProcessing ? "Procesando..." : "Elegir Plan"}
                </button>
              </div>
            );
          })}
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
                  <button
                    type="button"
                    className={styles.modalButtonPrimary}
                    disabled={isProcessing}
                    onClick={() => submitPlanRequest(dialog.planId, "scheduled_change")}
                  >
                    {isProcessing ? "Guardando..." : "Solicitar cambio de plan"}
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
                  {dialog.hasSavedCard ? (
                    <button
                      type="button"
                      className={styles.modalButtonPrimary}
                      disabled={isProcessing}
                      onClick={() => submitPlanRequest(dialog.planId, "deferred_activation", dialog.endDate)}
                    >
                      {isProcessing ? "Guardando..." : "Programar activación diferida"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.modalButtonPrimary}
                      onClick={() => goToCheckout(dialog.planId, "deferred_activation", dialog.endDate)}
                    >
                      Continuar a checkout para tokenizar tarjeta
                    </button>
                  )}
                  <button type="button" className={styles.modalButtonSecondary} onClick={() => setDialog({ kind: "none" })}>
                    Volver
                  </button>
                </div>
              </>
            )}

            {dialog.kind === "result" && (
              <>
                <h3 className={styles.modalTitle}>{dialog.title}</h3>
                <p className={styles.modalText}>{dialog.message}</p>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalButtonPrimary} onClick={() => setDialog({ kind: "none" })}>
                    Entendido
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
