"use client";

import { AuthProvider, MembershipStatus, PlanType, InvoiceStatus } from "@gym-admin/shared";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicHomeContentResponse, PublicPlanContent } from "../../lib/public-content";
import landingPlansStyles from "../../components/Plans/Plans.module.css";
import {
  type AttendanceHistoryResponse,
  type AttendanceRange,
  cancelMySubscription,
  changeMyPassword,
  clearAuthFlowState,
  fetchBillingContext,
  fetchMyAttendance,
  fetchMyPayments,
  fetchMyProfile,
  fetchMySubscriptionOverview,
  getSession,
  type BillingContext,
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

type ProfileSection = "profile" | "subscription" | "attendance" | "payments" | "danger";
type ModalPlanId = "monthly" | "quarterly" | "yearly";

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

function toSectionLabel(section: ProfileSection) {
  switch (section) {
    case "profile":
      return "Mis datos";
    case "subscription":
      return "Suscripción";
    case "attendance":
      return "Asistencias";
    case "payments":
      return "Facturas";
    case "danger":
      return "Baja";
    default:
      return section;
  }
}

function formatDateTime(dateLike?: string | null) {
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

function formatDate(dateLike?: string | null) {
  if (!dateLike) return "-";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

function toInvoiceStatusText(status: InvoiceStatus) {
  switch (status) {
    case InvoiceStatus.PAID:
      return "Pagada";
    case InvoiceStatus.PENDING:
      return "Pendiente";
    case InvoiceStatus.EXPIRED:
      return "Vencida";
    case InvoiceStatus.VOIDED:
      return "Anulada";
    default:
      return status;
  }
}

function toInvoiceConcept(item: PaymentHistoryResponse["items"][number]) {
  if (!item.subscriptionId) return "Pago único";
  const match = item.appliedTo.match(/Suscripci[oó]n\s+([A-Z_]+)/i);
  const token = match?.[1]?.toUpperCase() ?? "";
  const plan = (Object.values(PlanType) as string[]).includes(token) ? (token as PlanType) : null;
  if (plan) return `Suscripción ${PLAN_LABELS[plan]}`;
  return "Suscripción";
}

function inferPaidPeriodPlanLabel(
  payments: PaymentHistoryResponse | null,
  plans: SubscriptionOverviewResponse["plans"] | null,
): string | null {
  if (!payments?.items?.length || !plans?.length) return null;
  const latestPaid = payments.items.find((item) => item.status === InvoiceStatus.PAID);
  if (!latestPaid) return null;
  const match = plans.find((plan) => Number(plan.price) === Number(latestPaid.amount));
  return match ? PLAN_LABELS[match.id] : null;
}

function normalizeModalPlanId(planId: string): ModalPlanId | null {
  switch (planId.toLowerCase()) {
    case "monthly":
      return "monthly";
    case "quarterly":
      return "quarterly";
    case "yearly":
      return "yearly";
    default:
      return null;
  }
}

function formatIntegerNumber(value: number) {
  return value.toLocaleString("es-AR");
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
  const [attendanceCache, setAttendanceCache] = useState<Partial<Record<AttendanceRange, AttendanceHistoryResponse>>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentHistoryResponse | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionOverviewResponse | null>(null);
  const [billingContext, setBillingContext] = useState<BillingContext | null>(null);
  const [range, setRange] = useState<AttendanceRange>("week");
  const [section, setSection] = useState<ProfileSection>("profile");
  const [menuCollapsed, setMenuCollapsed] = useState(false);
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
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [publicPlans, setPublicPlans] = useState<PublicPlanContent[] | null>(null);
  const [publicPlansLoading, setPublicPlansLoading] = useState(false);
  const [publicPlansError, setPublicPlansError] = useState<string | null>(null);

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
        const [profileData, attendanceData, paymentsData, subscriptionData, billingContextData] = await Promise.all([
          fetchMyProfile(token),
          fetchMyAttendance(token, "week"),
          fetchMyPayments(token),
          fetchMySubscriptionOverview(token),
          fetchBillingContext(token),
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
        setAttendanceCache({ week: attendanceData });
        setPayments(paymentsData);
        setSubscription(subscriptionData);
        setBillingContext(billingContextData);
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
  }, [router, session]);

  useEffect(() => {
    if (loading) return;
    const accessToken = session?.accessToken;
    if (!accessToken) return;
    const token: string = accessToken;

    const cached = attendanceCache[range];
    if (cached) {
      setAttendance(cached);
      return;
    }

    let cancelled = false;
    async function loadAttendanceByRange() {
      try {
        setAttendanceLoading(true);
        const attendanceData = await fetchMyAttendance(token, range);
        if (cancelled) return;
        setAttendance(attendanceData);
        setAttendanceCache((prev) => ({ ...prev, [range]: attendanceData }));
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "No se pudo cargar asistencias.";
        if (msg.includes("sesión expiró")) {
          router.replace("/login?origin=login_manual&next=/profile");
          return;
        }
        setMessage(msg);
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    }

    void loadAttendanceByRange();
    return () => {
      cancelled = true;
    };
  }, [attendanceCache, loading, range, router, session]);

  const ensurePublicPlansLoaded = async () => {
    if (publicPlansLoading || publicPlans) return;
    setPublicPlansLoading(true);
    setPublicPlansError(null);
    try {
      const response = await fetch("/api/content/home", { cache: "no-store" });
      if (!response.ok) throw new Error(`No se pudo obtener los planes (status ${response.status})`);
      const parsed = (await response.json()) as PublicHomeContentResponse;
      const plans = Array.isArray(parsed?.plans) ? parsed.plans : [];
      setPublicPlans(plans.filter((plan) => plan.active !== false));
    } catch (err) {
      setPublicPlansError(err instanceof Error ? err.message : "No se pudo obtener los planes.");
    } finally {
      setPublicPlansLoading(false);
    }
  };

  const openPlansModal = () => {
    setPlansModalOpen(true);
    void ensurePublicPlansLoaded();
  };

  const closePlansModal = () => {
    setPlansModalOpen(false);
  };

  const onLogout = () => {
    clearAuthFlowState();
    router.push("/");
  };

  const onPhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setDraft((prev) => ({ ...prev, phone: digits }));
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
      // Optional: if Cloudinary is configured, upload and store a real URL instead of a data URL.
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (cloudName && uploadPreset) {
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", uploadPreset);
        form.append("folder", "gymmaster/avatars");

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: form,
        });
        if (!response.ok) {
          throw new Error("No se pudo subir el avatar. Probá nuevamente.");
        }
        const uploaded = (await response.json()) as { secure_url?: string };
        if (!uploaded.secure_url) {
          throw new Error("No se pudo obtener la URL del avatar.");
        }
        setDraft((prev) => ({ ...prev, avatarUrl: uploaded.secure_url! }));
        return;
      }

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
  const modalPlans = (publicPlans ?? [])
    .filter((plan) => plan.active !== false)
    .map((plan) => {
      const normalized = normalizeModalPlanId(plan.id);
      let monthlyNote = "\u00a0";
      if (normalized === "quarterly") {
        monthlyNote = `te queda en $${formatIntegerNumber(Math.round(Number(plan.price) / 3))} / mes`;
      } else if (normalized === "yearly") {
        monthlyNote = `te queda en $${formatIntegerNumber(Math.round(Number(plan.price) / 12))} / mes`;
      }
      return {
        ...plan,
        normalized,
        monthlyNote,
      };
    });

  const printInvoice = (item: PaymentHistoryResponse["items"][number]) => {
    const concept = toInvoiceConcept(item);
    const status = toInvoiceStatusText(item.status);
    const date = formatDate(item.paidAt ?? item.createdAt);
    const amount = formatMoney(item.amount, item.currency);
    const invoiceNo = item.uuid.slice(0, 8).toUpperCase();
    const payerName = `${profile.firstName} ${profile.lastName}`.trim();
    const payerPhone = draft.phone ? `+54 11 ${draft.phone}` : "-";
    const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Factura ${item.uuid}</title>
    <style>
      :root{color-scheme:light;}
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:28px;color:#111}
      .wrap{max-width:860px;margin:0 auto}
      .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
      .brand h1{margin:0;font-size:22px;letter-spacing:.02em}
      .brand p{margin:4px 0 0;color:#444;font-size:12px;line-height:1.35}
      .fact{border:2px solid #111;border-radius:12px;padding:12px 14px;min-width:260px}
      .fact .title{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
      .fact .title strong{font-size:16px;letter-spacing:.08em}
      .fact .title span{font-size:28px;font-weight:900}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
      .k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#555;margin:0}
      .v{font-size:13px;margin:3px 0 0}
      .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,\"Liberation Mono\",\"Courier New\",monospace}
      hr{border:0;border-top:1px solid #ddd;margin:16px 0}
      table{width:100%;border-collapse:collapse}
      th,td{border-bottom:1px solid #e6e6e6;padding:10px 8px;font-size:13px}
      th{text-align:left;color:#444;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
      td.r,th.r{text-align:right}
      .sum{display:flex;justify-content:flex-end;margin-top:12px}
      .sumbox{min-width:320px}
      .sumrow{display:flex;justify-content:space-between;gap:12px;padding:6px 0}
      .total{font-size:18px;font-weight:900}
      .note{margin-top:14px;color:#555;font-size:12px;line-height:1.35}
      .water{position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;opacity:.05;font-size:110px;font-weight:900;transform:rotate(-14deg)}
      @media print{body{padding:0}.water{opacity:.04}}
    </style>
  </head>
  <body>
    <div class="water">GYM</div>
    <div class="wrap">
      <div class="top">
        <div class="brand">
          <h1>GYM MASTER</h1>
          <p>Comprobante interno de membresía</p>
          <p>Av. del Libertador 1234, CABA · +54 11 4567-8900 · info@gymmaster.com.ar</p>
        </div>
        <div class="fact">
          <div class="title">
            <strong>FACTURA</strong>
            <span>B</span>
          </div>
          <div class="grid">
            <div>
              <p class="k">Número</p>
              <p class="v mono">${invoiceNo}</p>
            </div>
            <div>
              <p class="k">Fecha</p>
              <p class="v">${date}</p>
            </div>
            <div>
              <p class="k">Estado</p>
              <p class="v">${status}</p>
            </div>
            <div>
              <p class="k">ID</p>
              <p class="v mono">${item.uuid}</p>
            </div>
          </div>
        </div>
      </div>

      <hr />

      <div class="grid">
        <div>
          <p class="k">Cliente</p>
          <p class="v"><strong>${payerName}</strong></p>
          <p class="v">Email: ${profile.email}</p>
          <p class="v">Tel: ${payerPhone}</p>
        </div>
        <div>
          <p class="k">Concepto</p>
          <p class="v"><strong>${concept}</strong></p>
          <p class="v">Condición: Consumidor final</p>
        </div>
      </div>

      <hr />

      <table aria-label="Detalle">
        <thead>
          <tr>
            <th>Descripción</th>
            <th class="r">Cant.</th>
            <th class="r">Unitario</th>
            <th class="r">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${concept}</td>
            <td class="r">1</td>
            <td class="r">${amount}</td>
            <td class="r">${amount}</td>
          </tr>
        </tbody>
      </table>

      <div class="sum">
        <div class="sumbox">
          <div class="sumrow"><span>Subtotal</span><strong>${amount}</strong></div>
          <div class="sumrow"><span>IVA</span><strong>$ 0</strong></div>
          <div class="sumrow total"><span>Total</span><span>${amount}</span></div>
        </div>
      </div>

      <p class="note">Para descargar: imprimí y elegí “Guardar como PDF”.</p>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),120));</script>
    </div>
  </body>
</html>`;

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      setMessage("No se pudo abrir la factura (bloqueo de popups).");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.avatarWrap}>
            <label className={styles.avatarButton}>
              {draft.avatarUrl ? (
                <img src={draft.avatarUrl} alt="Avatar de usuario" className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {profile.firstName?.charAt(0).toUpperCase()}
                  {profile.lastName?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className={styles.avatarBadge} aria-hidden="true">
                ✎
              </span>
              <input type="file" accept="image/*" onChange={onAvatarSelected} className={styles.hiddenInput} />
            </label>
            {draft.avatarUrl && (
              <button
                type="button"
                className={styles.avatarRemove}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDraft((prev) => ({ ...prev, avatarUrl: "" }));
                }}
                aria-label="Quitar avatar"
                title="Quitar avatar"
              >
                ×
              </button>
            )}
          </div>
          <div className={styles.identityMeta}>
            <h1 className={styles.userName}>
              {profile.firstName} {profile.lastName}
            </h1>
            <p className={styles.identityEmail}>{profile.email}</p>
          </div>
        </div>

        <div className={styles.heroRight}>
          {subscription?.currentSubscription ? (
            <>
              <div className={styles.membershipTop}>
                <span className={styles.membershipLabel}>
                  Suscripción {PLAN_LABELS[subscription.currentSubscription.planId]}
                </span>
                <span className={styles.statusPill}>{toStatusText(subscription.currentSubscription.status)}</span>
              </div>
              <p className={styles.membershipMeta}>
                {(() => {
                  const endDate = new Date(subscription.currentSubscription.endDate);
                  const isPast = Number.isFinite(endDate.getTime()) && endDate.getTime() < Date.now();
                  if (subscription.currentSubscription.status === MembershipStatus.GRACE_PERIOD) return "En gracia hasta";
                  if (isPast) return "Venció el";
                  return "Vence el";
                })()} {formatDate(subscription.currentSubscription.endDate)}
              </p>
            </>
          ) : billingContext?.paidAccessEndsAt ? (
            <>
              <div className={styles.membershipTop}>
                <span className={styles.membershipLabel}>
                  Período abonado:{" "}
                  {inferPaidPeriodPlanLabel(payments, subscription?.plans ?? null) ?? "Activo"}
                </span>
                <span className={styles.statusPill}>Habilitado</span>
              </div>
              <p className={styles.membershipMeta}>
                {(() => {
                  const endDate = new Date(billingContext.paidAccessEndsAt!);
                  const isPast = Number.isFinite(endDate.getTime()) && endDate.getTime() < Date.now();
                  return isPast ? "Venció el" : "Vence el";
                })()} {formatDate(billingContext.paidAccessEndsAt)}
              </p>
            </>
          ) : (
            <>
              <div className={styles.membershipTop}>
                <span className={styles.membershipLabel}>Sin membresía activa</span>
                <span className={styles.statusPill}>Inactiva</span>
              </div>
              <p className={styles.membershipMeta}>
                Elegí un plan para acceder a las instalaciones.
              </p>
            </>
          )}
        </div>
      </section>

      {message && <div className={styles.messageBox}>{message}</div>}

      <div className={styles.shell}>
        <aside className={`${styles.sidebar} ${menuCollapsed ? styles.sidebarCollapsed : ""}`}>
          <button type="button" className={styles.sidebarToggle} onClick={() => setMenuCollapsed((prev) => !prev)}>
            {menuCollapsed ? ">>" : "<<"}
          </button>
          <nav className={styles.nav} aria-label="Secciones del perfil">
            {(["profile", "subscription", "attendance", "payments"] as ProfileSection[]).map((key) => (
              <button
                key={key}
                type="button"
                className={section === key ? styles.navItemActive : styles.navItem}
                onClick={() => setSection(key)}
                aria-current={section === key ? "page" : undefined}
              >
                <span className={styles.navLabel}>{toSectionLabel(key)}</span>
              </button>
            ))}
            <button
              type="button"
              className={section === "danger" ? styles.navItemDangerActive : styles.navItemDanger}
              onClick={() => setSection("danger")}
              aria-current={section === "danger" ? "page" : undefined}
            >
              <span className={styles.navLabel}>{toSectionLabel("danger")}</span>
            </button>
          </nav>
          <button type="button" className={styles.logoutButton} onClick={onLogout}>
            Cerrar sesión
          </button>
        </aside>

        <div className={styles.content}>
            <div className={styles.mobileTabs} role="tablist" aria-label="Secciones del perfil (móvil)">
              {(["profile", "subscription", "attendance", "payments", "danger"] as ProfileSection[]).map((key) => (
                <button
                key={key}
                type="button"
                role="tab"
                aria-selected={section === key}
                className={section === key ? styles.tabActive : styles.tab}
                onClick={() => setSection(key)}
              >
                {toSectionLabel(key)}
                </button>
              ))}
            </div>
            <div className={styles.mobileUtility}>
              <button type="button" className={styles.logoutButton} onClick={onLogout}>
                Cerrar sesión
              </button>
            </div>

            {section === "profile" && (
              <section className={styles.stack}>
                <article className={styles.card}>
                  <h2>Datos personales</h2>
                  <form onSubmit={onSaveProfile} className={styles.form}>
                  <div className={styles.formRow}>
                    <label>
                      Nombre
                      <input
                        value={draft.firstName}
                        onChange={(e) => setDraft((prev) => ({ ...prev, firstName: e.target.value }))}
                        maxLength={50}
                      />
                    </label>
                    <label>
                      Apellido
                      <input
                        value={draft.lastName}
                        onChange={(e) => setDraft((prev) => ({ ...prev, lastName: e.target.value }))}
                        maxLength={50}
                      />
                    </label>
                  </div>
                  <label>
                    Contacto
                    <input
                      value={draft.phone}
                      onChange={(e) => onPhoneChange(e.target.value)}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="1122334455"
                      maxLength={10}
                      pattern="[0-9]{10}"
                    />
                    <span className={styles.fieldHint}>Celular Argentina: 10 dígitos (sin 54 ni 9).</span>
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
                    <div className={styles.formRow}>
                      <label>
                        Nueva contraseña
                        <input
                          type="password"
                          value={passwordDraft.newPassword}
                          onChange={(e) => setPasswordDraft((prev) => ({ ...prev, newPassword: e.target.value }))}
                        />
                      </label>
                      <label>
                        Confirmar
                        <input
                          type="password"
                          value={passwordDraft.confirmNewPassword}
                          onChange={(e) => setPasswordDraft((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                        />
                      </label>
                    </div>
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
          )}

          {section === "attendance" && (
            <section className={styles.sectionCard}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>Mis asistencias</h2>
                  <p className={styles.sectionHint}>Elegí un período para ver cuándo asististe y qué actividad realizaste.</p>
                </div>
                <div className={styles.filterRow}>
                  {ATTENDANCE_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      className={range === filter.value ? styles.filterActive : styles.filterButton}
                      onClick={() => setRange((prev) => (prev === filter.value ? prev : filter.value))}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </header>
              {attendanceLoading ? <p className={styles.inlineLoading}>Actualizando asistencias...</p> : null}

              {attendance?.items.length ? (
                <div
                  className={`${styles.table} ${styles.table3} ${attendanceLoading ? styles.tableRefreshing : ""}`}
                  role="table"
                  aria-label="Asistencias"
                >
                  <div className={styles.tableHeader} role="row">
                    <div className={styles.th} role="columnheader">
                      Actividad
                    </div>
                    <div className={styles.th} role="columnheader">
                      Sede
                    </div>
                    <div className={`${styles.th} ${styles.thRight}`} role="columnheader">
                      Fecha
                    </div>
                  </div>
                  {attendance.items.map((item) => (
                    <div className={styles.tableRow} role="row" key={item.uuid}>
                      <div className={styles.td} role="cell">
                        <span className={styles.cellPrimary}>{item.activityName}</span>
                      </div>
                      <div className={styles.tdMuted} role="cell">
                        {item.gymLocation ? item.gymLocation.toUpperCase() : "-"}
                      </div>
                      <div className={`${styles.td} ${styles.tdRight}`} role="cell">
                        {formatDateTime(item.checkInAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>No hay asistencias registradas en el período seleccionado.</p>
              )}
            </section>
          )}

          {section === "payments" && (
            <section className={styles.sectionCard}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>Facturas</h2>
                  <p className={styles.sectionHint}>Historial de pagos aprobados y pendientes.</p>
                </div>
              </header>

              {payments?.items.length ? (
                <div className={`${styles.table} ${styles.table5}`} role="table" aria-label="Facturas">
                  <div className={styles.tableHeader} role="row">
                    <div className={styles.th} role="columnheader">
                      Concepto
                    </div>
                    <div className={styles.th} role="columnheader">
                      Estado
                    </div>
                    <div className={`${styles.th} ${styles.thRight}`} role="columnheader">
                      Importe
                    </div>
                    <div className={`${styles.th} ${styles.thRight}`} role="columnheader">
                      Fecha
                    </div>
                    <div className={`${styles.th} ${styles.thRight}`} role="columnheader" aria-label="Acciones">
                      &nbsp;
                    </div>
                  </div>
                  {payments.items.map((item) => (
                    <div className={styles.tableRow} role="row" key={item.uuid}>
                      <div className={styles.td} role="cell">
                        <span className={styles.cellPrimary}>{toInvoiceConcept(item)}</span>
                      </div>
                      <div className={styles.tdMuted} role="cell">
                        {toInvoiceStatusText(item.status)}
                      </div>
                      <div className={`${styles.td} ${styles.tdRight}`} role="cell">
                        {formatMoney(item.amount, item.currency)}
                      </div>
                      <div className={`${styles.tdMuted} ${styles.tdRight}`} role="cell">
                        {formatDate(item.paidAt ?? item.createdAt)}
                      </div>
                      <div className={`${styles.td} ${styles.tdRight}`} role="cell">
                        <button
                          type="button"
                          className={styles.rowMenu}
                          aria-label="Ver factura"
                          title="Ver factura"
                          onClick={() => printInvoice(item)}
                        >
                          …
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Todavía no hay facturas registradas.</p>
              )}
            </section>
          )}

          {section === "subscription" && (
            <section className={styles.sectionCard}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>Suscripción</h2>
                  <p className={styles.sectionHint}>Administrá tu plan actual y cambios programados.</p>
                </div>
              </header>

              {subscription?.currentSubscription ? (
                <>
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                      <p className={styles.summaryKicker}>Plan actual</p>
                      <p className={styles.summaryValue}>{PLAN_LABELS[subscription.currentSubscription.planId]}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <p className={styles.summaryKicker}>Estado</p>
                      <p className={styles.summaryValue}>{toStatusText(subscription.currentSubscription.status)}</p>
                    </div>
                    <div className={styles.summaryCard}>
                      <p className={styles.summaryKicker}>Vence</p>
                      <p className={styles.summaryValue}>{formatDate(subscription.currentSubscription.endDate)}</p>
                    </div>
                  </div>

                  {subscription.pendingChange && (
                    <div className={styles.pendingBox}>
                      Solicitud pendiente:{" "}
                      {subscription.pendingChange.newPlanId ? PLAN_LABELS[subscription.pendingChange.newPlanId] : "Cambio"} · aplica el{" "}
                      {formatDate(subscription.pendingChange.effectiveAt)}
                    </div>
                  )}

                  <div className={styles.subscriptionActions}>
                    <button type="button" className={`${styles.secondaryButton} ${styles.viewPlansButton}`} onClick={openPlansModal}>
                      Ver planes
                    </button>
                    <div className={styles.planChangeGroup}>
                      {subscription.plans
                        .filter((plan) => plan.id !== currentPlanId)
                        .map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => openPlanChangeModal(plan.id)}
                          >
                            Cambiar a {PLAN_LABELS[plan.id]}
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.infoBox}>
                  <p>No tenés una suscripción activa en este momento.</p>
                  <div className={styles.subscriptionActions}>
                    <button type="button" className={`${styles.secondaryButton} ${styles.viewPlansButton}`} onClick={openPlansModal}>
                      Ver planes
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {section === "danger" && (
            <section className={styles.sectionCard}>
              <header className={styles.sectionHeader}>
                <div>
                  <h2>Baja de suscripción</h2>
                  <p className={styles.sectionHint}>Administrá la baja de tu plan si lo necesitás.</p>
                </div>
              </header>

              {subscription?.currentSubscription ? (
                <div className={styles.dangerZone}>
                  <div className={styles.dangerCopy}>
                    <h3 className={styles.dangerTitle}>Solicitar baja</h3>
                    <p className={styles.dangerText}>
                      Si confirmás, se registrará una solicitud de baja según tu estado actual. Podés volver a suscribirte en cualquier momento.
                    </p>
                  </div>
                  <button type="button" className={styles.dangerButton} onClick={openCancelModal}>
                    Solicitar baja
                  </button>
                </div>
              ) : (
                <div className={styles.infoBox}>
                  No hay una suscripción activa asociada a tu cuenta.
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {plansModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Planes disponibles"
          onClick={closePlansModal}
        >
          <div className={`${styles.modal} ${styles.plansModal}`} onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.modalCloseIcon} onClick={closePlansModal} aria-label="Cerrar modal">
              ×
            </button>
            <h3>Planes</h3>
            <p className={styles.modalLead}>Información de referencia. Para contratar o cambiar tu plan, usá las acciones de Suscripción.</p>

            {publicPlansLoading ? (
              <div className={styles.loadingBox}>Cargando planes...</div>
            ) : publicPlansError ? (
              <div className={styles.errorBox}>{publicPlansError}</div>
            ) : modalPlans.length ? (
              <div className={styles.planModalViewport}>
                <div className={styles.planModalRow}>
                  {modalPlans.map((plan) => (
                    <article
                      key={plan.id}
                      className={`${landingPlansStyles.card} ${plan.highlight ? landingPlansStyles.highlighted : ""} ${styles.planModalCardScaled}`}
                    >
                      {plan.badge ? <span className={`${landingPlansStyles.badge} ${styles.planModalBadgeScaled}`}>{plan.badge}</span> : null}
                      <div className={landingPlansStyles.planHeader}>
                        <h4 className={`${landingPlansStyles.planName} ${styles.planModalNameScaled}`}>{plan.name}</h4>
                        <p className={`${landingPlansStyles.planDescription} ${styles.planModalDescriptionScaled}`}>{plan.description}</p>
                      </div>
                      <div className={landingPlansStyles.priceContainer}>
                        <div className={landingPlansStyles.priceMain}>
                          <span className={`${landingPlansStyles.currency} ${styles.planModalCurrencyScaled}`}>$</span>
                          <span className={`${landingPlansStyles.amount} ${styles.planModalAmountScaled}`}>
                            {formatIntegerNumber(Number(plan.price))}
                          </span>
                          {plan.normalized === "monthly" ? (
                            <span className={`${landingPlansStyles.period} ${styles.planModalPeriodScaled}`}>/mes</span>
                          ) : null}
                        </div>
                        <div className={`${landingPlansStyles.priceSub} ${styles.planModalPriceSubScaled}`}>{plan.monthlyNote}</div>
                      </div>
                      <ul className={`${landingPlansStyles.features} ${styles.planModalFeaturesScaled}`}>
                        {(plan.features ?? []).map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className={styles.empty}>No hay planes disponibles.</p>
            )}

          </div>
        </div>
      )}

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
