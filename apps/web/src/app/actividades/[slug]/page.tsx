import React from "react";
import { notFound } from "next/navigation";
import Footer from "../../../components/Footer/Footer";
import { fetchPublicActivityBySlug, fetchPublicHomeContent } from "../../../lib/public-content";
import styles from "./page.module.css";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [activity, home] = await Promise.all([
    fetchPublicActivityBySlug(slug),
    fetchPublicHomeContent(),
  ]);

  if (!activity) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <header
        className={styles.hero}
        style={{
          backgroundImage: `url(${activity.cardImage})`,
          backgroundPosition: "center",
        }}
      >
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <h1 className={styles.heroTitle}>{activity.name}</h1>
          <p className={styles.heroDescription}>{activity.description}</p>
        </div>
      </header>

      <main className={`container ${styles.content}`}>
        <section className={styles.topGrid}>
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
            <p>{(activity.teachers ?? []).join(" · ") || "A definir"}</p>
          </section>
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
            <h3>Qué necesitamos de vos</h3>
            <ul>
              {activity.successCriteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </main>
      <Footer
        gymName={home.site.gymName}
        gymDescription={home.site.heroSubtitle}
        activities={home.activities.map((item) => ({ slug: item.slug, name: item.name }))}
      />
    </div>
  );
}
