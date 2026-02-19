"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { requestPasswordReset, resetPasswordByToken } from "../../lib/auth-flow";

export default function RecoverPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const isResetMode = useMemo(() => Boolean(token), [token]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await requestPasswordReset(email);
      setMessage(response.message);
    } catch (err) {
      const text = err instanceof Error ? err.message : "No se pudo procesar la solicitud.";
      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!token) {
      setError("Token inválido.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await resetPasswordByToken(token, password, confirmPassword);
      setMessage(response.message);
    } catch (err) {
      const text = err instanceof Error ? err.message : "No se pudo restablecer la contraseña.";
      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <section
        style={{
          width: "min(560px, 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 16,
          background: "rgba(12,15,21,0.9)",
          padding: "1.3rem",
        }}
      >
        <h1 style={{ marginBottom: "0.4rem" }}>{isResetMode ? "Restablecer contraseña" : "Recuperar contraseña"}</h1>
        <p style={{ marginBottom: "1rem", color: "rgba(255,255,255,0.75)" }}>
          {isResetMode
            ? "Ingresá tu nueva contraseña para actualizar el acceso."
            : "Ingresá tu email y te vamos a enviar un link para recuperar tu contraseña."}
        </p>

        {isResetMode ? (
          <form onSubmit={handleReset} style={{ display: "grid", gap: "0.8rem" }}>
            <label style={{ display: "grid", gap: "0.4rem" }}>
              Nueva contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", color: "#fff", padding: "0.65rem 0.75rem" }}
              />
            </label>
            <label style={{ display: "grid", gap: "0.4rem" }}>
              Confirmar contraseña
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
                style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", color: "#fff", padding: "0.65rem 0.75rem" }}
              />
            </label>
            <button type="submit" disabled={isSubmitting} style={{ borderRadius: 10, padding: "0.75rem 1rem", fontWeight: 700, background: "var(--primary)", color: "#10151f" }}>
              {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequest} style={{ display: "grid", gap: "0.8rem" }}>
            <label style={{ display: "grid", gap: "0.4rem" }}>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", color: "#fff", padding: "0.65rem 0.75rem" }}
              />
            </label>
            <button type="submit" disabled={isSubmitting} style={{ borderRadius: 10, padding: "0.75rem 1rem", fontWeight: 700, background: "var(--primary)", color: "#10151f" }}>
              {isSubmitting ? "Enviando..." : "Enviar link de recuperación"}
            </button>
          </form>
        )}

        {message && <p style={{ marginTop: "0.9rem", color: "rgba(191,255,0,0.95)" }}>{message}</p>}
        {error && <p style={{ marginTop: "0.9rem", color: "#ff6b6b" }}>{error}</p>}
        <p style={{ marginTop: "1rem" }}>
          <Link href="/login?origin=login_manual" style={{ color: "var(--primary)", textDecoration: "underline" }}>
            Volver al login
          </Link>
        </p>
      </section>
    </main>
  );
}

