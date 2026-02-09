import React from "react";
import Link from "next/link";
import styles from "./Disciplines.module.css";
import { ACTIVITIES } from "../../data/activities";

type DisciplinesProps = {
  title?: React.ReactNode;
  sectionId?: string;
};

export default function Disciplines({
  title = (
    <>
      Entrená con <span className="accent-font">Estrategia</span>
    </>
  ),
  sectionId = "disciplinas",
}: DisciplinesProps) {
  return (
    <section id={sectionId} className={styles.disciplines}>
      <div className="container">
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.grid}>
          {ACTIVITIES.map((activity) => (
            <Link
              href={`/actividades/${activity.slug}`}
              key={activity.slug}
              className={styles.card}
            >
              <div
                className={styles.bg}
                style={{ backgroundImage: `url(${activity.cardImage})` }}
                aria-hidden="true"
              ></div>
              <div className={styles.overlay}></div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{activity.name}</h3>
                <p className={styles.cardDesc}>{activity.shortDescription}</p>
                <span className={styles.more}>Ver actividad</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
