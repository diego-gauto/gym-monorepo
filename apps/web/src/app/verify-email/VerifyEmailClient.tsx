"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verifyUserEmail } from "../../lib/auth-flow";

export default function VerifyEmailClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Verificando cuenta...");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const token = params.get("token");

    if (!token) {
      setMessage("Token inválido.");
      setStatus("error");
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const response = await verifyUserEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(response.message ?? "Cuenta verificada. Iniciá sesión.");
      } catch (error) {
        if (cancelled) return;
        const text = error instanceof Error ? error.message : "No se pudo verificar la cuenta.";
        setStatus("error");
        setMessage(text);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <section style={{ width: "min(560px, 100%)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, background: "rgba(12,15,21,0.9)", padding: "1.2rem" }}>
        <p style={{ marginBottom: "1rem" }}>{message}</p>
        {status !== "loading" && (
          <button
            type="button"
            onClick={() => router.push("/login?origin=login_manual")}
            style={{
              width: "100%",
              background: "var(--primary)",
              color: "#0c1119",
              borderRadius: 10,
              padding: "0.75rem 1rem",
              fontWeight: 700,
            }}
          >
            Ir a iniciar sesión
          </button>
        )}
      </section>
    </main>
  );
}
