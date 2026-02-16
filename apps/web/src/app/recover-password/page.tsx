import Link from "next/link";

export default function RecoverPasswordPage() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <section
        style={{
          width: "min(560px, 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "16px",
          background: "rgba(12,15,21,0.9)",
          padding: "1.3rem",
        }}
      >
        <h1 style={{ marginBottom: "0.7rem" }}>Recuperar contraseña</h1>
        <p style={{ marginBottom: "1rem", color: "rgba(255,255,255,0.75)" }}>
          Esta funcionalidad se va a implementar en la siguiente etapa.
        </p>
        <p>
          <Link href="/login?origin=login_manual" style={{ color: "var(--primary)", textDecoration: "underline" }}>
            Volver al login
          </Link>
        </p>
      </section>
    </main>
  );
}

