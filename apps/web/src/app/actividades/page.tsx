import React from "react";
import Disciplines from "../../components/Disciplines/Disciplines";
import Footer from "../../components/Footer/Footer";
import { fetchPublicHomeContent } from "../../lib/public-content";

export default async function ActivitiesPage() {
  const home = await fetchPublicHomeContent();

  return (
    <main>
      <Disciplines
        sectionId="actividades-grid"
        title={
          <>
            Todas las <span className="accent-font">Actividades</span>
          </>
        }
        items={home.activities.map((activity) => ({
          slug: activity.slug,
          name: activity.name,
          shortDescription: activity.shortDescription,
          cardImage: activity.cardImage,
        }))}
      />
      <Footer
        gymName={home.site.gymName}
        gymDescription={home.site.heroSubtitle}
        activities={home.activities.map((activity) => ({ slug: activity.slug, name: activity.name }))}
      />
    </main>
  );
}
