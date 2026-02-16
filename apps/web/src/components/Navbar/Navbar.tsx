"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";
import { getSession } from "../../lib/auth-flow";
import { UserRole } from "@gym-admin/shared";

const NAV_LINKS = [
  { href: "/", sectionHref: "#inicio", label: "Inicio" },
  { href: "/actividades", sectionHref: "#disciplinas", label: "Actividades" },
  { href: "/#planes", sectionHref: "#planes", label: "Planes" },
  { href: "/#contacto", sectionHref: "#contacto", label: "Contacto" },
];

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [activeSection, setActiveSection] = useState("#inicio");
  const [hasSession, setHasSession] = useState(false);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const initialSession = getSession();
    setHasSession(Boolean(initialSession));
    setIsAdminSession(initialSession?.role === UserRole.ADMIN);
    const raf = requestAnimationFrame(() => setShown(true));
    const syncSession = () => {
      const currentSession = getSession();
      setHasSession(Boolean(currentSession));
      setIsAdminSession(currentSession?.role === UserRole.ADMIN);
    };
    const onStorageChange = () => syncSession();
    const onSessionChange = () => syncSession();
    window.addEventListener("storage", onStorageChange);
    window.addEventListener("focus", onStorageChange);
    window.addEventListener("auth-session-changed", onSessionChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("focus", onStorageChange);
      window.removeEventListener("auth-session-changed", onSessionChange);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    const sectionIds = NAV_LINKS.map((l) => l.sectionHref.slice(1));
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) return;

    const updateActiveFromScroll = () => {
      const navElement = document.querySelector("header nav");
      const navHeight = navElement instanceof HTMLElement ? navElement.offsetHeight : 0;
      const probeY = window.innerHeight * 0.35 + navHeight;

      let currentSection = sections[0].id;
      for (const section of sections) {
        const sectionTop = section.offsetTop;
        if (probeY + window.scrollY >= sectionTop) {
          currentSection = section.id;
        } else {
          break;
        }
      }

      setActiveSection(`#${currentSection}`);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleSections.length > 0) {
          setActiveSection(`#${visibleSections[0].target.id}`);
          return;
        }

        updateActiveFromScroll();
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.6],
      },
    );

    sections.forEach((section) => observer.observe(section));
    updateActiveFromScroll();
    window.addEventListener("scroll", updateActiveFromScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateActiveFromScroll);
    };
  }, [pathname]);

  if (!mounted) return null;

  return (
    <header className={`${styles.header} ${shown ? styles.visible : ""}`}>
      <nav className={styles.nav}>
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
            {NAV_LINKS.map(({ href, sectionHref, label }) => {
              const isHomeSection = pathname === "/" && activeSection === sectionHref;
              const isRouteActive = pathname !== "/" && href !== "/" && pathname.startsWith(href);

              return (
                <li key={href}>
                  <Link href={href} className={isHomeSection || isRouteActive ? styles.active : ""}>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className={styles.rightActions}>
            <Link
              href={hasSession ? (isAdminSession ? "/admin/dashboard" : "/profile") : "/register?origin=login_manual"}
              className={styles.loginLink}
            >
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
              {hasSession ? (isAdminSession ? "Admin" : "Mi perfil") : "Ingresar"}
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
