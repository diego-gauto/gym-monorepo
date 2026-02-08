import React from "react";
import Link from "next/link";
import styles from "./Disciplines.module.css";

const DISCIPLINES = [
  {
    slug: "musculacion",
    name: "Musculación",
    desc: "Fuerza y masa muscular",
    bg: "/musculacion.png",
  },
  {
    slug: "crossfit",
    name: "Crossfit",
    desc: "Rendimiento integral",
    bg: "/crossfit.png",
  },
  { slug: "yoga", name: "Yoga", desc: "Cuerpo y mente", bg: "/yoga.png" },
  {
    slug: "boxing",
    name: "Boxeo",
    desc: "Técnica y explosión",
    bg: "/boxing.png",
  },
  {
    slug: "spinning",
    name: "Spinning",
    desc: "Cardio intensivo",
    bg: "/spinning.png",
  },
  {
    slug: "funcional",
    name: "Funcional",
    desc: "Entrenamiento funcional",
    bg: "/hero-bg.png",
  },
];

export default function Disciplines() {
  return (
    <section id="disciplinas" className={styles.disciplines}>
      <div className="container">
        <h2 className={styles.sectionTitle}>
          Entrená con <span className="accent-font">Estrategia</span>
        </h2>
        <div className={styles.grid}>
          {DISCIPLINES.map((d) => (
            <Link
              href={`/disciplinas/${d.slug}`}
              key={d.slug}
              className={styles.card}
            >
              <div
                className={styles.bg}
                style={{ backgroundImage: `url(${d.bg})` }}
                aria-hidden="true"
              ></div>
              <div className={styles.overlay}></div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{d.name}</h3>
                <p className={styles.cardDesc}>{d.desc}</p>
                <span className={styles.more}>Ver Actividad</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
