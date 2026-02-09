import styles from './page.module.css';

export default function AuthPage() {
  return (
    <main className={styles.authPage}>
      <section className={styles.visualPanel}>
        <div className={styles.overlay} />
        <div className={styles.visualContent}>
          <p className={styles.kicker}>Entrená con propósito</p>
          <h1>Tu progreso empieza en cada inicio de sesión.</h1>
          <p>
            Accedé a tu cuenta para gestionar tu plan, asistencia y beneficios del gimnasio.
          </p>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.card}>
          <header>
            <h2>Bienvenido</h2>
            <p>Ingresá o creá tu cuenta para continuar.</p>
          </header>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.active}`} type="button">Login</button>
            <button className={styles.tab} type="button">Register</button>
          </div>

          <form className={styles.form}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="tu@email.com" />

            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" placeholder="********" />

            <button type="submit" className={styles.submit}>Iniciar sesión</button>
          </form>

          <div className={styles.separator}><span>o</span></div>

          <button className={styles.googleButton} type="button">Continuar con Google</button>
        </div>
      </section>
    </main>
  );
}
