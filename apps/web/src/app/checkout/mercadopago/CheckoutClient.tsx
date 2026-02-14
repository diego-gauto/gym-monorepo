"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  fetchBillingContext,
  getSession,
  payCheckout,
  requestPlanChange,
  resolvePlan,
  toPlanType,
  updateBillingCard,
} from "../../../lib/auth-flow";
import { UserRole } from "@gym-admin/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CheckoutClient.module.css";

type CardBrand = "visa" | "master" | "amex" | "unknown";

const PLAN_COPY: Record<"monthly" | "quarterly" | "yearly", { label: string; amount: number; billingText: string }> = {
  monthly: { label: "Plan Mensual", amount: 15000, billingText: "Se debitará cada 1 mes." },
  quarterly: { label: "Plan Trimestral", amount: 36000, billingText: "Se debitará cada 3 meses." },
  yearly: { label: "Plan Anual", amount: 120000, billingText: "Se debitará cada 12 meses." },
};

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function detectBrand(cardNumberDigits: string): CardBrand {
  if (/^3[47]/.test(cardNumberDigits)) return "amex";
  if (/^4/.test(cardNumberDigits)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(cardNumberDigits)) return "master";
  return "unknown";
}

function formatCardNumber(rawDigits: string, brand: CardBrand) {
  const digits = rawDigits.slice(0, brand === "amex" ? 15 : 19);
  if (brand === "amex") {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*$/, (_, a: string, b: string, c: string) =>
      [a, b, c].filter(Boolean).join(" "),
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function brandLabel(brand: CardBrand) {
  if (brand === "amex") return "AMEX";
  if (brand === "master") return "Mastercard";
  if (brand === "visa") return "Visa";
  return "Tarjeta";
}

export default function CheckoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = resolvePlan(params.get("plan"));
  const mode = params.get("mode");
  const paidAccessEndsAtFromQuery = params.get("paidAccessEndsAt");
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSavedCard, setHasSavedCard] = useState(true);
  const [paidAccessEndsAt, setPaidAccessEndsAt] = useState<string | null>(paidAccessEndsAtFromQuery);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentErrorModal, setPaymentErrorModal] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({
    mercadopagoCardId: "",
    cardBrand: "",
    cardLastFour: "",
    cardIssuer: "",
  });
  const [isCvvFocused, setIsCvvFocused] = useState(false);
  const [acceptedRecurringTerms, setAcceptedRecurringTerms] = useState(false);
  const payButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeModalButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    expirationMonth: "",
    expirationYear: "",
    securityCode: "",
    cardholderName: "",
    identificationType: "DNI",
    identificationNumber: "",
  });

  const planCopy = plan ? PLAN_COPY[plan] : null;
  const cardDigits = useMemo(() => onlyDigits(paymentForm.cardNumber), [paymentForm.cardNumber]);
  const detectedBrand = useMemo(() => detectBrand(cardDigits), [cardDigits]);
  const cvvLength = detectedBrand === "amex" ? 4 : 3;

  const checks = useMemo(() => {
    const month = Number(paymentForm.expirationMonth);
    const year = Number(paymentForm.expirationYear.length === 2 ? `20${paymentForm.expirationYear}` : paymentForm.expirationYear);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const expiryOk = Number.isFinite(month) && Number.isFinite(year) && month >= 1 && month <= 12 && (year > currentYear || (year === currentYear && month >= currentMonth));
    const cardNumberLength =
      detectedBrand === "amex" ? cardDigits.length === 15 : cardDigits.length >= 13 && cardDigits.length <= 19;
    const cvvOk = onlyDigits(paymentForm.securityCode).length === cvvLength;

    return {
      cardNumber: cardNumberLength,
      holder: paymentForm.cardholderName.trim().length >= 4,
      expiry: expiryOk,
      cvv: cvvOk,
      terms: acceptedRecurringTerms,
    };
  }, [paymentForm, cardDigits, detectedBrand, cvvLength, acceptedRecurringTerms]);

  const isImmediateFormValid =
    checks.cardNumber &&
    checks.holder &&
    checks.expiry &&
    checks.cvv &&
    checks.terms &&
    paymentForm.identificationType.trim().length > 0 &&
    paymentForm.identificationNumber.trim().length >= 6;

  useEffect(() => {
    setSession(getSession());
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!sessionChecked || !session || !mode) return;
    let cancelled = false;

    (async () => {
      try {
        const context = await fetchBillingContext(session.accessToken);
        if (cancelled) return;
        setHasSavedCard(context.hasSavedCard);
        setPaidAccessEndsAt((current) => current ?? context.paidAccessEndsAt);
      } catch {
        if (!cancelled) setMessage("No pudimos validar el estado de facturación. Intentá nuevamente.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionChecked, session, mode]);

  useEffect(() => {
    if (!sessionChecked || session) return;
    const redirectParams = new URLSearchParams({ origin: "elegir_plan" });
    if (plan) redirectParams.set("plan", plan);
    router.replace(`/login?${redirectParams.toString()}`);
  }, [sessionChecked, session, plan, router]);

  useEffect(() => {
    if (!paymentErrorModal) return;
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    closeModalButtonRef.current?.focus();
  }, [paymentErrorModal]);

  useEffect(() => {
    if (!paymentErrorModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPaymentErrorModal(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paymentErrorModal]);

  useEffect(() => {
    if (paymentErrorModal) return;
    if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
      return;
    }
    payButtonRef.current?.focus();
  }, [paymentErrorModal]);

  const handleDeferredRequest = async () => {
    if (!session || !plan) return;
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (!hasSavedCard) {
        if (!cardForm.mercadopagoCardId || !cardForm.cardBrand || !cardForm.cardLastFour || !cardForm.cardIssuer) {
          setMessage("Completá los datos de la tarjeta tokenizada para continuar.");
          return;
        }

        await updateBillingCard(session.accessToken, cardForm);
      }

      const response = await requestPlanChange(session.accessToken, {
        newPlanId: toPlanType(plan),
        mode: "deferred_activation",
        paidAccessEndsAt: paidAccessEndsAt ?? undefined,
      });

      setMessage(`${response.message}. Se aplicará desde ${new Date(response.effectiveAt).toLocaleDateString("es-AR")}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduledChange = async () => {
    if (!session || !plan) return;
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await requestPlanChange(session.accessToken, {
        newPlanId: toPlanType(plan),
        mode: "scheduled_change",
      });
      setMessage(`${response.message}. Se aplicará desde ${new Date(response.effectiveAt).toLocaleDateString("es-AR")}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImmediatePayment = async () => {
    if (!session || !plan) return;
    setMessage(null);
    setPaymentErrorModal(null);

    if (!isImmediateFormValid) {
      setMessage("Revisá los datos de pago y aceptá el débito recurrente para continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await payCheckout(session.accessToken, {
        planId: toPlanType(plan),
        cardNumber: cardDigits,
        expirationMonth: paymentForm.expirationMonth,
        expirationYear: paymentForm.expirationYear,
        securityCode: onlyDigits(paymentForm.securityCode),
        cardholderName: paymentForm.cardholderName,
        identificationType: paymentForm.identificationType,
        identificationNumber: paymentForm.identificationNumber,
        cardBrand: detectedBrand === "unknown" ? "visa" : detectedBrand,
        cardIssuer: brandLabel(detectedBrand),
        acceptedRecurringTerms,
      });
      const successParams = new URLSearchParams({
        plan,
        invoice: response.invoiceUuid,
        subscription: response.subscriptionUuid,
        amount: String(planCopy?.amount ?? 0),
      });
      router.push(`/checkout/success?${successParams.toString()}`);
    } catch (error) {
      setPaymentErrorModal(error instanceof Error ? error.message : "No se pudo procesar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sessionChecked || !session) {
    return (
      <main className={styles.loadingWrap}>
        <div className={styles.loader} />
        <p>Cargando checkout...</p>
      </main>
    );
  }

  if (session.role === UserRole.ADMIN) {
    return (
      <main className={styles.pageWrap}>
        <section className={styles.stateCard}>
          <h1>Checkout no disponible</h1>
          <p>Los administradores no pueden acceder a checkout.</p>
        </section>
      </main>
    );
  }

  if (session.origin !== "elegir_plan") {
    return (
      <main className={styles.pageWrap}>
        <section className={styles.stateCard}>
          <h1>Checkout no disponible</h1>
          <p>Este checkout solo se habilita desde el flujo de elegir plan.</p>
        </section>
      </main>
    );
  }

  if (!plan || !planCopy) {
    return (
      <main className={styles.pageWrap}>
        <section className={styles.stateCard}>
          <h1>ERROR DE FLUJO</h1>
          <p>Falta el plan seleccionado para continuar con checkout.</p>
        </section>
      </main>
    );
  }

  if (mode === "scheduled_change") {
    return (
      <main className={styles.pageWrap}>
        <section className={styles.stateCard}>
          <h1>Checkout</h1>
          <p>Solicitud de cambio programado para el plan: {plan}</p>
          <p>El cambio se aplicará al finalizar tu período actual.</p>
          <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={handleScheduledChange}>
            {isSubmitting ? "Guardando..." : "Confirmar solicitud"}
          </button>
          {message && <p className={styles.message}>{message}</p>}
        </section>
      </main>
    );
  }

  if (mode === "deferred_activation") {
    return (
      <main className={styles.pageWrap}>
        <section className={styles.stateCard}>
          <h1>Checkout</h1>
          <p>Activación diferida del plan: {plan}</p>
          <p>La suscripción se activará al terminar tu período pago vigente.</p>
          {!hasSavedCard && (
            <section className={styles.tokenForm}>
              <p>No tenés tarjeta guardada. Ingresá los datos tokenizados por Mercado Pago para cobrar en la fecha correcta.</p>
              <input
                value={cardForm.mercadopagoCardId}
                placeholder="mercadopagoCardId"
                onChange={(event) => setCardForm((current) => ({ ...current, mercadopagoCardId: event.target.value }))}
              />
              <input
                value={cardForm.cardBrand}
                placeholder="cardBrand"
                onChange={(event) => setCardForm((current) => ({ ...current, cardBrand: event.target.value }))}
              />
              <input
                value={cardForm.cardLastFour}
                placeholder="cardLastFour"
                maxLength={4}
                onChange={(event) => setCardForm((current) => ({ ...current, cardLastFour: event.target.value }))}
              />
              <input
                value={cardForm.cardIssuer}
                placeholder="cardIssuer"
                onChange={(event) => setCardForm((current) => ({ ...current, cardIssuer: event.target.value }))}
              />
            </section>
          )}
          <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={handleDeferredRequest}>
            {isSubmitting ? "Procesando..." : "Guardar tarjeta y programar suscripción"}
          </button>
          {message && <p className={styles.message}>{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageWrap}>
      <section className={styles.checkoutGrid}>
        <article className={styles.summaryPanel}>
          <p className={styles.kicker}>Checkout</p>
          <h2 className={styles.sectionHeading}>Checkout</h2>
          <h1>Confirmá tu suscripción</h1>
          <p className={styles.summaryText}>Estás adhiriéndote a un plan con cobro recurrente automático según el ciclo seleccionado.</p>
          <div className={styles.planCard}>
            <p className={styles.planName}>{planCopy.label}</p>
            <p className={styles.planPrice}>{formatCurrency(planCopy.amount)}</p>
            <p className={styles.planBilling}>{planCopy.billingText}</p>
            <p className={styles.planRaw}>Plan seleccionado: {plan}</p>
          </div>
          <ul className={styles.checkList}>
            <li className={checks.cardNumber ? styles.ok : styles.pending}>Número de tarjeta válido</li>
            <li className={checks.holder ? styles.ok : styles.pending}>Nombre del titular completo</li>
            <li className={checks.expiry ? styles.ok : styles.pending}>Vencimiento vigente</li>
            <li className={checks.cvv ? styles.ok : styles.pending}>CVV correcto ({cvvLength} dígitos)</li>
            <li className={checks.terms ? styles.ok : styles.pending}>Consentimiento de débito recurrente</li>
          </ul>
        </article>

        <article className={styles.formPanel}>
          <div className={styles.cardScene}>
            <div className={`${styles.card3d} ${isCvvFocused ? styles.flipped : ""}`}>
              <div className={styles.cardFaceFront}>
                <div className={styles.cardTop}>
                  <span className={styles.brandBadge}>{brandLabel(detectedBrand)}</span>
                  <span className={styles.chip} />
                </div>
                <p className={styles.cardNumber}>
                  {paymentForm.cardNumber || "•••• •••• •••• ••••"}
                </p>
                <div className={styles.cardBottom}>
                  <div>
                    <span className={styles.cardLabel}>Titular</span>
                    <p>{paymentForm.cardholderName || "NOMBRE APELLIDO"}</p>
                  </div>
                  <div>
                    <span className={styles.cardLabel}>Vence</span>
                    <p>
                      {(paymentForm.expirationMonth || "MM").padStart(2, "0")}/
                      {(paymentForm.expirationYear || "YY").slice(-2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className={styles.cardFaceBack}>
                <div className={styles.magneticBand} />
                <div className={styles.cvvStripe}>
                  <span>CVV</span>
                  <strong>{paymentForm.securityCode || "•••"}</strong>
                </div>
                <p className={styles.backHint}>Código de seguridad de {cvvLength} dígitos</p>
              </div>
            </div>
          </div>

          <form className={styles.paymentForm} onSubmit={(event) => event.preventDefault()}>
            <div className={styles.inputGroup}>
              <label htmlFor="card-number">Número de tarjeta</label>
              <input
                id="card-number"
                value={paymentForm.cardNumber}
                placeholder="4509 9535 6623 3704"
                onChange={(event) => {
                  const digits = onlyDigits(event.target.value);
                  const brand = detectBrand(digits);
                  setPaymentForm((current) => ({ ...current, cardNumber: formatCardNumber(digits, brand) }));
                }}
              />
            </div>

            <div className={styles.rowTwo}>
              <div className={styles.inputGroup}>
                <label htmlFor="expiry-month">Vencimiento</label>
                <div className={styles.rowTwo}>
                  <input
                    id="expiry-month"
                    value={paymentForm.expirationMonth}
                    placeholder="MM"
                    maxLength={2}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        expirationMonth: onlyDigits(event.target.value).slice(0, 2),
                      }))
                    }
                  />
                  <input
                    value={paymentForm.expirationYear}
                    placeholder="YY"
                    maxLength={4}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        expirationYear: onlyDigits(event.target.value).slice(0, 4),
                      }))
                    }
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="cvv">CVV</label>
                <input
                  id="cvv"
                  value={paymentForm.securityCode}
                  placeholder={cvvLength === 4 ? "1234" : "123"}
                  maxLength={cvvLength}
                  onFocus={() => setIsCvvFocused(true)}
                  onBlur={() => setIsCvvFocused(false)}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      securityCode: onlyDigits(event.target.value).slice(0, cvvLength),
                    }))
                  }
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="holder">Titular</label>
              <input
                id="holder"
                value={paymentForm.cardholderName}
                placeholder="NOMBRE APELLIDO"
                onChange={(event) => setPaymentForm((current) => ({ ...current, cardholderName: event.target.value.toUpperCase() }))}
              />
            </div>

            <div className={styles.rowTwo}>
              <div className={styles.inputGroup}>
                <label htmlFor="doc-type">Tipo doc</label>
                <input
                  id="doc-type"
                  value={paymentForm.identificationType}
                  placeholder="DNI"
                  onChange={(event) => setPaymentForm((current) => ({ ...current, identificationType: event.target.value.toUpperCase() }))}
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="doc-number">Documento</label>
                <input
                  id="doc-number"
                  value={paymentForm.identificationNumber}
                  placeholder="12345678"
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, identificationNumber: onlyDigits(event.target.value).slice(0, 12) }))
                  }
                />
              </div>
            </div>

            <label className={styles.termsRow}>
              <input
                type="checkbox"
                checked={acceptedRecurringTerms}
                onChange={(event) => setAcceptedRecurringTerms(event.target.checked)}
              />
              <span>Acepto adherirme al débito recurrente del plan seleccionado y sus renovaciones automáticas.</span>
            </label>

            <button ref={payButtonRef} type="button" className={styles.primaryButton} disabled={isSubmitting || !isImmediateFormValid} onClick={handleImmediatePayment}>
              {isSubmitting ? "Procesando pago..." : `Pagar ${formatCurrency(planCopy.amount)}`}
            </button>
          </form>
          {message && <p className={styles.message}>{message}</p>}
        </article>
      </section>
      {paymentErrorModal && (
        <div data-testid="payment-error-overlay" className={styles.modalOverlay} onClick={(event) => {
          if (event.target === event.currentTarget) setPaymentErrorModal(null);
        }}>
          <section className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="payment-error-title">
            <h3 id="payment-error-title">No pudimos procesar el pago</h3>
            <p>{paymentErrorModal}</p>
            <button ref={closeModalButtonRef} type="button" className={styles.primaryButton} onClick={() => setPaymentErrorModal(null)}>
              Cerrar y reintentar
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
