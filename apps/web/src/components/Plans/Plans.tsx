import React from "react";
import Link from "next/link";
import styles from "./Plans.module.css";

const PLANS = [
  {
    id: "monthly",
    name: "Mensual",
    description: "Ideal para empezar tu transformación",
    monthlyNumeric: 15000,
    features: [
      "Acceso completo al gimnasio",
      "Uso de equipamiento premium",
      "Vestuarios con lockers",
      "WiFi gratis",
    ],
    highlight: false,
  },
  {
    id: "quarterly",
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
    id: "yearly",
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

export default function Plans() {
  return (
    <section id="planes" className={styles.plans}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          Elegí tu <span className="accent-font">Pase</span>
        </h2>
        <div className={styles.grid}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.card} ${plan.highlight ? styles.highlighted : ""}`}
            >
              {plan.badge && <span className={styles.badge}>{plan.badge}</span>}
              <div className={styles.planHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDescription}>{plan.description}</p>
              </div>
              <div className={styles.priceContainer}>
                {plan.id === "monthly" ? (
                  <>
                    <div className={styles.priceMain}>
                      <span className={styles.currency}>$</span>
                      <span className={styles.amount}>
                        {formatNumber(plan.monthlyNumeric)}
                      </span>
                      <span className={styles.period}>/mes</span>
                    </div>
                    <div className={styles.priceSub} aria-hidden="true">
                      &nbsp;
                    </div>
                  </>
                ) : plan.id === "quarterly" ? (
                  <>
                    <div className={styles.priceMain}>
                      <span className={styles.currency}>$</span>
                      <span className={styles.amount}>
                        {formatNumber(plan.monthlyNumeric * 3)}
                      </span>
                    </div>
                    <div className={styles.priceSub}>
                      /{formatNumber(plan.monthlyNumeric)} /mes
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.priceMain}>
                      <span className={styles.currency}>$</span>
                      <span className={styles.amount}>
                        {formatNumber(plan.monthlyNumeric * 12)}
                      </span>
                    </div>
                    <div className={styles.priceSub}>
                      /{formatNumber(plan.monthlyNumeric)} /mes
                    </div>
                  </>
                )}
              </div>
              <ul className={styles.features}>
                {plan.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <Link
                href={`/auth/register?plan=${plan.id}`}
                className={
                  plan.highlight ? styles.ctaPrimary : styles.ctaSecondary
                }
              >
                Elegir Plan
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
