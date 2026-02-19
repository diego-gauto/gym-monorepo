"use client";

import Link from "next/link";
import { CurrencyCode, PaymentMethod, PlanType, UserRole } from "@gym-admin/shared";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearAuthFlowState,
  createAdminActivity,
  createAdminBenefit,
  createAdminBranch,
  createAdminTrainer,
  deleteAdminActivity,
  deleteAdminBenefit,
  deleteAdminBranch,
  deleteAdminPlan,
  deleteAdminTrainer,
  fetchAdminActivities,
  fetchAdminBenefits,
  fetchAdminBranches,
  fetchAdminCheckInQr,
  searchAdminCounterPaymentStudents,
  fetchAdminPlans,
  fetchAdminSiteSettings,
  fetchAdminStats,
  fetchAdminTrainers,
  getSession,
  type AdminActivity,
  type AdminBenefit,
  type AdminBranch,
  type AdminCheckInQrResponse,
  type AdminCounterPaymentStudent,
  type AdminPlan,
  type AdminRange,
  type AdminSiteSettings,
  type AdminStatsResponse,
  type AdminTrainer,
  type SessionUser,
  registerAdminCounterPayment,
  updateAdminActivity,
  updateAdminBenefit,
  updateAdminBranch,
  updateAdminSiteSettings,
  updateAdminTrainer,
  upsertAdminPlan,
} from "../../../lib/auth-flow";
import styles from "./AdminDashboardClient.module.css";

type DashboardTab = "stats" | "counterPayments" | "site" | "trainers" | "activities" | "benefits" | "plans" | "branches" | "qr";

const TABS: Array<{ id: DashboardTab; label: string }> = [
  { id: "stats", label: "Estadísticas" },
  { id: "counterPayments", label: "Pagos mostrador" },
  { id: "site", label: "Sitio y Hero" },
  { id: "trainers", label: "Profesores" },
  { id: "activities", label: "Actividades" },
  { id: "benefits", label: "Beneficios" },
  { id: "plans", label: "Planes" },
  { id: "branches", label: "Sedes" },
  { id: "qr", label: "QR Check-in" },
];

const STATS_RANGE_OPTIONS: Array<{ value: AdminRange; label: string }> = [
  { value: "snapshot", label: "Actual" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Año" },
];

const BENEFIT_ICON_OPTIONS = [
  "DUMBBELL",
  "GROUP",
  "CLOCK",
  "TROPHY",
  "HEART",
  "BOLT",
  "STAR",
  "SHIELD",
  "FIRE",
  "RUN",
] as const;

const EMPTY_SITE: AdminSiteSettings = {
  heroBadge: "",
  heroTitle: "",
  heroSubtitle: "",
  heroBackgroundImage: "",
  gymName: "",
  gymAddress: "",
  gymEmail: "",
  gymPhone: "",
};

const EMPTY_TRAINER: Omit<AdminTrainer, "id"> = {
  name: "",
  bio: "",
  avatarUrl: "",
  active: true,
};

const EMPTY_ACTIVITY: Omit<AdminActivity, "id"> = {
  slug: "",
  name: "",
  shortDescription: "",
  description: "",
  cardImage: "",
  level: "",
  duration: "",
  benefits: [],
  schedule: [],
  successCriteria: [],
  trainerIds: [],
  active: true,
};

const EMPTY_BENEFIT: Omit<AdminBenefit, "id"> = {
  title: "",
  description: "",
  iconKey: "DUMBBELL",
  active: true,
};

const EMPTY_PLAN: AdminPlan = {
  id: "",
  name: "",
  description: "",
  price: 0,
  currency: CurrencyCode.ARS,
  features: [],
  highlight: false,
  badge: null,
  active: true,
};

const COUNTER_PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: PaymentMethod.CASH, label: "Efectivo" },
  { value: PaymentMethod.POSTNET, label: "Posnet" },
  { value: PaymentMethod.QR, label: "QR" },
  { value: PaymentMethod.BANK_TRANSFER, label: "Transferencia" },
];

function sanitizeGym(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "main";
  if (!/^[a-z0-9_-]{1,40}$/.test(normalized)) return "main";
  return normalized;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPlanLabel(planId: string) {
  const normalized = planId.trim().toUpperCase();
  if (normalized === "MONTHLY") return "Mensual";
  if (normalized === "QUARTERLY") return "Trimestral";
  if (normalized === "YEARLY") return "Anual";
  return planId;
}

const PLAN_STATS_SKELETON: Array<{ key: string; label: string }> = [
  { key: "MONTHLY", label: "Mensual" },
  { key: "QUARTERLY", label: "Trimestral" },
  { key: "YEARLY", label: "Anual" },
];

function getPlanMetricCount(source: Record<string, number>, planKey: string) {
  return source[planKey] ?? source[getPlanLabel(planKey)] ?? 0;
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]) {
  return values.join("\n");
}

function parsePrice(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPrivateOrLocalHost(hostname: string) {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.startsWith("192.168.")) return true;
  if (hostname.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("stats");
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statsRange, setStatsRange] = useState<AdminRange>("snapshot");

  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [site, setSite] = useState<AdminSiteSettings>(EMPTY_SITE);
  const [trainers, setTrainers] = useState<AdminTrainer[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [benefits, setBenefits] = useState<AdminBenefit[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [counterStudents, setCounterStudents] = useState<AdminCounterPaymentStudent[]>([]);
  const [counterSearchTerm, setCounterSearchTerm] = useState("");
  const [counterSelectedUserUuid, setCounterSelectedUserUuid] = useState("");
  const [counterPlanId, setCounterPlanId] = useState<PlanType>(PlanType.MONTHLY);
  const [counterPaymentMethod, setCounterPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [isCounterSearching, setIsCounterSearching] = useState(false);
  const [newTrainer, setNewTrainer] = useState<Omit<AdminTrainer, "id">>(EMPTY_TRAINER);
  const [newActivity, setNewActivity] = useState<Omit<AdminActivity, "id">>(EMPTY_ACTIVITY);
  const [newBenefit, setNewBenefit] = useState<Omit<AdminBenefit, "id">>(EMPTY_BENEFIT);
  const [newPlan, setNewPlan] = useState<AdminPlan>(EMPTY_PLAN);
  const [newPlanFeatureInput, setNewPlanFeatureInput] = useState("");
  const [planFeatureInputById, setPlanFeatureInputById] = useState<Record<string, string>>({});
  const [newActivityTrainerCandidate, setNewActivityTrainerCandidate] = useState("");
  const [activityTrainerCandidateById, setActivityTrainerCandidateById] = useState<Record<string, string>>({});
  const [newBranch, setNewBranch] = useState<Omit<AdminBranch, "id">>({
    code: "main",
    name: "",
    address: "",
    active: true,
  });

  const [gym, setGym] = useState("main");
  const [qrPayload, setQrPayload] = useState<AdminCheckInQrResponse | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const publicBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const { origin, hostname, protocol } = window.location;
    if (protocol !== "https:") return undefined;
    if (isPrivateOrLocalHost(hostname)) return undefined;
    return origin;
  }, []);

  const runGuard = () => {
    if (!isSessionReady) return false;
    if (!session) {
      router.replace("/login?origin=login_manual&next=/admin/dashboard");
      return false;
    }
    if (session.role !== UserRole.ADMIN) {
      setError("Este panel está habilitado solo para administradores.");
      return false;
    }
    return true;
  };

  const clearMessages = () => {
    setError(null);
    setNotice(null);
  };

  const loadStats = async (range: AdminRange = statsRange) => {
    if (!session) return;
    const result = await fetchAdminStats(session.accessToken, range);
    setStats(result);
  };

  const loadQr = async (gymLocation = "main") => {
    if (!session) return;
    setIsQrLoading(true);
    try {
      const payload = await fetchAdminCheckInQr(session.accessToken, gymLocation, publicBaseUrl);
      setQrPayload(payload);
      setGym(payload.gymLocation);
    } finally {
      setIsQrLoading(false);
    }
  };

  const loadAll = async () => {
    if (!session) return;
    setIsBootLoading(true);
    clearMessages();
    try {
      const [statsResponse, siteResponse, trainersResponse, activitiesResponse, benefitsResponse, plansResponse, branchesResponse] =
        await Promise.all([
          fetchAdminStats(session.accessToken, statsRange),
          fetchAdminSiteSettings(session.accessToken),
          fetchAdminTrainers(session.accessToken),
          fetchAdminActivities(session.accessToken),
          fetchAdminBenefits(session.accessToken),
          fetchAdminPlans(session.accessToken),
          fetchAdminBranches(session.accessToken),
        ]);
      setStats(statsResponse);
      setSite(siteResponse);
      setTrainers(trainersResponse);
      setActivities(activitiesResponse);
      setBenefits(benefitsResponse);
      setPlans(plansResponse);
      const sortedBranches = branchesResponse.sort((a, b) => a.name.localeCompare(b.name, "es"));
      setBranches(sortedBranches);
      const initialBranch = sortedBranches.find((item) => item.active)?.code ?? "main";
      await loadQr(initialBranch);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo cargar el dashboard.";
      if (message.includes("sesión expiró")) {
        router.replace("/login?origin=login_manual&next=/admin/dashboard");
        return;
      }
      setError(message);
    } finally {
      setIsBootLoading(false);
    }
  };

  useEffect(() => {
    const syncSession = () => {
      setSession(getSession());
      setIsSessionReady(true);
    };
    syncSession();
    window.addEventListener("auth-session-changed", syncSession);
    return () => window.removeEventListener("auth-session-changed", syncSession);
  }, []);

  useEffect(() => {
    if (!isSessionReady) return;
    if (!runGuard()) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionReady, session?.accessToken, session?.role]);

  const withSaving = async (work: () => Promise<void>, successMessage: string) => {
    if (!runGuard()) return;
    setIsSaving(true);
    clearMessages();
    try {
      await work();
      setNotice(successMessage);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo completar la acción.";
      if (message.includes("sesión expiró")) {
        router.replace("/login?origin=login_manual&next=/admin/dashboard");
        return;
      }
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const onLogout = () => {
    clearAuthFlowState();
    router.push("/");
  };

  const saveSite = async () => {
    await withSaving(async () => {
      if (!session) return;
      const updated = await updateAdminSiteSettings(session.accessToken, site);
      setSite(updated);
    }, "Datos del sitio actualizados.");
  };

  const createTrainerHandler = async () => {
    await withSaving(async () => {
      if (!session) return;
      const created = await createAdminTrainer(session.accessToken, newTrainer);
      setTrainers((prev) => [created, ...prev]);
      setNewTrainer(EMPTY_TRAINER);
    }, "Profesor creado.");
  };

  const saveTrainerHandler = async (trainer: AdminTrainer) => {
    await withSaving(async () => {
      if (!session) return;
      const updated = await updateAdminTrainer(session.accessToken, trainer.id, {
        name: trainer.name,
        bio: trainer.bio,
        avatarUrl: trainer.avatarUrl,
        active: trainer.active,
      });
      if (!updated) return;
      setTrainers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    }, "Profesor actualizado.");
  };

  const deleteTrainerHandler = async (trainerId: string) => {
    await withSaving(async () => {
      if (!session) return;
      await deleteAdminTrainer(session.accessToken, trainerId);
      setTrainers((prev) => prev.filter((item) => item.id !== trainerId));
      setActivities((prev) =>
        prev.map((activity) => ({
          ...activity,
          trainerIds: activity.trainerIds.filter((id) => id !== trainerId),
        })),
      );
    }, "Profesor eliminado.");
  };

  const createActivityHandler = async () => {
    await withSaving(async () => {
      if (!session) return;
      const payload = {
        ...newActivity,
        slug: toSlug(newActivity.name),
      };
      const created = await createAdminActivity(session.accessToken, payload);
      setActivities((prev) => [created, ...prev]);
      setNewActivity(EMPTY_ACTIVITY);
      setNewActivityTrainerCandidate("");
    }, "Actividad creada.");
  };

  const saveActivityHandler = async (activity: AdminActivity) => {
    await withSaving(async () => {
      if (!session) return;
      const updated = await updateAdminActivity(session.accessToken, activity.id, {
        slug: toSlug(activity.name),
        name: activity.name,
        shortDescription: activity.shortDescription,
        description: activity.description,
        cardImage: activity.cardImage,
        level: activity.level,
        duration: activity.duration,
        benefits: activity.benefits,
        schedule: activity.schedule,
        successCriteria: activity.successCriteria,
        trainerIds: activity.trainerIds,
        active: activity.active,
      });
      if (!updated) return;
      setActivities((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    }, "Actividad actualizada.");
  };

  const deleteActivityHandler = async (activityId: string) => {
    await withSaving(async () => {
      if (!session) return;
      await deleteAdminActivity(session.accessToken, activityId);
      setActivities((prev) => prev.filter((item) => item.id !== activityId));
      setActivityTrainerCandidateById((prev) => {
        const { [activityId]: _, ...next } = prev;
        return next;
      });
    }, "Actividad eliminada.");
  };

  const addTrainerToNewActivity = () => {
    const candidate = newActivityTrainerCandidate.trim();
    if (!candidate) return;
    if (newActivity.trainerIds.includes(candidate)) return;
    setNewActivity((prev) => ({
      ...prev,
      trainerIds: [...prev.trainerIds, candidate],
    }));
    setError(null);
    setNewActivityTrainerCandidate("");
  };

  const removeTrainerFromNewActivity = (trainerId: string) => {
    setNewActivity((prev) => ({ ...prev, trainerIds: prev.trainerIds.filter((id) => id !== trainerId) }));
  };

  const addTrainerToActivity = (activityId: string) => {
    const candidate = (activityTrainerCandidateById[activityId] ?? "").trim();
    if (!candidate) return;
    const currentActivity = activities.find((item) => item.id === activityId);
    if (!currentActivity) return;
    if (currentActivity.trainerIds.includes(candidate)) return;
    setActivities((prev) =>
      prev.map((item) =>
        item.id !== activityId
          ? item
          : {
              ...item,
              trainerIds: [...item.trainerIds, candidate],
            },
      ),
    );
    setError(null);
    setActivityTrainerCandidateById((prev) => ({ ...prev, [activityId]: "" }));
  };

  const removeTrainerFromActivity = (activityId: string, trainerId: string) => {
    setActivities((prev) =>
      prev.map((item) =>
        item.id === activityId ? { ...item, trainerIds: item.trainerIds.filter((id) => id !== trainerId) } : item,
      ),
    );
  };

  const createBenefitHandler = async () => {
    await withSaving(async () => {
      if (!session) return;
      const created = await createAdminBenefit(session.accessToken, newBenefit);
      setBenefits((prev) => [...prev, created]);
      setNewBenefit(EMPTY_BENEFIT);
    }, "Beneficio creado.");
  };

  const saveBenefitHandler = async (benefit: AdminBenefit) => {
    await withSaving(async () => {
      if (!session) return;
      const updated = await updateAdminBenefit(session.accessToken, benefit.id, {
        title: benefit.title,
        description: benefit.description,
        iconKey: benefit.iconKey,
        active: benefit.active,
      });
      if (!updated) return;
      setBenefits((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    }, "Beneficio actualizado.");
  };

  const deleteBenefitHandler = async (benefitId: string) => {
    await withSaving(async () => {
      if (!session) return;
      await deleteAdminBenefit(session.accessToken, benefitId);
      setBenefits((prev) => prev.filter((item) => item.id !== benefitId));
    }, "Beneficio eliminado.");
  };

  const addNewPlanFeature = () => {
    const nextFeature = newPlanFeatureInput.trim();
    if (!nextFeature) return;
    setNewPlan((prev) => ({
      ...prev,
      features: prev.features.includes(nextFeature) ? prev.features : [...prev.features, nextFeature],
    }));
    setNewPlanFeatureInput("");
  };

  const removeNewPlanFeature = (feature: string) => {
    setNewPlan((prev) => ({ ...prev, features: prev.features.filter((item) => item !== feature) }));
  };

  const addPlanFeature = (planId: string) => {
    const nextFeature = (planFeatureInputById[planId] ?? "").trim();
    if (!nextFeature) return;
    setPlans((prev) =>
      prev.map((item) =>
        item.id === planId
          ? { ...item, features: item.features.includes(nextFeature) ? item.features : [...item.features, nextFeature] }
          : item,
      ),
    );
    setPlanFeatureInputById((prev) => ({ ...prev, [planId]: "" }));
  };

  const removePlanFeature = (planId: string, feature: string) => {
    setPlans((prev) =>
      prev.map((item) => (item.id === planId ? { ...item, features: item.features.filter((entry) => entry !== feature) } : item)),
    );
  };

  const upsertPlanHandler = async (plan: AdminPlan, successMessage: string) => {
    await withSaving(async () => {
      if (!session) return;
      const payload: AdminPlan = {
        ...plan,
        id: plan.id.trim().toUpperCase(),
      };
      const updated = await upsertAdminPlan(session.accessToken, payload);
      setPlans((prev) => {
        const exists = prev.some((item) => item.id === updated.id);
        return exists ? prev.map((item) => (item.id === updated.id ? updated : item)) : [...prev, updated];
      });
      if (successMessage === "Plan creado.") setNewPlan(EMPTY_PLAN);
    }, successMessage);
  };

  const deletePlanHandler = async (id: string) => {
    await withSaving(async () => {
      if (!session) return;
      await deleteAdminPlan(session.accessToken, id);
      setPlans((prev) => prev.filter((item) => item.id !== id));
    }, "Plan dado de baja.");
  };

  const refreshStatsHandler = async () => {
    await withSaving(async () => {
      await loadStats(statsRange);
    }, "Estadísticas actualizadas.");
  };

  const onStatsRangeChange = async (nextRange: AdminRange) => {
    setStatsRange(nextRange);
    await withSaving(async () => {
      await loadStats(nextRange);
    }, `Estadísticas de ${STATS_RANGE_OPTIONS.find((item) => item.value === nextRange)?.label ?? "período"} actualizadas.`);
  };

  const createBranchHandler = async () => {
    await withSaving(async () => {
      if (!session) return;
      const created = await createAdminBranch(session.accessToken, {
        code: sanitizeGym(newBranch.code),
        name: newBranch.name.trim(),
        address: newBranch.address.trim(),
        active: newBranch.active,
      });
      setBranches((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setNewBranch({ code: "main", name: "", address: "", active: true });
    }, "Sede creada.");
  };

  const saveBranchHandler = async (branch: AdminBranch) => {
    await withSaving(async () => {
      if (!session) return;
      const updated = await updateAdminBranch(session.accessToken, branch.id, {
        code: sanitizeGym(branch.code),
        name: branch.name,
        address: branch.address,
        active: branch.active,
      });
      if (!updated) return;
      setBranches((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    }, "Sede actualizada.");
  };

  const deleteBranchHandler = async (branchId: string) => {
    await withSaving(async () => {
      if (!session) return;
      await deleteAdminBranch(session.accessToken, branchId);
      setBranches((prev) => prev.filter((item) => item.id !== branchId));
      const next = branches.find((item) => item.id !== branchId && item.active)?.code ?? "main";
      setGym(next);
      await loadQr(next);
    }, "Sede dada de baja.");
  };

  const copyCheckInUrl = async () => {
    if (!qrPayload?.checkInUrl) return;
    try {
      await navigator.clipboard.writeText(qrPayload.checkInUrl);
      setNotice("URL copiada.");
    } catch {
      setError("No se pudo copiar el enlace al portapapeles.");
    }
  };

  const searchCounterStudentsHandler = async () => {
    if (!runGuard() || !session) return;
    const normalized = counterSearchTerm.trim();
    if (normalized.length < 2) {
      setCounterStudents([]);
      setCounterSelectedUserUuid("");
      setError("Ingresá al menos 2 caracteres para buscar al alumno.");
      return;
    }

    setIsCounterSearching(true);
    clearMessages();
    try {
      const result = await searchAdminCounterPaymentStudents(session.accessToken, normalized);
      setCounterStudents(result.items);
      if (result.items.length === 0) {
        setCounterSelectedUserUuid("");
        setNotice("No encontramos alumnos con esa búsqueda.");
        return;
      }
      setCounterSelectedUserUuid((prev) => (result.items.some((item) => item.uuid === prev) ? prev : result.items[0].uuid));
      setNotice(`${result.items.length} alumno(s) encontrado(s).`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo buscar alumnos.";
      if (message.includes("sesión expiró")) {
        router.replace("/login?origin=login_manual&next=/admin/dashboard");
        return;
      }
      setError(message);
    } finally {
      setIsCounterSearching(false);
    }
  };

  const registerCounterPaymentHandler = async () => {
    await withSaving(async () => {
      if (!session) return;
      if (!counterSelectedUserUuid) {
        throw new Error("Seleccioná un alumno para registrar el pago.");
      }
      await registerAdminCounterPayment(session.accessToken, {
        userUuid: counterSelectedUserUuid,
        planId: counterPlanId,
        paymentMethod: counterPaymentMethod,
      });

      await loadStats(statsRange);
      await searchCounterStudentsHandler();
    }, "Pago físico registrado.");
  };

  if (!isSessionReady) {
    return (
      <main className={styles.page}>
        <section className={styles.sectionCard}>
          <p>Cargando sesión...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className={styles.page}>
        <section className={styles.sectionCard}>
          <p>Redirigiendo a login...</p>
        </section>
      </main>
    );
  }

  const trainerNameById = new Map(trainers.map((trainer) => [trainer.id, trainer.name]));
  const selectedCounterStudent =
    counterStudents.find((student) => student.uuid === counterSelectedUserUuid) ?? null;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Admin Dashboard</p>
            <h1>Gestión completa de gimnasio</h1>
            <p className={styles.headerSub}>Usuario: {session.email}</p>
          </div>
        </header>

        {session.role !== UserRole.ADMIN ? (
          <div className={styles.errorBox}>
            <p>{error ?? "No autorizado."}</p>
            <Link href="/">Volver al inicio</Link>
          </div>
        ) : (
          <div className={styles.workspace}>
            <aside className={styles.sideMenu}>
              <nav className={styles.tabBar} aria-label="Secciones del dashboard">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
              <button type="button" className={styles.logoutBtn} onClick={onLogout}>
                Cerrar sesión
              </button>
            </aside>
            <div className={styles.mainPane}>
            {(error || notice) && (
              <div className={styles.messageStack}>
                {error && <p className={styles.errorText}>{error}</p>}
                {notice && <p className={styles.noticeText}>{notice}</p>}
              </div>
            )}

            {isBootLoading ? (
              <section className={styles.sectionCard}>
                <p>Cargando panel de administración...</p>
              </section>
            ) : (
              <>
                {activeTab === "stats" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>Estadísticas actuales</h2>
                      <div className={styles.inlineActions}>
                        <select
                          value={statsRange}
                          onChange={(event) => onStatsRangeChange(event.target.value as AdminRange)}
                          disabled={isSaving}
                        >
                          {STATS_RANGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => refreshStatsHandler()}
                          disabled={isSaving}
                          className={styles.primaryButton}
                        >
                          {isSaving ? "Actualizando..." : "Actualizar"}
                        </button>
                      </div>
                    </div>

                    {stats ? (
                      <>
                        <div className={styles.metricRow}>
                          <article className={styles.metricCard}>
                            <span>Total usuarios</span>
                            <strong>{stats.totals.users}</strong>
                          </article>
                          <article className={styles.metricCard}>
                            <span>Usuarios activos</span>
                            <strong>{stats.totals.activeUsers}</strong>
                          </article>
                        </div>
                        <div className={styles.metricRow}>
                          <article className={styles.metricCard}>
                            <span>Suscripciones activas</span>
                            <strong>{stats.totals.activeSubscriptions}</strong>
                          </article>
                          <article className={styles.metricCard}>
                            <span>Pagos únicos</span>
                            <strong>{stats.totals.oneTimePaidUsers}</strong>
                          </article>
                        </div>
                        {stats.range !== "snapshot" && (
                          <div className={styles.metricRow}>
                            <article className={styles.metricCard}>
                              <span>Dejaron de pagar</span>
                              <strong>{stats.period.usersStoppedPaying}</strong>
                            </article>
                            <article className={styles.metricCard}>
                              <span>Bajas de suscripción</span>
                              <strong>{stats.period.usersCancelled}</strong>
                            </article>
                          </div>
                        )}

                        <div className={styles.splitGrid}>
                          <article className={styles.subCard}>
                            <h3>Suscriptos por plan</h3>
                            <ul>
                              {PLAN_STATS_SKELETON.map((plan) => (
                                <li key={`sub-${plan.key}`}>
                                  <span>{plan.label}</span>
                                  <strong>{getPlanMetricCount(stats.subscriptionsByPlan, plan.key)}</strong>
                                </li>
                              ))}
                            </ul>
                          </article>
                          <article className={styles.subCard}>
                            <h3>Pagos únicos por plan</h3>
                            <ul>
                              {PLAN_STATS_SKELETON.map((plan) => (
                                <li key={`otp-${plan.key}`}>
                                  <span>{plan.label}</span>
                                  <strong>{getPlanMetricCount(stats.oneTimeByPlan, plan.key)}</strong>
                                </li>
                              ))}
                            </ul>
                          </article>
                        </div>
                      </>
                    ) : (
                      <p>No hay estadísticas disponibles.</p>
                    )}
                  </section>
                )}

                {activeTab === "counterPayments" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>Registro de pagos únicos en mostrador</h2>
                    </div>
                    <p className={styles.muted}>
                      Buscá el alumno ya registrado, elegí período y forma de pago para registrar el cobro presencial.
                    </p>

                    <article className={styles.editorCard}>
                      <h3>1. Buscar alumno</h3>
                      <div className={styles.rowInline}>
                        <input
                          value={counterSearchTerm}
                          placeholder="Nombre, apellido, email o teléfono"
                          onChange={(event) => setCounterSearchTerm(event.target.value)}
                        />
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={searchCounterStudentsHandler}
                          disabled={isCounterSearching || isSaving}
                        >
                          {isCounterSearching ? "Buscando..." : "Buscar"}
                        </button>
                      </div>

                      {counterStudents.length > 0 ? (
                        <div className={styles.formGrid2}>
                          <label className={styles.span2}>
                            Alumno
                            <select
                              value={counterSelectedUserUuid}
                              onChange={(event) => setCounterSelectedUserUuid(event.target.value)}
                            >
                              {counterStudents.map((student) => (
                                <option key={student.uuid} value={student.uuid}>
                                  {student.fullName} · {student.email}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <p className={styles.muted}>Sin resultados de búsqueda.</p>
                      )}
                    </article>

                    <article className={styles.editorCard}>
                      <h3>2. Registrar pago</h3>
                      <div className={styles.formGrid2}>
                        <label>
                          Período a abonar
                          <select value={counterPlanId} onChange={(event) => setCounterPlanId(event.target.value as PlanType)}>
                            <option value={PlanType.MONTHLY}>Mensual</option>
                            <option value={PlanType.QUARTERLY}>Trimestral</option>
                            <option value={PlanType.YEARLY}>Anual</option>
                          </select>
                        </label>
                        <label>
                          Medio de pago
                          <select
                            value={counterPaymentMethod}
                            onChange={(event) => setCounterPaymentMethod(event.target.value as PaymentMethod)}
                          >
                            {COUNTER_PAYMENT_METHOD_OPTIONS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {selectedCounterStudent && (
                        <p className={styles.muted}>
                          Alumno seleccionado: <strong>{selectedCounterStudent.fullName}</strong> · {selectedCounterStudent.email}
                          {selectedCounterStudent.hasActiveSubscription && selectedCounterStudent.activeSubscriptionEndDate
                            ? ` · Suscripción activa hasta ${new Date(selectedCounterStudent.activeSubscriptionEndDate).toLocaleDateString("es-AR")}`
                            : ""}
                        </p>
                      )}

                      <div className={styles.rowEnd}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={isSaving || !counterSelectedUserUuid}
                          onClick={registerCounterPaymentHandler}
                        >
                          {isSaving ? "Registrando..." : "Registrar pago único"}
                        </button>
                      </div>
                    </article>
                  </section>
                )}

                {activeTab === "site" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>Datos del gimnasio y Hero</h2>
                    </div>

                    <div className={styles.formGrid2}>
                      <label>
                        Badge Hero
                        <input
                          value={site.heroBadge}
                          onChange={(event) => setSite((prev) => ({ ...prev, heroBadge: event.target.value }))}
                        />
                      </label>
                      <label>
                        Nombre gimnasio
                        <input
                          value={site.gymName}
                          onChange={(event) => setSite((prev) => ({ ...prev, gymName: event.target.value }))}
                        />
                      </label>
                      <label className={styles.span2}>
                        Título Hero
                        <input
                          value={site.heroTitle}
                          onChange={(event) => setSite((prev) => ({ ...prev, heroTitle: event.target.value }))}
                        />
                      </label>
                      <label className={styles.span2}>
                        Subtítulo Hero
                        <textarea
                          rows={3}
                          value={site.heroSubtitle}
                          onChange={(event) => setSite((prev) => ({ ...prev, heroSubtitle: event.target.value }))}
                        />
                      </label>
                      <label className={styles.span2}>
                        URL imagen Hero
                        <input
                          value={site.heroBackgroundImage}
                          onChange={(event) => setSite((prev) => ({ ...prev, heroBackgroundImage: event.target.value }))}
                        />
                      </label>
                      <label>
                        Email contacto
                        <input
                          value={site.gymEmail}
                          onChange={(event) => setSite((prev) => ({ ...prev, gymEmail: event.target.value }))}
                        />
                      </label>
                      <label>
                        Teléfono contacto
                        <input
                          value={site.gymPhone}
                          onChange={(event) => setSite((prev) => ({ ...prev, gymPhone: event.target.value }))}
                        />
                      </label>
                      <label className={styles.span2}>
                        Dirección
                        <input
                          value={site.gymAddress}
                          onChange={(event) => setSite((prev) => ({ ...prev, gymAddress: event.target.value }))}
                        />
                      </label>
                    </div>

                    <div className={styles.rowEnd}>
                      <button type="button" className={styles.primaryButton} onClick={saveSite} disabled={isSaving}>
                        {isSaving ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </section>
                )}

                {activeTab === "trainers" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>Profesores</h2>
                    </div>
                    <article className={styles.editorCard}>
                      <h3>Alta de profesor</h3>
                      <div className={styles.formGrid2}>
                        <label>
                          Nombre
                          <input
                            value={newTrainer.name}
                            onChange={(event) => setNewTrainer((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        </label>
                        <label>
                          URL avatar
                          <input
                            value={newTrainer.avatarUrl}
                            onChange={(event) => setNewTrainer((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                          />
                        </label>
                        <label className={styles.span2}>
                          Bio
                          <textarea
                            rows={2}
                            value={newTrainer.bio}
                            onChange={(event) => setNewTrainer((prev) => ({ ...prev, bio: event.target.value }))}
                          />
                        </label>
                        <label className={styles.checkboxField}>
                          <input
                            type="checkbox"
                            checked={newTrainer.active}
                            onChange={(event) => setNewTrainer((prev) => ({ ...prev, active: event.target.checked }))}
                          />
                          Activo
                        </label>
                      </div>
                      <div className={styles.rowEnd}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={isSaving || !newTrainer.name.trim()}
                          onClick={createTrainerHandler}
                        >
                          Crear profesor
                        </button>
                      </div>
                    </article>

                    <div className={styles.stack}>
                      {trainers.map((trainer) => (
                        <article key={trainer.id} className={styles.editorCard}>
                          <div className={styles.formGrid2}>
                            <label>
                              Nombre
                              <input
                                value={trainer.name}
                                onChange={(event) =>
                                  setTrainers((prev) =>
                                    prev.map((item) =>
                                      item.id === trainer.id ? { ...item, name: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              URL avatar
                              <input
                                value={trainer.avatarUrl}
                                onChange={(event) =>
                                  setTrainers((prev) =>
                                    prev.map((item) =>
                                      item.id === trainer.id ? { ...item, avatarUrl: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.span2}>
                              Bio
                              <textarea
                                rows={2}
                                value={trainer.bio}
                                onChange={(event) =>
                                  setTrainers((prev) =>
                                    prev.map((item) =>
                                      item.id === trainer.id ? { ...item, bio: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.checkboxField}>
                              <input
                                type="checkbox"
                                checked={trainer.active}
                                onChange={(event) =>
                                  setTrainers((prev) =>
                                    prev.map((item) =>
                                      item.id === trainer.id ? { ...item, active: event.target.checked } : item,
                                    ),
                                  )
                                }
                              />
                              Activo
                            </label>
                          </div>
                          <div className={styles.rowEnd}>
                            <button
                              type="button"
                              className={styles.primaryButton}
                              disabled={isSaving}
                              onClick={() => saveTrainerHandler(trainer)}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              disabled={isSaving}
                              onClick={() => deleteTrainerHandler(trainer.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {activeTab === "activities" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>Actividades</h2>
                    </div>

                    <article className={styles.editorCard}>
                      <h3>Alta de actividad</h3>
                      <div className={styles.formGrid2}>
                        <label>
                          Nombre
                              <input
                                value={newActivity.name}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setNewActivity((prev) => ({
                                    ...prev,
                                    name: value,
                                    slug: toSlug(value),
                                  }));
                                  setNewActivityTrainerCandidate("");
                                }}
                              />
                        </label>
                        <label>
                          Slug (interno, no editable)
                          <input value={newActivity.name ? toSlug(newActivity.name) : ""} readOnly />
                          <span className={styles.muted}>Se genera automáticamente desde el nombre.</span>
                        </label>
                        <label className={styles.span2}>
                          Descripción corta
                          <input
                            value={newActivity.shortDescription}
                            onChange={(event) => setNewActivity((prev) => ({ ...prev, shortDescription: event.target.value }))}
                          />
                        </label>
                        <label className={styles.span2}>
                          Descripción completa
                          <textarea
                            rows={3}
                            value={newActivity.description}
                            onChange={(event) => setNewActivity((prev) => ({ ...prev, description: event.target.value }))}
                          />
                        </label>
                        <label>
                          Nivel
                          <input
                            value={newActivity.level}
                            onChange={(event) => setNewActivity((prev) => ({ ...prev, level: event.target.value }))}
                          />
                        </label>
                        <label>
                          Duración
                          <input
                            value={newActivity.duration}
                            onChange={(event) => setNewActivity((prev) => ({ ...prev, duration: event.target.value }))}
                          />
                        </label>
                        <label className={styles.span2}>
                          URL imagen
                          <input
                            value={newActivity.cardImage}
                            onChange={(event) => setNewActivity((prev) => ({ ...prev, cardImage: event.target.value }))}
                          />
                        </label>
                        <label>
                          Beneficios (uno por línea)
                          <textarea
                            rows={4}
                            value={joinLines(newActivity.benefits)}
                            onChange={(event) => setNewActivity((prev) => ({ ...prev, benefits: parseLines(event.target.value) }))}
                          />
                        </label>
                        <label>
                          Horarios (uno por línea)
                          <textarea
                            rows={4}
                            value={joinLines(newActivity.schedule)}
                            onChange={(event) => setNewActivity((prev) => ({ ...prev, schedule: parseLines(event.target.value) }))}
                          />
                        </label>
                        <label className={styles.span2}>
                          Qué necesitamos de vos (uno por línea)
                          <textarea
                            rows={4}
                            value={joinLines(newActivity.successCriteria)}
                            onChange={(event) =>
                              setNewActivity((prev) => ({ ...prev, successCriteria: parseLines(event.target.value) }))
                            }
                          />
                        </label>
                        <label className={styles.span2}>
                          Profesores asignados
                            <div className={styles.listEditor}>
                              <div className={styles.listEditorInputRow}>
                                <select
                                  value={newActivityTrainerCandidate}
                                  onChange={(event) => setNewActivityTrainerCandidate(event.target.value)}
                                >
                                  <option value="">Seleccionar profesor</option>
                                  {trainers
                                    .filter((trainer) => !newActivity.trainerIds.includes(trainer.id))
                                    .map((trainer) => (
                                      <option key={trainer.id} value={trainer.id}>
                                        {trainer.name}
                                      </option>
                                    ))}
                                </select>
                                <button type="button" className={styles.ghostButton} onClick={addTrainerToNewActivity}>
                                  Agregar
                                </button>
                            </div>
                            <ul className={styles.listEditorList}>
                              {newActivity.trainerIds.map((trainerId) => (
                                <li key={`new-activity-${trainerId}`}>
                                  <span>{trainerNameById.get(trainerId) ?? "Profesor sin nombre"}</span>
                                  <button
                                    type="button"
                                    className={styles.listEditorRemove}
                                    onClick={() => removeTrainerFromNewActivity(trainerId)}
                                  >
                                    Quitar
                                  </button>
                                </li>
                              ))}
                              {newActivity.trainerIds.length === 0 && <li className={styles.muted}>Sin profesores asignados.</li>}
                            </ul>
                          </div>
                        </label>
                        <label className={styles.checkboxField}>
                          <input
                            type="checkbox"
                            checked={newActivity.active}
                            onChange={(event) => setNewActivity((prev) => ({ ...prev, active: event.target.checked }))}
                          />
                          Activa
                        </label>
                      </div>
                      <div className={styles.rowEnd}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={isSaving || !newActivity.name.trim()}
                          onClick={createActivityHandler}
                        >
                          Crear actividad
                        </button>
                      </div>
                    </article>

                    <div className={styles.stack}>
                      {activities.map((activity) => (
                        <article key={activity.id} className={styles.editorCard}>
                          <div className={styles.formGrid2}>
                            <label>
                              Nombre
                              <input
                                value={activity.name}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, name: value, slug: toSlug(value) } : item,
                                    ),
                                  );
                                  setActivityTrainerCandidateById((prev) => ({ ...prev, [activity.id]: "" }));
                                }}
                              />
                            </label>
                            <label>
                              Slug (interno, no editable)
                              <input value={toSlug(activity.name)} readOnly />
                            </label>
                            <label className={styles.span2}>
                              Descripción corta
                              <input
                                value={activity.shortDescription}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, shortDescription: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.span2}>
                              Descripción completa
                              <textarea
                                rows={3}
                                value={activity.description}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, description: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Nivel
                              <input
                                value={activity.level}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, level: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Duración
                              <input
                                value={activity.duration}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, duration: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.span2}>
                              URL imagen
                              <input
                                value={activity.cardImage}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, cardImage: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Beneficios (uno por línea)
                              <textarea
                                rows={4}
                                value={joinLines(activity.benefits)}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, benefits: parseLines(event.target.value) } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Horarios (uno por línea)
                              <textarea
                                rows={4}
                                value={joinLines(activity.schedule)}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, schedule: parseLines(event.target.value) } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.span2}>
                              Qué necesitamos de vos (uno por línea)
                              <textarea
                                rows={4}
                                value={joinLines(activity.successCriteria)}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id
                                        ? { ...item, successCriteria: parseLines(event.target.value) }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.span2}>
                              Profesores asignados
                              <div className={styles.listEditor}>
                                <div className={styles.listEditorInputRow}>
                                  <select
                                    value={activityTrainerCandidateById[activity.id] ?? ""}
                                    onChange={(event) =>
                                      setActivityTrainerCandidateById((prev) => ({ ...prev, [activity.id]: event.target.value }))
                                    }
                                  >
                                    <option value="">Seleccionar profesor</option>
                                    {trainers
                                      .filter((trainer) => !activity.trainerIds.includes(trainer.id))
                                      .map((trainer) => (
                                        <option key={trainer.id} value={trainer.id}>
                                          {trainer.name}
                                        </option>
                                      ))}
                                  </select>
                                  <button type="button" className={styles.ghostButton} onClick={() => addTrainerToActivity(activity.id)}>
                                    Agregar
                                  </button>
                                </div>
                                <ul className={styles.listEditorList}>
                                  {activity.trainerIds.map((trainerId) => (
                                    <li key={`${activity.id}-${trainerId}`}>
                                      <span>{trainerNameById.get(trainerId) ?? "Profesor sin nombre"}</span>
                                      <button
                                        type="button"
                                        className={styles.listEditorRemove}
                                        onClick={() => removeTrainerFromActivity(activity.id, trainerId)}
                                      >
                                        Quitar
                                      </button>
                                    </li>
                                  ))}
                                  {activity.trainerIds.length === 0 && <li className={styles.muted}>Sin profesores asignados.</li>}
                                </ul>
                              </div>
                            </label>
                            <label className={styles.checkboxField}>
                              <input
                                type="checkbox"
                                checked={activity.active}
                                onChange={(event) =>
                                  setActivities((prev) =>
                                    prev.map((item) =>
                                      item.id === activity.id ? { ...item, active: event.target.checked } : item,
                                    ),
                                  )
                                }
                              />
                              Activa
                            </label>
                          </div>
                          <div className={styles.rowEnd}>
                            <span className={styles.muted}>
                              Profesores:{" "}
                              {activity.trainerIds.map((id) => trainerNameById.get(id)).filter(Boolean).join(", ") || "Sin asignar"}
                            </span>
                            <button
                              type="button"
                              className={styles.primaryButton}
                              disabled={isSaving}
                              onClick={() => saveActivityHandler(activity)}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              disabled={isSaving}
                              onClick={() => deleteActivityHandler(activity.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {activeTab === "benefits" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>Beneficios</h2>
                    </div>
                    <article className={styles.editorCard}>
                      <h3>Alta de beneficio</h3>
                      <div className={styles.formGrid2}>
                        <label>
                          Título
                          <input
                            value={newBenefit.title}
                            onChange={(event) => setNewBenefit((prev) => ({ ...prev, title: event.target.value }))}
                          />
                        </label>
                        <label>
                          Clave de ícono
                          <select
                            value={newBenefit.iconKey}
                            onChange={(event) => setNewBenefit((prev) => ({ ...prev, iconKey: event.target.value }))}
                          >
                            {BENEFIT_ICON_OPTIONS.map((iconKey) => (
                              <option key={iconKey} value={iconKey}>
                                {iconKey}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={styles.span2}>
                          Descripción
                          <textarea
                            rows={3}
                            value={newBenefit.description}
                            onChange={(event) => setNewBenefit((prev) => ({ ...prev, description: event.target.value }))}
                          />
                        </label>
                        <label className={styles.checkboxField}>
                          <input
                            type="checkbox"
                            checked={newBenefit.active}
                            onChange={(event) => setNewBenefit((prev) => ({ ...prev, active: event.target.checked }))}
                          />
                          Activo
                        </label>
                        <p className={styles.muted}>Íconos disponibles: {BENEFIT_ICON_OPTIONS.join(", ")}</p>
                      </div>
                      <div className={styles.rowEnd}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={isSaving || !newBenefit.title.trim()}
                          onClick={createBenefitHandler}
                        >
                          Crear beneficio
                        </button>
                      </div>
                    </article>

                    <div className={styles.stack}>
                      {benefits.map((benefit) => (
                        <article key={benefit.id} className={styles.editorCard}>
                          <div className={styles.formGrid2}>
                            <label>
                              Título
                              <input
                                value={benefit.title}
                                onChange={(event) =>
                                  setBenefits((prev) =>
                                    prev.map((item) =>
                                      item.id === benefit.id ? { ...item, title: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Clave de ícono
                              <select
                                value={benefit.iconKey}
                                onChange={(event) =>
                                  setBenefits((prev) =>
                                    prev.map((item) =>
                                      item.id === benefit.id ? { ...item, iconKey: event.target.value } : item,
                                    ),
                                  )
                                }
                              >
                                {BENEFIT_ICON_OPTIONS.map((iconKey) => (
                                  <option key={iconKey} value={iconKey}>
                                    {iconKey}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className={styles.span2}>
                              Descripción
                              <textarea
                                rows={3}
                                value={benefit.description}
                                onChange={(event) =>
                                  setBenefits((prev) =>
                                    prev.map((item) =>
                                      item.id === benefit.id ? { ...item, description: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.checkboxField}>
                              <input
                                type="checkbox"
                                checked={benefit.active}
                                onChange={(event) =>
                                  setBenefits((prev) =>
                                    prev.map((item) =>
                                      item.id === benefit.id ? { ...item, active: event.target.checked } : item,
                                    ),
                                  )
                                }
                              />
                              Activo
                            </label>
                          </div>
                          <div className={styles.rowEnd}>
                            <button
                              type="button"
                              className={styles.primaryButton}
                              disabled={isSaving}
                              onClick={() => saveBenefitHandler(benefit)}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              disabled={isSaving}
                              onClick={() => deleteBenefitHandler(benefit.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {activeTab === "plans" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>Planes</h2>
                    </div>

                    <article className={styles.editorCard}>
                      <h3>Alta de plan</h3>
                      <div className={styles.formGrid2}>
                        <label>
                          ID (ej: MONTHLY)
                          <input
                            value={newPlan.id}
                            onChange={(event) => setNewPlan((prev) => ({ ...prev, id: event.target.value.toUpperCase() }))}
                          />
                        </label>
                        <label>
                          Nombre
                          <input
                            value={newPlan.name}
                            onChange={(event) => setNewPlan((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        </label>
                        <label className={styles.span2}>
                          Descripción
                          <textarea
                            rows={2}
                            value={newPlan.description}
                            onChange={(event) => setNewPlan((prev) => ({ ...prev, description: event.target.value }))}
                          />
                        </label>
                        <label>
                          Precio
                          <input
                            type="number"
                            value={newPlan.price}
                            onChange={(event) => setNewPlan((prev) => ({ ...prev, price: parsePrice(event.target.value) }))}
                          />
                        </label>
                        <label>
                          Moneda
                          <select
                            value={newPlan.currency}
                            onChange={(event) =>
                              setNewPlan((prev) => ({ ...prev, currency: event.target.value as CurrencyCode }))
                            }
                          >
                            {Object.values(CurrencyCode).map((currency) => (
                              <option key={currency} value={currency}>
                                {currency}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Badge
                          <input
                            value={newPlan.badge ?? ""}
                            onChange={(event) =>
                              setNewPlan((prev) => ({ ...prev, badge: event.target.value.trim() || null }))
                            }
                          />
                        </label>
                        <label className={styles.checkboxField}>
                          <input
                            type="checkbox"
                            checked={newPlan.highlight}
                            onChange={(event) => setNewPlan((prev) => ({ ...prev, highlight: event.target.checked }))}
                          />
                          Destacado
                        </label>
                        <label className={styles.checkboxField}>
                          <input
                            type="checkbox"
                            checked={newPlan.active}
                            onChange={(event) => setNewPlan((prev) => ({ ...prev, active: event.target.checked }))}
                          />
                          Activo
                        </label>
                        <label className={styles.span2}>
                          Features del plan
                          <div className={styles.listEditor}>
                            <div className={styles.listEditorInputRow}>
                              <input
                                value={newPlanFeatureInput}
                                placeholder="Agregar feature"
                                onChange={(event) => setNewPlanFeatureInput(event.target.value)}
                              />
                              <button type="button" className={styles.ghostButton} onClick={addNewPlanFeature}>
                                Agregar
                              </button>
                            </div>
                            <ul className={styles.listEditorList}>
                              {newPlan.features.map((feature) => (
                                <li key={feature}>
                                  <span>{feature}</span>
                                  <button
                                    type="button"
                                    className={styles.listEditorRemove}
                                    onClick={() => removeNewPlanFeature(feature)}
                                  >
                                    Quitar
                                  </button>
                                </li>
                              ))}
                              {newPlan.features.length === 0 && <li className={styles.muted}>Sin features cargados.</li>}
                            </ul>
                          </div>
                        </label>
                      </div>
                      <div className={styles.rowEnd}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={isSaving || !newPlan.id.trim() || !newPlan.name.trim()}
                          onClick={() => upsertPlanHandler(newPlan, "Plan creado.")}
                        >
                          Crear plan
                        </button>
                      </div>
                    </article>

                    <div className={styles.stack}>
                      {plans.map((plan) => (
                        <article key={plan.id} className={styles.editorCard}>
                          <div className={styles.formGrid2}>
                            <label>
                              ID
                              <input value={plan.id} disabled />
                            </label>
                            <label>
                              Nombre
                              <input
                                value={plan.name}
                                onChange={(event) =>
                                  setPlans((prev) =>
                                    prev.map((item) =>
                                      item.id === plan.id ? { ...item, name: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.span2}>
                              Descripción
                              <textarea
                                rows={2}
                                value={plan.description}
                                onChange={(event) =>
                                  setPlans((prev) =>
                                    prev.map((item) =>
                                      item.id === plan.id ? { ...item, description: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Precio
                              <input
                                type="number"
                                value={plan.price}
                                onChange={(event) =>
                                  setPlans((prev) =>
                                    prev.map((item) =>
                                      item.id === plan.id ? { ...item, price: parsePrice(event.target.value) } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Moneda
                              <select
                                value={plan.currency}
                                onChange={(event) =>
                                  setPlans((prev) =>
                                    prev.map((item) =>
                                      item.id === plan.id ? { ...item, currency: event.target.value as CurrencyCode } : item,
                                    ),
                                  )
                                }
                              >
                                {Object.values(CurrencyCode).map((currency) => (
                                  <option key={currency} value={currency}>
                                    {currency}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Badge
                              <input
                                value={plan.badge ?? ""}
                                onChange={(event) =>
                                  setPlans((prev) =>
                                    prev.map((item) =>
                                      item.id === plan.id ? { ...item, badge: event.target.value.trim() || null } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.checkboxField}>
                              <input
                                type="checkbox"
                                checked={plan.highlight}
                                onChange={(event) =>
                                  setPlans((prev) =>
                                    prev.map((item) =>
                                      item.id === plan.id ? { ...item, highlight: event.target.checked } : item,
                                    ),
                                  )
                                }
                              />
                              Destacado
                            </label>
                            <label className={styles.checkboxField}>
                              <input
                                type="checkbox"
                                checked={plan.active}
                                onChange={(event) =>
                                  setPlans((prev) =>
                                    prev.map((item) =>
                                      item.id === plan.id ? { ...item, active: event.target.checked } : item,
                                    ),
                                  )
                                }
                              />
                              Activo
                            </label>
                            <label className={styles.span2}>
                              Features del plan
                              <div className={styles.listEditor}>
                                <div className={styles.listEditorInputRow}>
                                  <input
                                    value={planFeatureInputById[plan.id] ?? ""}
                                    placeholder="Agregar feature"
                                    onChange={(event) =>
                                      setPlanFeatureInputById((prev) => ({ ...prev, [plan.id]: event.target.value }))
                                    }
                                  />
                                  <button type="button" className={styles.ghostButton} onClick={() => addPlanFeature(plan.id)}>
                                    Agregar
                                  </button>
                                </div>
                                <ul className={styles.listEditorList}>
                                  {plan.features.map((feature) => (
                                    <li key={`${plan.id}-${feature}`}>
                                      <span>{feature}</span>
                                      <button
                                        type="button"
                                        className={styles.listEditorRemove}
                                        onClick={() => removePlanFeature(plan.id, feature)}
                                      >
                                        Quitar
                                      </button>
                                    </li>
                                  ))}
                                  {plan.features.length === 0 && <li className={styles.muted}>Sin features cargados.</li>}
                                </ul>
                              </div>
                            </label>
                          </div>
                          <div className={styles.rowEnd}>
                            <button
                              type="button"
                              className={styles.primaryButton}
                              disabled={isSaving}
                              onClick={() => upsertPlanHandler(plan, "Plan actualizado.")}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              disabled={isSaving}
                              onClick={() => deletePlanHandler(plan.id)}
                            >
                              Dar de baja
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {activeTab === "qr" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>QR Check-in del día</h2>
                    </div>
                    <label htmlFor="gym">Sede</label>
                    <div className={styles.rowInline}>
                      <select
                        id="gym"
                        value={gym}
                        onChange={async (event) => {
                          const next = sanitizeGym(event.target.value);
                          setGym(next);
                          await loadQr(next);
                        }}
                      >
                        {branches
                          .filter((item) => item.active)
                          .map((branch) => (
                          <option key={branch.id} value={branch.code}>
                            {branch.name} ({branch.code})
                          </option>
                          ))}
                        {branches.filter((item) => item.active).length === 0 && <option value="main">main</option>}
                      </select>
                      {isQrLoading ? <span className={styles.muted}>Actualizando QR...</span> : null}
                    </div>

                    {qrPayload && (
                      <div className={styles.qrContainer}>
                        <img src={qrPayload.qrImageUrl} alt={`QR check-in sede ${qrPayload.gymLocation}`} width={320} height={320} />
                        <p>
                          URL: <code>{qrPayload.checkInUrl}</code>
                        </p>
                        <p>
                          Generado: <strong>{new Date(qrPayload.generatedAt).toLocaleString("es-AR")}</strong>
                        </p>
                        <div className={styles.rowInline}>
                          <button type="button" className={styles.primaryButton} onClick={copyCheckInUrl}>
                            Copiar URL
                          </button>
                          <a href={qrPayload.qrImageUrl} target="_blank" rel="noreferrer" className={styles.ghostButton}>
                            Abrir QR
                          </a>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeTab === "branches" && (
                  <section className={styles.sectionCard}>
                    <div className={styles.sectionHead}>
                      <h2>Sedes</h2>
                    </div>
                    <article className={styles.editorCard}>
                      <h3>Alta de sede</h3>
                      <div className={styles.formGrid2}>
                        <label>
                          Código (ej: main, centro)
                          <input
                            value={newBranch.code}
                            onChange={(event) =>
                              setNewBranch((prev) => ({ ...prev, code: sanitizeGym(event.target.value) }))
                            }
                          />
                        </label>
                        <label>
                          Nombre
                          <input
                            value={newBranch.name}
                            onChange={(event) => setNewBranch((prev) => ({ ...prev, name: event.target.value }))}
                          />
                        </label>
                        <label className={styles.span2}>
                          Dirección
                          <input
                            value={newBranch.address}
                            onChange={(event) => setNewBranch((prev) => ({ ...prev, address: event.target.value }))}
                          />
                        </label>
                        <label className={styles.checkboxField}>
                          <input
                            type="checkbox"
                            checked={newBranch.active}
                            onChange={(event) => setNewBranch((prev) => ({ ...prev, active: event.target.checked }))}
                          />
                          Activa
                        </label>
                      </div>
                      <div className={styles.rowEnd}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={isSaving || !newBranch.code.trim() || !newBranch.name.trim()}
                          onClick={createBranchHandler}
                        >
                          Crear sede
                        </button>
                      </div>
                    </article>

                    <div className={styles.stack}>
                      {branches.map((branch) => (
                        <article key={branch.id} className={styles.editorCard}>
                          <div className={styles.formGrid2}>
                            <label>
                              Código
                              <input
                                value={branch.code}
                                onChange={(event) =>
                                  setBranches((prev) =>
                                    prev.map((item) =>
                                      item.id === branch.id ? { ...item, code: sanitizeGym(event.target.value) } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label>
                              Nombre
                              <input
                                value={branch.name}
                                onChange={(event) =>
                                  setBranches((prev) =>
                                    prev.map((item) =>
                                      item.id === branch.id ? { ...item, name: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.span2}>
                              Dirección
                              <input
                                value={branch.address}
                                onChange={(event) =>
                                  setBranches((prev) =>
                                    prev.map((item) =>
                                      item.id === branch.id ? { ...item, address: event.target.value } : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <label className={styles.checkboxField}>
                              <input
                                type="checkbox"
                                checked={branch.active}
                                onChange={(event) =>
                                  setBranches((prev) =>
                                    prev.map((item) =>
                                      item.id === branch.id ? { ...item, active: event.target.checked } : item,
                                    ),
                                  )
                                }
                              />
                              Activa
                            </label>
                          </div>
                          <div className={styles.rowEnd}>
                            <button
                              type="button"
                              className={styles.primaryButton}
                              disabled={isSaving}
                              onClick={() => saveBranchHandler(branch)}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              disabled={isSaving}
                              onClick={() => deleteBranchHandler(branch.id)}
                            >
                              Dar de baja
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
