import React from 'react';
import Navbar from '../../../components/Navbar/Navbar';
import Footer from '../../../components/Footer/Footer';
import styles from './page.module.css';

const DISCIPLINE_DATA: Record<string, any> = {
  musculacion: {
    title: 'Musculación',
    description: 'Entrenamiento de fuerza tradicional con los mejores equipos del mercado.',
    benefits: ['Aumento de masa muscular', 'Mejora de densidad ósea', 'Metabolismo activo'],
    schedule: 'Lunes a Viernes 06:00 - 23:00 | Sábados 08:00 - 20:00',
    teachers: ['Juan Pérez', 'María García'],
  },
  crossfit: {
    title: 'Crossfit',
    description: 'WODs desafiantes que combinan gimnasia, levantamiento y cardio.',
    benefits: ['Capacidad aeróbica', 'Fuerza funcional', 'Comunidad y motivación'],
    schedule: 'Clases cada 1 hora desde las 07:00',
    teachers: ['Carlos López', 'Lucía Fernández'],
  },
  // Add other disciplines as needed
};

export default async function DisciplinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = DISCIPLINE_DATA[slug] || { title: 'Disciplina no encontrada', description: 'Lo sentimos, esta disciplina no está disponible.' };

  return (
    <div className={styles.page}>
      <Navbar />
      <header className={styles.header}>
        <div className="container">
          <h1 className="accent-font">{data.title}</h1>
        </div>
      </header>
      
      <main className="container">
        <section className={styles.section}>
          <h2>Descripción</h2>
          <p>{data.description}</p>
        </section>

        {data.benefits && (
          <section className={styles.section}>
            <h2>Beneficios</h2>
            <ul>
              {data.benefits.map((b: string, i: number) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>
        )}

        {data.schedule && (
          <section className={styles.section}>
            <h2>Horarios</h2>
            <p>{data.schedule}</p>
          </section>
        )}
        
        {data.teachers && (
          <section className={styles.section}>
            <h2>Profesores</h2>
            <p>{data.teachers.join(', ')}</p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
