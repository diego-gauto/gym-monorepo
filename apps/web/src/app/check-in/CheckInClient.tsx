"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchCheckInActivities,
  fetchCheckInEligibility,
  getSession,
  submitCheckIn,
  type CheckInActivity,
  type CheckInEligibility,
} from "../../lib/auth-flow";
import styles from "./CheckInClient.module.css";

type Props = {
  initialGym: string | null;
  initialToken: string | null;
};

type Phase = "loading" | "auth" | "blocked" | "ready" | "submitting" | "success" | "error";

type CheckInSuccess = {
  checkInAt: string;
  activitySlug?: string;
};

const REQUEST_TIMEOUT_MS = 10000;

const ACTIVITY_ICON_MAP: Record<string, string> = {
  musculacion: "🏋️",
  crossfit: "🔥",
  yoga: "🧘",
  boxing: "🥊",
  spinning: "🚴",
  funcional: "🤸",
};

function sanitizeGym(input: string | null) {
  if (!input) return "main";
  const normalized = input.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,40}$/.test(normalized)) return "main";
  return normalized;
}

function sanitizeToken(input: string | null) {
  if (!input) return null;
  const normalized = input.trim();
  if (!/^[a-zA-Z0-9._-]{8,220}$/.test(normalized)) return null;
  return normalized;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Tiempo de espera agotado al validar acceso. Intentá nuevamente."));
    }, timeoutMs);

    promise
      .then((result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export default function CheckInClient({ initialGym, initialToken }: Props) {
  const gym = useMemo(() => sanitizeGym(initialGym), [initialGym]);
  const token = useMemo(() => sanitizeToken(initialToken), [initialToken]);
  const returnPath = useMemo(() => {
    const params = new URLSearchParams({ gym });
    if (token) params.set("t", token);
    return `/check-in?${params.toString()}`;
  }, [gym, token]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [eligibility, setEligibility] = useState<CheckInEligibility | null>(null);
  const [activities, setActivities] = useState<CheckInActivity[]>([]);
  const [selectedActivitySlug, setSelectedActivitySlug] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [success, setSuccess] = useState<CheckInSuccess | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const loginHref = useMemo(() => {
    const params = new URLSearchParams({ origin: "login_manual", next: returnPath });
    return `/login?${params.toString()}`;
  }, [returnPath]);

  const registerHref = useMemo(() => {
    const params = new URLSearchParams({ origin: "login_manual", next: returnPath });
    return `/register?${params.toString()}`;
  }, [returnPath]);

  useEffect(() => {
    if (!token) {
      setFeedback("Este acceso es exclusivo por QR del gimnasio. Escaneá el código vigente para continuar.");
      setPhase("error");
      return;
    }

    const session = getSession();

    if (!session) {
      setPhase("auth");
      return;
    }

    let cancelled = false;
    setPhase("loading");
    setFeedback(null);

    (async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          setIsLocating(true);
          const position = await withTimeout(
            new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: REQUEST_TIMEOUT_MS,
                maximumAge: 0,
              });
            }),
            REQUEST_TIMEOUT_MS,
          );
          if (cancelled) return;
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLocating(false);
        }

        const [eligibilityResponse, activitiesResponse] = await Promise.all([
          withTimeout(fetchCheckInEligibility(session.accessToken, gym, token), REQUEST_TIMEOUT_MS),
          withTimeout(fetchCheckInActivities(session.accessToken, gym, token), REQUEST_TIMEOUT_MS),
        ]);

        if (cancelled) return;

        setEligibility(eligibilityResponse);
        setActivities(activitiesResponse.activities ?? []);

        if (!eligibilityResponse.canCheckIn) {
          setPhase("blocked");
          return;
        }

        setPhase("ready");
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "No pudimos validar tu ingreso.";
        setFeedback(message);
        setPhase("error");
      } finally {
        if (!cancelled) setIsLocating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gym, token]);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.slug === selectedActivitySlug) ?? null,
    [activities, selectedActivitySlug],
  );

  const handleSubmit = async () => {
    const session = getSession();

    if (!session) {
      setPhase("auth");
      return;
    }

    if (!selectedActivitySlug) {
      setFeedback("Seleccioná una actividad antes de registrar el ingreso.");
      return;
    }

    if (!token) {
      setFeedback("QR inválido. Escaneá nuevamente el código del gimnasio.");
      return;
    }

    setFeedback(null);
    setPhase("submitting");

    try {
      const response = await submitCheckIn(session.accessToken, {
        activitySlug: selectedActivitySlug,
        gymLocation: gym,
        qrToken: token,
        latitude: location?.latitude,
        longitude: location?.longitude,
        deviceId: "qr-web",
      });

      setSuccess({
        checkInAt: response.checkIn.checkInAt,
        activitySlug: response.checkIn.activitySlug ?? selectedActivitySlug,
      });
      setPhase("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos registrar tu ingreso.";
      setFeedback(message);
      setPhase("ready");
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <p className={styles.kicker}>Check-in QR</p>
          <h1>Ingreso a sede {gym.toUpperCase()}</h1>
          <p>Escaneaste correctamente el QR. Confirmá la actividad para registrar tu ingreso.</p>
        </header>

        {phase === "loading" && (
          <div className={styles.stateBox}>
            <span className={styles.spinner} aria-hidden />
            <p>Validando condiciones de acceso...</p>
          </div>
        )}

        {phase === "error" && (
          <div className={styles.stateBox}>
            <h2>No pudimos validar tu acceso</h2>
            <p>{feedback ?? "Hubo un problema de conexión con el servidor."}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryAction} onClick={() => window.location.reload()}>
                Reintentar
              </button>
              <Link href={loginHref} className={styles.secondaryAction}>
                Ir a login
              </Link>
            </div>
          </div>
        )}

        {phase === "auth" && (
          <div className={styles.stateBox}>
            <h2>Necesitás iniciar sesión</h2>
            <p>Primero ingresá con tu cuenta para validar membresía y apto médico.</p>
            <div className={styles.actions}>
              <Link href={loginHref} className={styles.primaryAction}>
                Iniciar sesión
              </Link>
              <Link href={registerHref} className={styles.secondaryAction}>
                Registrarme
              </Link>
            </div>
          </div>
        )}

        {phase === "blocked" && (
          <div className={styles.stateBox}>
            <h2>Ingreso no habilitado</h2>
            <p>{eligibility?.reason ?? "No cumplís las condiciones para usar las instalaciones."}</p>
            <div className={styles.hintList}>
              <p>Membresía: {eligibility?.membership.ok ? "OK" : "Pendiente"}</p>
              <p>Apto físico: {eligibility?.medicalCertificate.ok ? "OK" : "Vencido o ausente"}</p>
            </div>
            <div className={styles.actions}>
              <Link href="/#planes" className={styles.primaryAction}>
                Ver planes
              </Link>
              <Link href="/profile" className={styles.secondaryAction}>
                Ir a perfil
              </Link>
            </div>
          </div>
        )}

        {(phase === "ready" || phase === "submitting") && (
          <div className={styles.content}>
            <p>
              {isLocating
                ? "Obteniendo geolocalización..."
                : location
                  ? `Ubicación detectada: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                  : "No se pudo obtener la geolocalización en este dispositivo."}
            </p>
            <div className={styles.grid}>
              {activities.map((activity) => {
                const selected = selectedActivitySlug === activity.slug;
                return (
                  <button
                    key={activity.slug}
                    type="button"
                    className={`${styles.activityCard} ${selected ? styles.activityCardSelected : ""}`}
                    onClick={() => setSelectedActivitySlug(activity.slug)}
                    disabled={phase === "submitting"}
                    aria-pressed={selected}
                  >
                    <span className={styles.icon}>{ACTIVITY_ICON_MAP[activity.slug] ?? "💪"}</span>
                    <span className={styles.name}>{activity.name}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.submitRow}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={handleSubmit}
                disabled={!selectedActivitySlug || phase === "submitting"}
              >
                {phase === "submitting" ? "Registrando..." : "Registrar ingreso"}
              </button>
              {selectedActivity && <p>Actividad elegida: {selectedActivity.name}</p>}
            </div>
          </div>
        )}

        {phase === "success" && success && (
          <div className={styles.successBox}>
            <h2>Ingreso registrado</h2>
            <p>Actividad: {selectedActivity?.name ?? success.activitySlug ?? "-"}</p>
            <p>Fecha y hora: {formatDateTime(success.checkInAt)}</p>
            <div className={styles.actions}>
              <Link href="/actividades" className={styles.primaryAction}>
                Ver actividades
              </Link>
              <button type="button" className={styles.secondaryAction} onClick={() => setPhase("ready")}>
                Registrar otro ingreso
              </button>
            </div>
          </div>
        )}

        {feedback && phase !== "error" && <p className={styles.feedback}>{feedback}</p>}
      </section>
    </main>
  );
}
