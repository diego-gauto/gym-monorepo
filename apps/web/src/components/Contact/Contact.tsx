import React from 'react';
import styles from './Contact.module.css';

export default function Contact() {
  return (
    <section id="contacto" className={styles.contact}>
      <div className="container">
        <div className={styles.wrapper}>
          <div className={styles.info}>
            <h2 className={styles.title}>Ponete en <span className="accent-font">Contacto</span></h2>
            <p className={styles.desc}>Estamos para ayudarte a alcanzar tu mejor versión. Envianos un mensaje o visítanos en nuestra sede central.</p>
            
            <div className={styles.infoItems}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Ubicación</span>
                <span className={styles.value}>Av. del Libertador 1234, CABA</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>info@gymmaster.com.ar</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Teléfono</span>
                <span className={styles.value}>+54 11 4567-8900</span>
              </div>
            </div>
          </div>
          
          <form className={styles.form}>
            <div className={styles.inputGroup}>
              <input type="text" placeholder="Nombre completo" required />
            </div>
            <div className={styles.inputGroup}>
              <input type="email" placeholder="Email" required />
            </div>
            <div className={styles.inputGroup}>
              <textarea placeholder="Tu mensaje..." rows={5} required></textarea>
            </div>
            <button type="submit" className={styles.submitBtn}>Enviar Mensaje</button>
          </form>
        </div>
      </div>
    </section>
  );
}
