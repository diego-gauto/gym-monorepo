import React from 'react';
import Hero from '../components/Hero/Hero';
import Benefits from '../components/Benefits/Benefits';
import Disciplines from '../components/Disciplines/Disciplines';
import Plans from '../components/Plans/Plans';
import Contact from '../components/Contact/Contact';
import Footer from '../components/Footer/Footer';
import AlertBanner from '../components/AlertBanner/AlertBanner';
import { fetchPublicHomeContent } from '../lib/public-content';

export default async function LandingPage() {
  const home = await fetchPublicHomeContent();

  return (
    <main>
      <AlertBanner />
      <Hero
        badge={home.site.heroBadge}
        title={home.site.heroTitle}
        subtitle={home.site.heroSubtitle}
        backgroundImage={home.site.heroBackgroundImage}
      />
      <Benefits items={home.benefits} />
      <Disciplines
        items={home.activities.map((activity) => ({
          slug: activity.slug,
          name: activity.name,
          shortDescription: activity.shortDescription,
          cardImage: activity.cardImage,
        }))}
      />
      <Plans contentPlans={home.plans} />
      <Contact address={home.site.gymAddress} email={home.site.gymEmail} phone={home.site.gymPhone} />
      <Footer
        gymName={home.site.gymName}
        gymDescription={home.site.heroSubtitle}
        activities={home.activities.map((activity) => ({ slug: activity.slug, name: activity.name }))}
      />
    </main>
  );
}
