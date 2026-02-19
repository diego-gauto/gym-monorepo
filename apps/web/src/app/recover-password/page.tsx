import { Suspense } from "react";
import RecoverPasswordClient from "./RecoverPasswordClient";

export default function RecoverPasswordPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: "2rem" }}><p>Cargando...</p></main>}>
      <RecoverPasswordClient />
    </Suspense>
  );
}

