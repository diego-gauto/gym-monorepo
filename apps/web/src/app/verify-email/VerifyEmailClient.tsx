"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verifyUserEmail } from "../../lib/auth-flow";

export default function VerifyEmailClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Verificando cuenta...");

  useEffect(() => {
    const email = params.get("email");
    const token = params.get("token");

    if (!email || !token) {
      setMessage("Token inválido.");
      return;
    }

    verifyUserEmail(email);
    setMessage("Cuenta verificada. Iniciá sesión");
    const timeout = setTimeout(() => {
      router.push("/login?origin=elegir_plan");
    }, 800);

    return () => clearTimeout(timeout);
  }, [params, router]);

  return (
    <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <p>{message}</p>
    </main>
  );
}
