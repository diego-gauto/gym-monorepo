import React from 'react';
import Hero from '../components/Hero/Hero';
import Benefits from '../components/Benefits/Benefits';
import Disciplines from '../components/Disciplines/Disciplines';
import Plans from '../components/Plans/Plans';
import Contact from '../components/Contact/Contact';
import Footer from '../components/Footer/Footer';
import AlertBanner from '../components/AlertBanner/AlertBanner';

export default function LandingPage() {
  return (
    <main>
      <AlertBanner />
      <Hero />
      <Benefits />
      <Disciplines />
      <Plans />
      <Contact />
      <Footer />
    </main>
  );
}
