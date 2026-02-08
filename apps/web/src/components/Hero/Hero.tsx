import React from 'react';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section id="inicio" className={styles.hero}>
      <div className={styles.overlay}></div>
      <div className={`${styles.content} container`}>
        <div className={styles.badge}>#1 EN FITNESS PREMIUM</div>
        <h1 className={styles.title}>
          Transformá tu cuerpo. <span className={styles.highlight}>Superá tus límites.</span>
        </h1>
        <p className={styles.subtitle}>
          Unite al gimnasio más moderno de Argentina. Equipamiento de última generación, entrenadores certificados y una comunidad que te impulsa a alcanzar tus metas.
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
