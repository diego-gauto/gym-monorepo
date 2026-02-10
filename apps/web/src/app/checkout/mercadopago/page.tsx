import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main style={{ padding: "2rem" }}><p>Cargando checkout...</p></main>}>
      <CheckoutClient />
    </Suspense>
  );
}
