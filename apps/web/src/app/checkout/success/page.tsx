import Link from "next/link";
import styles from "./page.module.css";

type SearchValue = string | string[] | undefined;

function readParam(value: SearchValue) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toPlanLabel(plan: string) {
  if (plan === "monthly") return "Plan Mensual";
  if (plan === "quarterly") return "Plan Trimestral";
  if (plan === "yearly") return "Plan Anual";
  return "Plan";
}

function formatAmount(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchValue>;
}) {
  const plan = readParam(searchParams?.plan);
  const invoice = readParam(searchParams?.invoice);
  const subscription = readParam(searchParams?.subscription);
  const amount = formatAmount(readParam(searchParams?.amount));

  return (
    <main className={styles.pageWrap}>
      <section className={styles.card}>
        <p className={styles.kicker}>Pago exitoso</p>
        <h1>Tu suscripción quedó activa</h1>
        <p className={styles.summary}>
          Ya confirmamos tu compra{plan ? ` de ${toPlanLabel(plan)}` : ""}. Podés ver tu factura en tu perfil y gestionar la suscripción cuando quieras.
        </p>

        <dl className={styles.detailGrid}>
          {amount && (
            <>
              <dt>Monto</dt>
              <dd>{amount}</dd>
            </>
          )}
          {invoice && (
            <>
              <dt>Factura</dt>
              <dd>{invoice}</dd>
            </>
          )}
          {subscription && (
            <>
              <dt>Suscripción</dt>
              <dd>{subscription}</dd>
            </>
          )}
        </dl>

        <div className={styles.actions}>
          <Link href="/actividades" className={styles.primaryAction}>
            Ir a actividades
          </Link>
          <Link href="/profile" className={styles.secondaryAction}>
            Ver perfil
          </Link>
        </div>
      </section>
    </main>
  );
}
