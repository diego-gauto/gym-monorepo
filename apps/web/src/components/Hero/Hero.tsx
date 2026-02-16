import React from 'react';
import styles from './Hero.module.css';

type HeroProps = {
  badge?: string;
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
};

export default function Hero({
  badge = "#1 EN FITNESS PREMIUM",
  title = "Transformá tu cuerpo. Superá tus límites.",
  subtitle = "Unite al gimnasio más moderno de Argentina. Equipamiento de última generación, entrenadores certificados y una comunidad que te impulsa a alcanzar tus metas.",
  backgroundImage = "/hero-bg.png",
}: HeroProps) {
  const [titleMain, titleHighlight] = title.split(". ");

  return (
    <section id="inicio" className={styles.hero} style={{ backgroundImage: `url('${backgroundImage}')` }}>
      <div className={styles.overlay}></div>
      <div className={`${styles.content} container`}>
        <div className={styles.badge}>{badge}</div>
        <h1 className={styles.title}>
          {titleMain}
          {titleHighlight && <span className={styles.highlight}> {titleHighlight}</span>}
        </h1>
        <p className={styles.subtitle}>
          {subtitle}
        </p>
        
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>500+</span>
            <span className={styles.statLabel}>Miembros Activos</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>15+</span>
            <span className={styles.statLabel}>Clases Semanales</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>10</span>
            <span className={styles.statLabel}>Entrenadores Pro</span>
          </div>
        </div>

        <div className={styles.actions}>
          <a href="#planes" className={styles.primaryBtn}>
            Ver Planes
          </a>
          <a href="#contacto" className={styles.secondaryBtn}>
            Contactanos
          </a>
        </div>
      </div>
    </section>
  );
}
