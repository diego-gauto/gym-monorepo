import React from "react";
import styles from "./Footer.module.css";

type FooterProps = {
  gymName?: string;
  gymDescription?: string;
  activities?: Array<{ slug: string; name: string }>;
};

export default function Footer({
  gymName = "GYM MASTER",
  gymDescription = "Tu transformación comienza hoy. Sumate a la elite del entrenamiento nacional con el respaldo de profesionales certificados.",
  activities = [
    { slug: "musculacion", name: "Musculación" },
    { slug: "crossfit", name: "Cross Training" },
    { slug: "yoga", name: "Yoga" },
    { slug: "boxing", name: "Boxeo" },
    { slug: "spinning", name: "Spinning" },
    { slug: "funcional", name: "Funcional" },
  ],
}: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} container`}>
        <div className={styles.brand}>
          <h2 className="accent-font">
            <span style={{ color: "var(--primary)" }}>{gymName.split(" ")[0] ?? "GYM"}</span>{" "}
            {gymName.split(" ").slice(1).join(" ") || "MASTER"}
          </h2>
          <p>{gymDescription}</p>
          <div className={styles.socials}>
            <a className={styles.socialIcon} href="#" aria-label="Instagram">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="3.2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
              </svg>
            </a>
            <a className={styles.socialIcon} href="#" aria-label="Facebook">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 2h-3a4 4 0 00-4 4v3H8v4h3v8h4v-8h3l1-4h-4V6a1 1 0 011-1h2V2z"
                  fill="currentColor"
                />
              </svg>
            </a>
            <a className={styles.socialIcon} href="#" aria-label="YouTube">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22 7.5s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C15.5 4 12 4 12 4h0s-3.5 0-6.9.6c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2 9.1 2 10.6v2.8C2 14.9 2.2 16.3 2.2 16.3s.2 1.4.8 2c.8.8 1.8.8 2.3.9 1.7.2 7.1.6 7.1.6s3.5 0 6.9-.6c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.4.2-2.9v-2.8c0-1.5-.2-2.9-.2-2.9z"
                  stroke="currentColor"
                  strokeWidth="0"
                  fill="currentColor"
                />
                <path d="M10 15l5-3-5-3v6z" fill="#000" />
              </svg>
            </a>
          </div>
        </div>

        <div className={`${styles.linkGroup} ${styles.companyGroup}`}>
          <h3 className={styles.groupTitle}>Empresa</h3>
          <ul className={styles.linkList}>
            <li>
              <a href="#inicio">Inicio</a>
            </li>
            <li>
              <a href="#beneficios">Beneficios</a>
            </li>
            <li>
              <a href="#contacto">Contacto</a>
            </li>
          </ul>
        </div>

        <div className={`${styles.linkGroup} ${styles.activitiesGroup}`}>
          <h3 className={styles.groupTitle}>Actividades</h3>
          <ul className={`${styles.linkList} ${styles.twoCol}`}>
            {activities.slice(0, 8).map((activity) => (
              <li key={activity.slug}>
                <a href={`/actividades/${activity.slug}`}>{activity.name}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${styles.linkGroup} ${styles.legalGroup}`}>
          <h3 className={styles.groupTitle}>Legal</h3>
          <ul className={styles.linkList}>
            <li>
              <a href="#">Términos y Condiciones</a>
            </li>
            <li>
              <a href="#">Privacidad</a>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className="container">
          <p>
            &copy; {new Date().getFullYear()} GYM MASTER. Todos los derechos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
