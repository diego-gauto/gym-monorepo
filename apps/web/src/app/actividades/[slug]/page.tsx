import React from "react";
import { notFound } from "next/navigation";
import Footer from "../../../components/Footer/Footer";
import { ACTIVITIES_BY_SLUG } from "../../../data/activities";
import styles from "./page.module.css";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const activity = ACTIVITIES_BY_SLUG[slug];

  if (!activity) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <header
        className={styles.hero}
        style={{ backgroundImage: `url(${activity.cardImage})` }}
      >
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <h1 className={styles.heroTitle}>{activity.name}</h1>
          <p className={styles.heroDescription}>{activity.description}</p>
        </div>
      </header>

      <main className={`container ${styles.content}`}>
        <section className={styles.block}>
          <h2>Beneficios</h2>
          <ul>
            {activity.benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h2>Horarios</h2>
          <ul>
            {activity.schedule.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h2>Profesores</h2>
          <p>{activity.teachers.join(" · ")}</p>
        </section>

        <section className={styles.metaGrid}>
          <article className={styles.metaCard}>
            <h3>Nivel requerido</h3>
            <p>{activity.level}</p>
          </article>
          <article className={styles.metaCard}>
            <h3>Duración aproximada</h3>
            <p>{activity.duration}</p>
          </article>
          <article className={styles.metaCard}>
            <h3>Criterios de éxito</h3>
            <ul>
              {activity.successCriteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
}
