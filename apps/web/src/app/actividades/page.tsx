import React from "react";
import Disciplines from "../../components/Disciplines/Disciplines";
import Footer from "../../components/Footer/Footer";

export default function ActivitiesPage() {
  return (
    <main>
      <Disciplines
        sectionId="actividades-grid"
        title={
          <>
            Todas las <span className="accent-font">Actividades</span>
          </>
        }
      />
      <Footer />
    </main>
  );
}
