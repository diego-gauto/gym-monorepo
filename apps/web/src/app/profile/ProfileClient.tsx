"use client";

import { AuthProvider, MembershipStatus, PlanType } from "@gym-admin/shared";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type AttendanceHistoryResponse,
  type AttendanceRange,
  cancelMySubscription,
  changeMyPassword,
  clearAuthFlowState,
  fetchMyAttendance,
  fetchMyPayments,
  fetchMyProfile,
  fetchMySubscriptionOverview,
  getSession,
  type PaymentHistoryResponse,
  requestPlanChange,
  type SubscriptionOverviewResponse,
  type UserProfileResponse,
  updateMyProfile,
} from "../../lib/auth-flow";
import styles from "./ProfileClient.module.css";

type ProfileDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
};

type PasswordDraft = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

type ConfirmAction =
  | {
      open: false;
    }
  | {
      open: true;
      kind: "change_plan";
      targetPlan: PlanType;
      title: string;
      description: string;
      confirmText: string;
    }
  | {
      open: true;
      kind: "cancel_subscription";
      title: string;
      description: string;
      confirmText: string;
    };

const ATTENDANCE_FILTERS: Array<{ label: string; value: AttendanceRange }> = [
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
  { label: "Trimestre", value: "quarter" },
  { label: "Año", value: "year" },
];

const PLAN_LABELS: Record<PlanType, string> = {
  [PlanType.MONTHLY]: "Mensual",
  [PlanType.QUARTERLY]: "Trimestral",
  [PlanType.YEARLY]: "Anual",
};

function formatDate(dateLike?: string | null) {
  if (!dateLike) return "-";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toStatusText(status: MembershipStatus) {
  switch (status) {
    case MembershipStatus.ACTIVE:
      return "Activa";
    case MembershipStatus.PENDING_CANCELLATION:
      return "Pendiente de baja";
    case MembershipStatus.GRACE_PERIOD:
      return "En gracia";
    case MembershipStatus.CANCELLED:
      return "Cancelada";
    case MembershipStatus.EXPIRED:
      return "Expirada";
    case MembershipStatus.REJECTED:
      return "Rechazada";
    case MembershipStatus.REJECTED_FATAL:
      return "Rechazo fatal";
    default:
      return status;
  }
}

async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");

  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  const offsetX = (size - width) / 2;
  const offsetY = (size - height) / 2;

  ctx.drawImage(bitmap, offsetX, offsetY, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ProfileClient() {
  const router = useRouter();
  const session = useMemo(() => getSession(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [attendance, setAttendance] = useState<AttendanceHistoryResponse | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionOverviewResponse | null>(null);
  const [range, setRange] = useState<AttendanceRange>("week");
  const [draft, setDraft] = useState<ProfileDraft>({
    firstName: "",
    lastName: "",
    phone: "",
    avatarUrl: "",
  });
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>({ open: false });

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      router.replace("/login?origin=login_manual");
      return;
    }
    const token: string = accessToken;

    let cancelled = false;
    async function loadProfileData() {
      try {
        setLoading(true);
        setError(null);
        const [profileData, attendanceData, paymentsData, subscriptionData] = await Promise.all([
          fetchMyProfile(token),
          fetchMyAttendance(token, range),
          fetchMyPayments(token),
          fetchMySubscriptionOverview(token),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setDraft({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone ?? "",
          avatarUrl: profileData.avatarUrl ?? "",
        });
        setAttendance(attendanceData);
        setPayments(paymentsData);
        setSubscription(subscriptionData);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "No se pudo cargar el perfil.";
        if (msg.includes("sesión expiró")) {
          router.replace("/login?origin=login_manual&next=/profile");
          return;
        }
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfileData();
    return () => {
      cancelled = true;
    };
  }, [router, session, range]);

  const onLogout = () => {
    clearAuthFlowState();
    router.push("/");
  };

  const refreshSubscription = async () => {
    if (!session) return;
    const data = await fetchMySubscriptionOverview(session.accessToken);
    setSubscription(data);
  };

  const onAvatarSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Seleccioná una imagen válida para el avatar.");
      return;
    }
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setDraft((prev) => ({ ...prev, avatarUrl: dataUrl }));
    } catch {
      setMessage("No se pudo procesar la imagen seleccionada.");
    }
  };

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setSavingProfile(true);
    setMessage(null);
    try {
      const response = await updateMyProfile(session.accessToken, {
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone,
        avatarUrl: draft.avatarUrl,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: response.user.firstName,
              lastName: response.user.lastName,
              phone: response.user.phone,
              avatarUrl: response.user.avatarUrl,
            }
          : prev,
      );
      setMessage(response.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar el perfil.";
      if (msg.includes("sesión expiró")) {
        router.replace("/login?origin=login_manual&next=/profile");
        return;
      }
      setMessage(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setChangingPassword(true);
    setMessage(null);
    try {
      const response = await changeMyPassword(session.accessToken, passwordDraft);
      setPasswordDraft({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setMessage(response.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo cambiar la contraseña.";
      if (msg.includes("sesión expiró")) {
        router.replace("/login?origin=login_manual&next=/profile");
        return;
      }
      setMessage(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const openPlanChangeModal = (targetPlan: PlanType) => {
    if (!subscription?.currentSubscription) return;
    const currentPlan = subscription.currentSubscription.planId;
    const targetLabel = PLAN_LABELS[targetPlan];
    const currentLabel = PLAN_LABELS[currentPlan];
    setConfirmAction({
      open: true,
      kind: "change_plan",
      targetPlan,
      title: "Confirmá el cambio de suscripción",
      description: `Vas a pasar de ${currentLabel} a ${targetLabel}. El cambio quedará programado para el fin del período actual.`,
      confirmText: "Acepto, solicitar cambio",
    });
  };

  const openCancelModal = () => {
    setConfirmAction({
      open: true,
      kind: "cancel_subscription",
      title: "Confirmá la baja de suscripción",
      description: "Se solicitará la baja según tu estado actual. Podés cancelar esta acción antes de confirmar.",
      confirmText: "Acepto, solicitar baja",
    });
  };

  const onConfirmAction = async () => {
    if (!session || !confirmAction.open) return;
    setActionLoading(true);
    setMessage(null);
    try {
      if (confirmAction.kind === "change_plan") {
        await requestPlanChange(session.accessToken, {
          newPlanId: confirmAction.targetPlan,
          mode: "scheduled_change",
        });
        setMessage("Solicitud de cambio enviada correctamente.");
      } else {
        await cancelMySubscription(session.accessToken);
        setMessage("Solicitud de baja procesada correctamente.");
      }
      setConfirmAction({ open: false });
      await refreshSubscription();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo completar la acción.";
      if (msg.includes("sesión expiró")) {
        router.replace("/login?origin=login_manual&next=/profile");
        return;
      }
      setMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingBox}>Cargando perfil...</div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className={styles.page}>
        <div className={styles.errorBox}>
          <p>{error ?? "No se pudo cargar el perfil."}</p>
          <button type="button" className={styles.secondaryButton} onClick={() => router.refresh()}>
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const currentPlanId = subscription?.currentSubscription?.planId ?? null;
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.identity}>
          <div className={styles.avatarWrap}>
            {draft.avatarUrl ? (
              <img src={draft.avatarUrl} alt="Avatar de usuario" className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {profile.firstName?.charAt(0).toUpperCase()}
                {profile.lastName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className={styles.kicker}>Perfil de usuario</p>
            <h1>{profile.firstName} {profile.lastName}</h1>
            <p>{profile.email}</p>
          </div>
        </div>
        <div className={styles.heroActions}>
          <label className={styles.secondaryButton}>
            Editar avatar
            <input type="file" accept="image/*" onChange={onAvatarSelected} className={styles.hiddenInput} />
          </label>
          <button type="button" className={styles.secondaryButton} onClick={() => setDraft((prev) => ({ ...prev, avatarUrl: "" }))}>
            Quitar avatar
          </button>
          <button type="button" className={styles.primaryButton} onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </section>

      {message && <div className={styles.messageBox}>{message}</div>}

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Datos personales</h2>
          <form onSubmit={onSaveProfile} className={styles.form}>
            <label>
              Nombre
              <input value={draft.firstName} onChange={(e) => setDraft((prev) => ({ ...prev, firstName: e.target.value }))} maxLength={50} />
            </label>
            <label>
              Apellido
              <input value={draft.lastName} onChange={(e) => setDraft((prev) => ({ ...prev, lastName: e.target.value }))} maxLength={50} />
            </label>
            <label>
              Contacto
              <input value={draft.phone} onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))} maxLength={30} />
            </label>
            <button type="submit" className={styles.primaryButton} disabled={savingProfile}>
              {savingProfile ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </article>

        <article className={styles.card}>
          <h2>Seguridad</h2>
          {profile.authProvider === AuthProvider.LOCAL ? (
            <form onSubmit={onChangePassword} className={styles.form}>
              <label>
                Contraseña actual
                <input
                  type="password"
                  value={passwordDraft.currentPassword}
                  onChange={(e) => setPasswordDraft((prev) => ({ ...prev, currentPassword: e.target.value }))}
                />
              </label>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  value={passwordDraft.newPassword}
                  onChange={(e) => setPasswordDraft((prev) => ({ ...prev, newPassword: e.target.value }))}
                />
              </label>
              <label>
                Confirmar nueva contraseña
                <input
                  type="password"
                  value={passwordDraft.confirmNewPassword}
                  onChange={(e) => setPasswordDraft((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                />
              </label>
              <button type="submit" className={styles.primaryButton} disabled={changingPassword}>
                {changingPassword ? "Actualizando..." : "Cambiar contraseña"}
              </button>
            </form>
          ) : (
            <div className={styles.infoBox}>
              Esta cuenta usa autenticación con Google. El cambio de contraseña se gestiona desde Google.
            </div>
          )}
        </article>
      </section>

      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <h2>Actividades realizadas</h2>
          <div className={styles.filterRow}>
            {ATTENDANCE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={range === filter.value ? styles.filterActive : styles.filterButton}
                onClick={() => setRange(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </header>
        <div className={styles.list}>
          {attendance?.items.length ? (
            attendance.items.map((item) => (
              <div className={styles.listRow} key={item.uuid}>
                <div>
                  <strong>{item.activityName}</strong>
                  <p>{item.gymLocation ? `Sede: ${item.gymLocation.toUpperCase()}` : "Sede no informada"}</p>
                </div>
                <span>{formatDate(item.checkInAt)}</span>
              </div>
            ))
          ) : (
            <p className={styles.empty}>No hay actividades registradas en el período seleccionado.</p>
          )}
        </div>
      </section>

      <section className={styles.sectionCard}>
        <h2>Pagos</h2>
        <div className={styles.list}>
          {payments?.items.length ? (
            payments.items.map((item) => (
              <div className={styles.listRow} key={item.uuid}>
                <div>
                  <strong>{item.appliedTo}</strong>
                  <p>{item.paymentMethod} · {item.status}</p>
                </div>
                <div className={styles.rightAlign}>
                  <strong>{formatMoney(item.amount, item.currency)}</strong>
                  <p>{formatDate(item.paidAt ?? item.createdAt)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.empty}>Todavía no hay pagos registrados.</p>
          )}
        </div>
      </section>

      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <h2>Suscripción</h2>
          {subscription?.currentSubscription && (
            <span className={styles.statusPill}>{toStatusText(subscription.currentSubscription.status)}</span>
          )}
        </header>

        {subscription?.currentSubscription ? (
          <>
            <p className={styles.subscriptionSummary}>
              Plan actual: <strong>{PLAN_LABELS[subscription.currentSubscription.planId]}</strong> · vence el{" "}
              <strong>{formatDate(subscription.currentSubscription.endDate)}</strong>
            </p>

            {subscription.pendingChange && (
              <div className={styles.pendingBox}>
                Solicitud pendiente: {subscription.pendingChange.newPlanId ? PLAN_LABELS[subscription.pendingChange.newPlanId] : "Cambio"} ·
                aplica el {formatDate(subscription.pendingChange.effectiveAt)}
              </div>
            )}

            <div className={styles.subscriptionActions}>
              {subscription.plans
                .filter((plan) => plan.id !== currentPlanId)
                .map((plan) => (
                  <button key={plan.id} type="button" className={styles.secondaryButton} onClick={() => openPlanChangeModal(plan.id)}>
                    Cambiar a {PLAN_LABELS[plan.id]}
                  </button>
                ))}
              <button type="button" className={styles.dangerButton} onClick={openCancelModal}>
                Solicitar baja
              </button>
            </div>
          </>
        ) : (
          <div className={styles.infoBox}>
            No tenés una suscripción activa en este momento.{" "}
            <Link href="/#planes" className={styles.inlineLink}>
              Elegir plan
            </Link>
          </div>
        )}
      </section>

      {confirmAction.open && (
        <div className={styles.modalOverlay} onClick={() => setConfirmAction({ open: false })}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.checkIcon}>✓</div>
            <h3>{confirmAction.title}</h3>
            <p>{confirmAction.description}</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.primaryButton} onClick={onConfirmAction} disabled={actionLoading}>
                {actionLoading ? "Procesando..." : confirmAction.confirmText}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmAction({ open: false })}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
