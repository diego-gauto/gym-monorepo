import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "2rem" }}><p>Verificando cuenta...</p></main>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
