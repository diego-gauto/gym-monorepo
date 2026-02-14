"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clearAuthFlowState, getSession } from "../../lib/auth-flow";

export default function ProfilePage() {
  const router = useRouter();
  const session = useMemo(() => getSession(), []);

  useEffect(() => {
    if (!session) {
      router.replace("/login?origin=login_manual");
    }
  }, [session, router]);

  const onLogout = () => {
    clearAuthFlowState();
    router.push("/");
  };

  if (!session) {
    return (
      <main style={{ padding: "6.5rem 2rem 2rem", maxWidth: "720px", margin: "0 auto" }}>
        <p>No hay sesión activa.</p>
        <p>
          <Link href="/login?origin=login_manual">Ir a Ingresar</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "6.5rem 2rem 2rem", maxWidth: "720px", margin: "0 auto" }}>
      <h1>Este es el perfil del usuario</h1>
      <p>{`Sesión activa para: ${session.email}`}</p>
      <p style={{ marginTop: "1rem", marginBottom: "0.4rem", fontWeight: 600 }}>Acciones de sesión</p>
      <button
        type="button"
        onClick={onLogout}
        style={{
          marginTop: "1rem",
          border: "1px solid #0f172a",
          borderRadius: "10px",
          padding: "0.7rem 1rem",
          fontWeight: 700,
          cursor: "pointer",
          background: "#0f172a",
          color: "#ffffff",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        Cerrar sesión (Logout)
      </button>
    </main>
  );
}
