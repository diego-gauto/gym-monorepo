import { Suspense } from "react";
import GoogleCallbackClient from "./GoogleCallbackClient";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem" }}><p>Procesando login con Google...</p></main>}>
      <GoogleCallbackClient />
    </Suspense>
  );
}
