'use client';

import React, { useState, useEffect } from 'react';
import styles from './AlertBanner.module.css';

export default function AlertBanner() {
  // Logic: In a real app, we'd check the user session/status from context/API
  // For now, we leave it ready to be triggered by a prop or state
  const [isVisible, setIsVisible] = useState(false);

  // Example trigger: user status from query param for demo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'GRACE_PERIOD') {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className={styles.banner}>
      <div className={`${styles.content} container`}>
        <span className={styles.icon}>⚠️</span>
        <p className={styles.message}>
          <strong>Atención:</strong> Tenes un pago pendiente. 
          Tu acceso está en periodo de gracia hasta el <strong>día 7</strong>. 
          <a href="/billing" className={styles.link}>Regularizar mi situación</a>
        </p>
        <button onClick={() => setIsVisible(false)} className={styles.close}>×</button>
      </div>
    </div>
  );
}
