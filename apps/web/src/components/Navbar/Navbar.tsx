"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

const NAV_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#disciplinas", label: "Actividades" },
  { href: "#planes", label: "Planes" },
  { href: "#contacto", label: "Contacto" },
];

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [activeSection, setActiveSection] = useState("#inicio");
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;
    const sections = NAV_LINKS.map((l) => l.href.slice(1));
    const handleScroll = () => {
      if (window.scrollY < 150) {
        setActiveSection("#inicio");
        return;
      }
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(`#${sections[i]}`);
          break;
        }
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  if (!mounted) return null;

  return (
    <header className={`${styles.header} ${shown ? styles.visible : ""}`}>
      <nav className={styles.nav}>
        <div className={styles.glassBlur} aria-hidden />
        <div className={styles.glassOverlay} aria-hidden />
        <div className={styles.container}>
          <div className={styles.logo}>
            <Link href="/">
              <span className={styles.logoIcon} aria-hidden="true">
                <span className={styles.logoLetter}>G</span>
              </span>
              <span className={styles.brandText}>GymPro</span>
            </Link>
          </div>

          <ul className={styles.links}>
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={activeSection === href ? styles.active : ""}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.rightActions}>
            <Link href="/auth/login" className={styles.loginLink}>
              <svg
                className={styles.userIcon}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Ingresar
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
