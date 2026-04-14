"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  User, Mail, Lock, Bell, Palette, CreditCard, Target,
  Share2, Plug, Trash2, Copy, Check, Plus, ChevronRight,
  Globe, DollarSign, Shield, Download, Eye, EyeOff,
  AlertTriangle, LogOut,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateUserProfile, deleteUserAccount, updateIncomeGoal, updatePublicPageSettings,
  getWebhooks, updateWebhooks,
} from "@/lib/data/user";
import { getIncomeEntries } from "@/lib/data/income";
import { exportIncomeCSV, exportExpensesCSV, exportTimeEntriesCSV } from "@/lib/csv";
import { generateTaxReportPDF } from "@/lib/pdf";
import { formatCurrency } from "@/lib/calculations";
import { getExpenses } from "@/lib/data/expenses";
import { getTimeEntries } from "@/lib/data/time";
import { getClients } from "@/lib/data/clients";
import { getProjects } from "@/lib/data/projects";
import { getProposals } from "@/lib/data/proposals";
import { getContracts } from "@/lib/data/contracts";
import { getLeads } from "@/lib/data/leads";
import { getReminderLogs } from "@/lib/data/reminders";
import {
  getSubscription, cancelSubscription, createBillingPortalSession, getInvoices,
  type UserSubscription, type Invoice as BillingInvoice,
} from "@/lib/data/billing";
import { changePassword, deleteUserRecord, login } from "@/lib/auth";
import { getPaymentInfo, savePaymentInfo, type PaymentInfo } from "@/lib/data/payment-info";
import { getNotifPrefs, saveNotifPrefs } from "@/lib/data/notification-prefs";
import { getAppearancePrefs, saveAppearancePrefs, type AppearancePrefs } from "@/lib/data/appearance-prefs";
import { useAuth } from "@/lib/context/AuthContext";
import { useAlerts } from "@/lib/context/AlertContext";
import { useToast } from "@/lib/context/ToastContext";
import type { Webhook } from "@/lib/mock-data";

// ─── Schemas ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  bio: z.string().max(160).optional(),
  website: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  phone: z.string().optional(),
});

const accountSchema = z.object({
  publicSlug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, hyphens"),
  country: z.string().min(1),
  currency: z.enum(["EUR", "USD", "GBP", "NOK", "SEK", "DKK", "CHF", "AUD", "CAD"]),
  language: z.enum([
    "en", "en-US", "en-GB", "nl", "nl-NL", "no", "nb-NO", "sv", "sv-SE",
    "da", "da-DK", "fr", "fr-FR", "de", "de-DE", "es", "es-ES", "pt", "pt-BR",
    "fi", "pl", "it", "it-IT",
  ]),
});

const toNum = (v: unknown) => (v === "" || v == null ? 0 : Number(v));
const expensesSchema = z.object({
  rent: z.preprocess(toNum, z.number().min(0)),
  subscriptions: z.preprocess(toNum, z.number().min(0)),
  food: z.preprocess(toNum, z.number().min(0)),
  transport: z.preprocess(toNum, z.number().min(0)),
  insurance: z.preprocess(toNum, z.number().min(0)),
  other: z.preprocess(toNum, z.number().min(0)),
});

const passwordSchema = z.object({
  current: z.string().min(1, "Required"),
  next: z.string().min(8, "At least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.next === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

type ProfileValues = z.infer<typeof profileSchema>;
type AccountValues = z.infer<typeof accountSchema>;
type ExpensesValues = z.infer<typeof expensesSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// ─── Nav sections ────────────────────────────────────────────────────────────

const NAV = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "account",       label: "Account",       icon: Shield },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "expenses",      label: "Expenses",      icon: DollarSign },
  { id: "goals",         label: "Goals",         icon: Target },
  { id: "billing",       label: "Billing",       icon: CreditCard },
  { id: "integrations",  label: "Integrations",  icon: Plug },
  { id: "sharing",       label: "Sharing",       icon: Share2 },
  { id: "developer",     label: "Developer",     icon: Shield },
  { id: "danger",        label: "Danger Zone",   icon: Trash2, danger: true },
] as const;

type SectionId = (typeof NAV)[number]["id"];

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputClass = "h-10 auth-input text-sm";
const labelClass = "text-xs font-medium auth-label";

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold auth-page-title">{title}</h2>
      {description && <p className="text-sm auth-page-subtitle mt-1">{description}</p>}
    </div>
  );
}

function SettingRow({
  label, description, children, borderless,
}: { label: string; description?: string; children: React.ReactNode; borderless?: boolean }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start gap-3 px-5 py-5 ${borderless ? "" : "border-b"}`}
      style={{ borderColor: "var(--border-col)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium auth-page-title">{label}</p>
        {description && <p className="text-xs auth-page-subtitle mt-0.5">{description}</p>}
      </div>
      <div className="sm:w-64 flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? "#22C55E" : "var(--border-col)" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
        style={{ background: "#fff", left: checked ? "22px" : "2px" }}
      />
    </button>
  );
}

function SaveBar({ saving, saved, onSave, label = "Save changes" }: {
  saving: boolean; saved: boolean; onSave?: () => void; label?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button
        type={onSave ? "button" : "submit"}
        onClick={onSave}
        size="sm"
        className="font-semibold text-sm h-9 px-4"
        style={{ background: "#22C55E", color: "var(--bg-sidebar)" }}
        disabled={saving}
      >
        {saving ? "Saving…" : label}
      </Button>
      {saved && (
        <span className="flex items-center gap-1 text-xs" style={{ color: "#22C55E" }}>
          <Check className="h-3.5 w-3.5" /> Saved
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, updateUser, logout, isLoading: authLoading } = useAuth();
  const { refresh: refreshAlerts } = useAlerts();
  const { toast } = useToast();
  const router = useRouter();
  const [active, setActive] = useState<SectionId>("profile");
  const [hostname, setHostname] = useState("app");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // Navigate to the section specified in the URL hash (e.g. /settings#goals)
  // Also capture hostname once on the client to avoid SSR hydration mismatch
  useEffect(() => {
    setHostname(window.location.hostname);
    const hash = window.location.hash.slice(1) as SectionId;
    if (hash && NAV.some((n) => n.id === hash)) {
      setActive(hash);
    }
  }, []);

  // Subscription
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);

  useEffect(() => {
    if (user?.id) {
      getSubscription(user.id).then(setSubscription);
      if (user.isPro) {
        getInvoices(user.id).catch(err => {
          console.error("Failed to fetch invoices:", err);
        });
      }
    }
  }, [user?.id, user?.isPro]);

  // Profile
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      bio: "",
      website: "",
      phone: "",
    },
  });

  // Account
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const accountForm = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      publicSlug: user?.publicPageSlug ?? "ivan",
      country: user?.country ?? "NO",
      currency: (user?.currency ?? "EUR") as AccountValues["currency"],
      language: "en",
    },
  });

  // Password
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  // Expenses
  const [expSaved, setExpSaved] = useState(false);
  const [expSaving, setExpSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expForm = useForm<ExpensesValues>({ resolver: zodResolver(expensesSchema) as any,
    defaultValues: {
      rent: user?.monthlyExpenses?.rent ?? 0,
      subscriptions: user?.monthlyExpenses?.subscriptions ?? 0,
      food: 0, transport: 0, insurance: 0,
      other: user?.monthlyExpenses?.other ?? 0,
    },
  });
  const expWatch = expForm.watch();
  const expTotal = Object.values(expWatch).reduce((s, v) => s + (Number(v) || 0), 0);

  // Goals
  const [goalInput, setGoalInput] = useState(user?.incomeGoal?.toString() ?? "");
  const [goalSaved, setGoalSaved] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState<import("@/lib/data/notification-prefs").NotifPrefs>({ weeklyDigest: true, monthlyReport: true, taxReminders: true, invoiceOverdue: true, newPayment: false, productUpdates: true, dashboardBanners: true });
  useEffect(() => { getNotifPrefs().then(setNotifs); }, []);
  const [notifSaved, setNotifSaved] = useState(false);

  // Appearance
  const [appearance, setAppearance] = useState<AppearancePrefs>({
    dateFormat: "DD/MM/YYYY",
    numberFormat: "1,000.00",
    weekStart: "monday",
    fiscalYearStart: "january",
  });
  useEffect(() => { getAppearancePrefs().then(setAppearance); }, []);
  const [appSaved, setAppSaved] = useState(false);

  // Re-populate forms once the user object is loaded (auth is async)
  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      website: user.website ?? "",
      bio: user.bio ?? "",
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    accountForm.reset({
      publicSlug: user.publicPageSlug ?? "",
      country: user.country ?? "NO",
      currency: (user.currency ?? "EUR") as AccountValues["currency"],
      language: (user.language ?? "en") as AccountValues["language"],
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    expForm.reset({
      rent:         user.monthlyExpenses?.rent ?? 0,
      subscriptions: user.monthlyExpenses?.subscriptions ?? 0,
      food:         0,
      transport:    0,
      insurance:    0,
      other:        user.monthlyExpenses?.other ?? 0,
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sharing
  const [publicEnabled, setPublicEnabled] = useState(user?.publicPageEnabled ?? false);
  const [publicSlug, setPublicSlug] = useState(user?.publicPageSlug ?? "ivan");
  const [sharingCopied, setSharingCopied] = useState(false);
  const [sharingSaved, setSharingSaved] = useState(false);
  const [sharingSaving, setSharingSaving] = useState(false);

  // Payment info
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({ accountName: "", bankName: "", iban: "", bic: "", paypalEmail: "", wiseEmail: "", paymentNotes: "" });
  useEffect(() => { getPaymentInfo().then(setPaymentInfo); }, []);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  useEffect(() => { if (user?.id) getWebhooks(user.id).then(setWebhooks); }, [user?.id]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);

  // Danger
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleFullExport = async () => {
    setExporting(true);
    try {
      const [invoices, income, expenses, timeEntries, clients, projects, proposals, contracts, leads, reminders] = await Promise.all([
        getInvoices(user!.id),
        getIncomeEntries(user!.id),
        getExpenses(user!.id),
        getTimeEntries(user!.id),
        getClients(user!.id),
        getProjects(user!.id),
        getProposals(),
        getContracts(),
        getLeads(user!.id),
        getReminderLogs(user!.id),
      ]);
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: user!.email,
        schemaVersion: "1.0",
        profile: {
          id: user!.id, name: user!.name, email: user!.email,
          country: user?.country, currency: user?.currency,
          monthlyExpenses: user?.monthlyExpenses, incomeGoal: user?.incomeGoal,
        },
        paymentInfo: await getPaymentInfo(),
        notificationPrefs: await getNotifPrefs(),
        clients, invoices, income, expenses, timeEntries,
        projects, proposals, contracts, leads, reminders,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mystackd-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } finally {
      setExporting(false);
    }
  };

  // ─ Handlers ─────────────────────────────────────────────────────────────

  const onSaveProfile = async (v: ProfileValues) => {
    setProfileSaving(true);
    try {
      const updated = await updateUserProfile(v, user!.id);
      updateUser(updated);
      setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000);
    } finally { setProfileSaving(false); }
  };

  const onSaveAccount = async (v: AccountValues) => {
    setAccountSaving(true);
    try {
      const updated = await updateUserProfile(
        { country: v.country, currency: v.currency as "EUR", publicPageSlug: v.publicSlug, language: v.language },
        user!.id,
      );
      updateUser(updated);
      setAccountSaved(true); setTimeout(() => setAccountSaved(false), 3000);
    } finally { setAccountSaving(false); }
  };

  const onSavePassword = async (v: PasswordValues) => {
    setPwSaving(true);
    try {
      await changePassword(v.current, v.next, user!.email);
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
      pwForm.reset();
      toast("Password updated successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      pwForm.setError("current", { message: msg });
    } finally {
      setPwSaving(false);
    }
  };

  const onSaveExpenses = async (v: ExpensesValues) => {
    setExpSaving(true);
    try {
      const updated = await updateUserProfile(
        { monthlyExpenses: { rent: v.rent, subscriptions: v.subscriptions, other: v.food + v.transport + v.insurance + v.other } },
        user!.id,
      );
      updateUser(updated);
      setExpSaved(true); setTimeout(() => setExpSaved(false), 3000);
    } finally { setExpSaving(false); }
  };

  const onSaveGoal = async () => {
    const goal = parseFloat(goalInput);
    if (isNaN(goal) || goal <= 0) return;
    setGoalSaving(true);
    try {
      const updated = await updateIncomeGoal(goal, user!.id);
      updateUser(updated); setGoalSaved(true); setTimeout(() => setGoalSaved(false), 3000);
    } finally { setGoalSaving(false); }
  };

  const onSaveNotifs = async () => {
    await saveNotifPrefs(notifs);
    refreshAlerts();
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  const onSaveAppearance = async () => {
    await saveAppearancePrefs(appearance);
    setAppSaved(true);
    setTimeout(() => setAppSaved(false), 3000);
  };

  const onSavePaymentInfo = async () => {
    setPaymentSaving(true);
    try {
      await savePaymentInfo(paymentInfo);
      setPaymentSaved(true);
      setTimeout(() => setPaymentSaved(false), 3000);
      toast("Payment info saved.");
    } finally {
      setPaymentSaving(false);
    }
  };

  const onSaveSharing = async () => {
    setSharingSaving(true);
    try {
      const updated = await updatePublicPageSettings(
        { publicPageEnabled: publicEnabled, publicPageSlug: publicSlug }, user!.id,
      );
      updateUser(updated); setSharingSaved(true); setTimeout(() => setSharingSaved(false), 3000);
    } finally { setSharingSaving(false); }
  };

  const copyPublicUrl = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/${publicSlug}`); } catch { /* ignore */ }
    setSharingCopied(true); setTimeout(() => setSharingCopied(false), 2000);
  };

  const addWebhook = async () => {
    if (!webhookUrl || webhookEvents.length === 0) return;
    const next = [...webhooks, { id: `wh_${Date.now()}`, url: webhookUrl, events: [...webhookEvents], isActive: true, createdAt: new Date().toISOString() }];
    setWebhooks(next);
    await updateWebhooks(next, user!.id);
    setWebhookUrl(""); setWebhookEvents([]); setShowWebhookForm(false);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE" || !deletePassword) return;
    setDeletePasswordError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const { error } = await res.json() as { error?: string };
        setDeletePasswordError(error ?? "Incorrect password");
        return;
      }
      router.push("/");
    } catch {
      setDeletePasswordError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const annualGoal = parseFloat(goalInput) || 0;


  // ─ Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Settings">
      <div className="flex h-full min-h-0">

        {/* Left nav */}
        <nav
          className="hidden md:flex flex-col w-52 flex-shrink-0 py-6 px-3 border-r gap-0.5"
          style={{ borderColor: "var(--border-col)", background: "var(--bg-sidebar)" }}
        >
          {NAV.map(({ id, label, icon: Icon, ...rest }) => {
            const danger = (rest as { danger?: boolean }).danger;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left w-full"
                style={{
                  background: active === id ? (danger ? "#ef444415" : "#22C55E15") : "transparent",
                  color: active === id ? (danger ? "#ef4444" : "#22C55E") : danger ? "#ef4444" : "#94a3b8",
                }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Mobile nav */}
        <div
          className="md:hidden flex gap-1 overflow-x-auto px-4 pt-4 pb-2 border-b flex-shrink-0 absolute top-14 left-0 right-0 z-10"
          style={{ borderColor: "var(--border-col)", background: "var(--bg-page)" }}
        >
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: active === id ? "#22C55E" : "var(--border-col)",
                color: active === id ? "var(--bg-sidebar)" : "#94a3b8",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl px-6 py-6 md:py-8 mt-12 md:mt-0">

            {/* ── Profile ──────────────────────────────────────────────── */}
            {active === "profile" && (
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)}>
                <SectionHeader title="Profile" description="Your public-facing identity on MyStackd." />

                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6 p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                    style={{ background: "#22C55E20", color: "#22C55E" }}>
                    {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "??"}
                  </div>
                  <div>
                    <p className="text-sm font-medium auth-page-title">Profile avatar</p>
                    <p className="text-xs auth-page-subtitle mt-0.5">Avatar is generated from your initials.</p>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-col)", background: "var(--bg-card)" }}>
                  <SettingRow label="Full name" description="Your display name across the app.">
                    <Input className={inputClass} style={{ background: "var(--bg-card)" }} {...profileForm.register("name")} />
                    {profileForm.formState.errors.name && <p className="text-xs text-red-400 mt-1">{profileForm.formState.errors.name.message}</p>}
                  </SettingRow>
                  <SettingRow label="Email address" description="Used for login, invoices and reports.">
                    <Input type="email" className={inputClass} style={{ background: "var(--bg-card)" }} {...profileForm.register("email")} />
                    {profileForm.formState.errors.email && <p className="text-xs text-red-400 mt-1">{profileForm.formState.errors.email.message}</p>}
                  </SettingRow>
                  <SettingRow label="Phone number" description="Optional. Shown on invoices.">
                    <Input type="tel" placeholder="+47 123 45 678" className={inputClass} style={{ background: "var(--bg-card)" }} {...profileForm.register("phone")} />
                  </SettingRow>
                  <SettingRow label="Website" description="Your personal or business website.">
                    <Input type="url" placeholder="https://yoursite.com" className={inputClass} style={{ background: "var(--bg-card)" }} {...profileForm.register("website")} />
                    {profileForm.formState.errors.website && <p className="text-xs text-red-400 mt-1">{profileForm.formState.errors.website.message}</p>}
                  </SettingRow>
                  <SettingRow label="Bio" description="Up to 160 characters. Shown on your public page." borderless>
                    <textarea
                      rows={3}
                      placeholder="Freelance designer based in Oslo…"
                      maxLength={160}
                      className="w-full rounded-lg border px-3 py-2 text-sm auth-input resize-none focus:outline-none"
                      style={{ background: "var(--bg-card)", borderColor: "var(--border-col)" }}
                      {...profileForm.register("bio")}
                    />
                  </SettingRow>
                </div>
                <div className="mt-4"><SaveBar saving={profileSaving} saved={profileSaved} /></div>
              </form>
            )}

            {/* ── Account ──────────────────────────────────────────────── */}
            {active === "account" && (
              <div>
                <SectionHeader title="Account" description="Regional settings, security and connected accounts." />

                {/* Regional */}
                <form onSubmit={accountForm.handleSubmit(onSaveAccount)}>
                  <p className="text-xs font-semibold auth-page-subtitle uppercase tracking-wider mb-3">Regional</p>
                  <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border-col)" }}>
                    <SettingRow label="Country" description="Used for tax bracket estimates.">
                      <Select value={accountForm.watch("country")} onValueChange={(v) => v && accountForm.setValue("country", v)}>
                        <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                          {[["NO","Norway"],["SE","Sweden"],["DK","Denmark"],["DE","Germany"],["GB","United Kingdom"],["US","United States"],["NL","Netherlands"],["FR","France"],["CH","Switzerland"],["AU","Australia"],["CA","Canada"]].map(([c, n]) => (
                            <SelectItem key={c} value={c} className="text-sm">{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    <SettingRow label="Currency" description="Your home currency for all calculations.">
                      <Select value={accountForm.watch("currency")} onValueChange={(v) => v && accountForm.setValue("currency", v as AccountValues["currency"])}>
                        <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                          {[["EUR","€ Euro"],["USD","$ US Dollar"],["GBP","£ British Pound"],["NOK","kr Norwegian Krone"],["SEK","kr Swedish Krona"],["DKK","kr Danish Krone"],["CHF","CHF Swiss Franc"],["AUD","A$ Australian Dollar"],["CAD","C$ Canadian Dollar"]].map(([c, n]) => (
                            <SelectItem key={c} value={c} className="text-sm">{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    <SettingRow label="Language" description="Interface language." borderless>
                      <Select value={accountForm.watch("language")} onValueChange={(v) => v && accountForm.setValue("language", v)}>
                        <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                          {[["en","English"],["no","Norwegian"],["de","German"],["nl","Dutch"],["fr","French"]].map(([c, n]) => (
                            <SelectItem key={c} value={c} className="text-sm">{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </SettingRow>
                  </div>
                  <div className="mb-8"><SaveBar saving={accountSaving} saved={accountSaved} /></div>
                </form>

                {/* Password */}
                <p className="text-xs font-semibold auth-page-subtitle uppercase tracking-wider mb-3">Security</p>
                <form onSubmit={pwForm.handleSubmit(onSavePassword)}>
                  <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border-col)" }}>
                    <SettingRow label="Current password" description="">
                      <div className="relative">
                        <Input type={showPw ? "text" : "password"} placeholder="••••••••" className={`${inputClass} pr-9`} style={{ background: "var(--bg-card)" }} {...pwForm.register("current")} />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:opacity-80">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {pwForm.formState.errors.current && <p className="text-xs text-red-400 mt-1">{pwForm.formState.errors.current.message}</p>}
                    </SettingRow>
                    <SettingRow label="New password" description="Minimum 8 characters.">
                      <Input type="password" placeholder="••••••••" className={inputClass} style={{ background: "var(--bg-card)" }} {...pwForm.register("next")} />
                      {pwForm.formState.errors.next && <p className="text-xs text-red-400 mt-1">{pwForm.formState.errors.next.message}</p>}
                    </SettingRow>
                    <SettingRow label="Confirm new password" description="" borderless>
                      <Input type="password" placeholder="••••••••" className={inputClass} style={{ background: "var(--bg-card)" }} {...pwForm.register("confirm")} />
                      {pwForm.formState.errors.confirm && <p className="text-xs text-red-400 mt-1">{pwForm.formState.errors.confirm.message}</p>}
                    </SettingRow>
                  </div>
                  <div className="mb-8"><SaveBar saving={pwSaving} saved={pwSaved} label="Update password" /></div>
                </form>

                {/* Sessions */}
                <p className="text-xs font-semibold auth-page-subtitle uppercase tracking-wider mb-3">Session</p>
                <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <div>
                    <p className="text-sm font-medium auth-page-title">Current session</p>
                    <p className="text-xs auth-page-subtitle mt-0.5">{user?.email}</p>
                  </div>
                  <button
                    onClick={async () => { await logout(); router.push("/login"); }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:opacity-80 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              </div>
            )}

            {/* ── Appearance ───────────────────────────────────────────── */}
            {active === "appearance" && (
              <div>
                <SectionHeader title="Appearance" description="Customise how MyStackd looks and formats your data." />

                <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border-col)" }}>
                  <SettingRow label="Date format" description="How dates are displayed throughout the app.">
                    <Select value={appearance.dateFormat} onValueChange={(v) => v && setAppearance((p: AppearancePrefs) => ({ ...p, dateFormat: v }))}>
                      <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((f) => (
                          <SelectItem key={f} value={f} className="text-sm">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Number format" description="How amounts are formatted.">
                    <Select value={appearance.numberFormat} onValueChange={(v) => v && setAppearance((p: AppearancePrefs) => ({ ...p, numberFormat: v }))}>
                      <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        {[["1,000.00", "1,000.00 (US/UK)"], ["1.000,00", "1.000,00 (EU)"], ["1 000.00", "1 000.00 (NO/SE)"]].map(([v, l]) => (
                          <SelectItem key={v} value={v!} className="text-sm">{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Week starts on" description="">
                    <Select value={appearance.weekStart} onValueChange={(v) => v && setAppearance((p: AppearancePrefs) => ({ ...p, weekStart: v }))}>
                      <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        <SelectItem value="monday" className="text-sm">Monday</SelectItem>
                        <SelectItem value="sunday" className="text-sm">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Fiscal year starts" description="Used for annual income calculations." borderless>
                    <Select value={appearance.fiscalYearStart} onValueChange={(v) => v && setAppearance((p: AppearancePrefs) => ({ ...p, fiscalYearStart: v }))}>
                      <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        {["january","february","march","april","july","october"].map((m) => (
                          <SelectItem key={m} value={m} className="text-sm capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </div>
                <SaveBar saving={false} saved={appSaved} onSave={onSaveAppearance} />
              </div>
            )}

            {/* ── Notifications ────────────────────────────────────────── */}
            {active === "notifications" && (
              <div>
                <SectionHeader title="Notifications" description="Choose when and how MyStackd contacts you." />

                <p className="text-xs font-semibold auth-page-subtitle uppercase tracking-wider mb-3">Email</p>
                <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border-col)" }}>
                  {([
                    ["weeklyDigest",   "Weekly digest",          "A summary of your income every Monday morning."],
                    ["monthlyReport",  "Monthly income report",  "Full breakdown sent on the 1st of each month."],
                    ["taxReminders",   "Tax payment reminders",  "Reminder before each quarterly deadline."],
                    ["invoiceOverdue", "Invoice overdue alerts", "Notified when an invoice passes its due date."],
                    ["newPayment",     "New payment received",   "Instant email when a payment lands."],
                    ["productUpdates", "Product updates",        "News about new features and improvements."],
                  ] as [keyof typeof notifs, string, string][]).map(([key, label, desc], i, arr) => (
                    <SettingRow key={key} label={label} description={desc} borderless={i === arr.length - 1}>
                      <Toggle checked={notifs[key]} onChange={(v) => setNotifs((p) => ({ ...p, [key]: v }))} />
                    </SettingRow>
                  ))}
                </div>

                <p className="text-xs font-semibold auth-page-subtitle uppercase tracking-wider mb-3">In-app</p>
                <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border-col)" }}>
                  <SettingRow label="Dashboard banners" description="Record month celebrations, no-income reminders." borderless>
                    <Toggle
                      checked={notifs.dashboardBanners}
                      onChange={(v) => setNotifs((p) => ({ ...p, dashboardBanners: v }))}
                    />
                  </SettingRow>
                </div>

                <SaveBar saving={false} saved={notifSaved} onSave={onSaveNotifs} />
              </div>
            )}

            {/* ── Expenses ─────────────────────────────────────────────── */}
            {active === "expenses" && (
              <form onSubmit={expForm.handleSubmit(onSaveExpenses)}>
                <SectionHeader title="Monthly Expenses" description="Fixed costs used to calculate your safe-to-spend figure." />

                <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border-col)" }}>
                  {([
                    ["rent",          "Rent / mortgage",   "Your primary housing cost."],
                    ["subscriptions", "Subscriptions",     "Software, tools, services."],
                    ["food",          "Food & groceries",  "Monthly food budget."],
                    ["transport",     "Transport",         "Car, public transit, fuel."],
                    ["insurance",     "Insurance",         "Health, home, business."],
                    ["other",         "Other",             "Any remaining fixed costs."],
                  ] as [keyof ExpensesValues, string, string][]).map(([field, label, desc], i, arr) => {
                    const sym = new Intl.NumberFormat("en", { style: "currency", currency: user?.currency ?? "EUR", minimumFractionDigits: 0 }).format(0).replace(/[\d,.\s]/g, "").trim();
                    return (
                      <SettingRow key={field} label={label} description={desc} borderless={i === arr.length - 1}>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{sym}</span>
                          <Input type="number" min="0" step="10" className={`${inputClass} pl-7`} style={{ background: "var(--bg-card)" }} {...expForm.register(field)} />
                        </div>
                      </SettingRow>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <span className="text-sm text-slate-400">Monthly total</span>
                  <span className="text-lg font-bold" style={{ color: "#22C55E" }}>{formatCurrency(expTotal, user?.currency ?? "EUR")}</span>
                </div>

                <SaveBar saving={expSaving} saved={expSaved} />
              </form>
            )}

            {/* ── Goals ────────────────────────────────────────────────── */}
            {active === "goals" && (
              <div>
                <SectionHeader title="Income Goals" description="Set targets to track your progress on the dashboard." />

                <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border-col)" }}>
                  <SettingRow label="Annual income goal" description={`Your target total earnings for ${new Date().getFullYear()}.`} borderless>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        {new Intl.NumberFormat("en", { style: "currency", currency: user?.currency ?? "EUR", minimumFractionDigits: 0 }).format(0).replace(/[\d,.\s]/g, "").trim()}
                      </span>
                      <Input
                        type="number" min="0" step="1000" placeholder="60000"
                        value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                        className={`${inputClass} pl-7`} style={{ background: "var(--bg-card)" }}
                      />
                    </div>
                  </SettingRow>
                </div>

                {annualGoal > 0 && (
                  <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Monthly target</span>
                      <span className="text-white font-semibold">{formatCurrency(Math.round(annualGoal / 12), user?.currency ?? "EUR")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Weekly target</span>
                      <span className="text-white font-semibold">{formatCurrency(Math.round(annualGoal / 52), user?.currency ?? "EUR")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Daily target</span>
                      <span className="text-white font-semibold">{formatCurrency(Math.round(annualGoal / 365), user?.currency ?? "EUR")}</span>
                    </div>
                  </div>
                )}

                <SaveBar saving={goalSaving} saved={goalSaved} onSave={onSaveGoal} />
              </div>
            )}

            {/* ── Billing ──────────────────────────────────────────────── */}
            {active === "billing" && (
              <div>
                <SectionHeader title="Billing" description="Manage your subscription and payment details." />

                <div className="rounded-xl p-5 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold">Current plan</p>
                      <p className="text-xs auth-page-subtitle mt-0.5">Renews monthly</p>
                    </div>
                    <Badge
                      className="text-sm font-semibold px-3 py-1"
                      style={user?.isPro
                        ? { background: "#22C55E20", color: "#22C55E", border: "1px solid #22C55E40" }
                        : { background: "var(--border-col)", color: "#94a3b8", border: "none" }}
                    >
                      {user?.isPro ? "Pro" : "Free"}
                    </Badge>
                  </div>

                  {!user?.isPro ? (
                    <div className="rounded-lg p-4 mb-4" style={{ background: "#22C55E08", border: "1px solid #22C55E30" }}>
                      <p className="text-sm font-semibold mb-1">Unlock everything with Pro — €9/mo</p>
                      <p className="text-xs text-slate-400">Invoices, tax calendar, client tracking, FX normalization, CSV/PDF export and more.</p>
                      <Button size="sm" className="mt-3 font-semibold" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }} onClick={() => router.push("/upgrade")}>
                        Upgrade to Pro
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Pro status */}
                      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Plan Status</p>
                        <p className="text-lg font-semibold text-green-400">✓ MyStackd Pro</p>
                        <p className="text-sm text-slate-400 mt-1">You have full access to all premium features.</p>
                      </div>

                      {/* Billing actions */}
                      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        <p className="text-sm font-medium mb-3">Manage billing</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full hover:opacity-80 flex items-center justify-center gap-1.5 mb-2"
                          onClick={async () => {
                            try {
                              await createBillingPortalSession(user!.id);
                            } catch {
                              toast("Failed to open billing portal", "error");
                            }
                          }}
                        >
                          <CreditCard className="h-4 w-4" /> Update payment method
                        </Button>
                        <button
                          onClick={async () => {
                            await cancelSubscription(user!.id);
                            updateUser({ isPro: false });
                            toast("Subscription cancelled — you've been moved to Free", "info");
                          }}
                          className="w-full text-sm text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 py-2"
                        >
                          <AlertTriangle className="h-4 w-4" /> Cancel subscription
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Integrations ─────────────────────────────────────────── */}
            {active === "integrations" && (
              <div>
                <SectionHeader title="Integrations" description="Connect external tools and automate your workflow." />

                <p className="text-xs font-semibold auth-page-subtitle uppercase tracking-wider mb-3">Webhooks</p>
                {!user?.isPro ? (
                  <div className="rounded-xl p-5 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                    <p className="text-sm font-semibold mb-1">Webhooks are a Pro feature</p>
                    <p className="text-xs text-slate-400 mb-3">Send income and invoice events to Notion, Airtable, Slack or any HTTP endpoint.</p>
                    <Button size="sm" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }} onClick={() => router.push("/upgrade")}>Upgrade to Pro</Button>
                  </div>
                ) : (
                  <div className="mb-6">
                    {webhooks.map((wh) => (
                      <div key={wh.id} className="rounded-xl p-4 mb-2 flex items-start justify-between" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{wh.url}</p>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {wh.events.map((e) => <Badge key={e} className="text-xs" style={{ background: "var(--border-col)", color: "#94a3b8", border: "none" }}>{e}</Badge>)}
                          </div>
                        </div>
                        <button onClick={() => { const next = webhooks.filter((w) => w.id !== wh.id); setWebhooks(next); updateWebhooks(next, user!.id); }} className="ml-3 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {showWebhookForm ? (
                      <div className="rounded-xl p-4 mt-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                        <div className="space-y-3">
                          <div>
                            <Label className={labelClass}>Endpoint URL</Label>
                            <Input placeholder="https://hooks.example.com/…" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className={`${inputClass} mt-1`} style={{ background: "var(--bg-card)" }} />
                          </div>
                          <div>
                            <Label className={labelClass}>Events</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {["income.created","income.updated","invoice.paid","invoice.sent","invoice.overdue"].map((ev) => (
                                <button key={ev} type="button" onClick={() => setWebhookEvents((p) => p.includes(ev) ? p.filter((e) => e !== ev) : [...p, ev])}
                                  className="text-xs px-2.5 py-1 rounded-full transition-colors"
                                  style={{ background: webhookEvents.includes(ev) ? "#22C55E20" : "var(--border-col)", color: webhookEvents.includes(ev) ? "#22C55E" : "#94a3b8", border: webhookEvents.includes(ev) ? "1px solid #22C55E40" : "none" }}>
                                  {ev}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" style={{ background: "#22C55E", color: "var(--bg-sidebar)" }} onClick={addWebhook}>Add webhook</Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowWebhookForm(false)} className="text-slate-400">Cancel</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowWebhookForm(true)} className="flex items-center gap-2 text-sm mt-2 transition-colors" style={{ color: "#22C55E" }}>
                        <Plus className="h-4 w-4" /> Add webhook
                      </button>
                    )}
                  </div>
                )}

                <p className="text-xs font-semibold auth-page-subtitle uppercase tracking-wider mb-3">Data export</p>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-col)", background: "var(--bg-card)" }}>
                  <SettingRow label="Export income CSV" description="All income entries as a spreadsheet.">
                    <Button size="sm" variant="outline" className="hover:opacity-80" onClick={async () => {
                      const entries = await getIncomeEntries(user!.id);
                      exportIncomeCSV(entries);
                    }}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                    </Button>
                  </SettingRow>
                  <SettingRow label="Export expenses CSV" description="All expense records as a spreadsheet.">
                    <Button size="sm" variant="outline" className="hover:opacity-80" onClick={async () => {
                      const expenses = await getExpenses(user!.id);
                      exportExpensesCSV(expenses);
                    }}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                    </Button>
                  </SettingRow>
                  <SettingRow label="Export time entries CSV" description="All tracked hours with rates and values.">
                    <Button size="sm" variant="outline" className="hover:opacity-80" onClick={async () => {
                      const entries = await getTimeEntries(user!.id);
                      exportTimeEntriesCSV(entries);
                    }}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                    </Button>
                  </SettingRow>
                  <SettingRow label="Export tax report PDF" description="Annual summary for your accountant." borderless>
                    <div className="flex items-center gap-2">
                      {!user?.isPro && <Badge className="text-xs" style={{ background: "#635BFF20", color: "#635BFF", border: "none" }}>Pro</Badge>}
                      <Button size="sm" variant="outline" className="hover:opacity-80" disabled={!user?.isPro} onClick={async () => {
                        // TODO: Implement full tax report generation
                        console.log("Tax report export not yet implemented");
                      }}>
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                      </Button>
                    </div>
                  </SettingRow>
                </div>
              </div>
            )}

            {/* ── Sharing ──────────────────────────────────────────────── */}
            {active === "sharing" && (
              <div>
                <SectionHeader title="Sharing" description="Control your public presence on MyStackd." />

                <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border-col)" }}>
                  <SettingRow label="Public earnings page" description="Let others see your annual income on a shareable URL.">
                    <Toggle checked={publicEnabled} onChange={setPublicEnabled} />
                  </SettingRow>
                  <SettingRow label="Public URL slug" description="Your personalised public earnings URL." borderless>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{hostname}/</span>
                        <Input
                          value={publicSlug} onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          className={`${inputClass} pl-[7.5rem]`} style={{ background: "var(--bg-card)" }} disabled={!publicEnabled}
                        />
                      </div>
                      {publicEnabled && (
                        <button onClick={copyPublicUrl} className="flex items-center gap-1 text-xs px-2.5 rounded-lg transition-colors flex-shrink-0"
                          style={{ background: "var(--border-col)", color: sharingCopied ? "#22C55E" : "#94a3b8" }}>
                          {sharingCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    {publicEnabled && (
                      <a href={`/${publicSlug}`} target="_blank" className="flex items-center gap-1 text-xs mt-1.5 hover:underline" style={{ color: "#22C55E" }}>
                        <Globe className="h-3 w-3" /> Preview page <ChevronRight className="h-3 w-3" />
                      </a>
                    )}
                  </SettingRow>
                </div>

                <SaveBar saving={sharingSaving} saved={sharingSaved} onSave={onSaveSharing} />

                {/* Payment info */}
                <div className="mt-8">
                  <SectionHeader
                    title="Payment info"
                    description="Shown on public invoice payment pages (/pay/[id]) so clients can copy your bank details."
                  />
                  <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border-col)" }}>
                    {([
                      { key: "accountName",  label: "Account name",    placeholder: "Ivan de Vries" },
                      { key: "bankName",     label: "Bank name",       placeholder: "DNB" },
                      { key: "iban",         label: "IBAN",            placeholder: "NO93 1234 5678 901" },
                      { key: "bic",          label: "BIC / SWIFT",     placeholder: "DNBANOKKXXX" },
                      { key: "paypalEmail",  label: "PayPal email",    placeholder: "you@paypal.com" },
                      { key: "wiseEmail",    label: "Wise / Revolut",  placeholder: "you@wise.com" },
                    ] as { key: keyof PaymentInfo; label: string; placeholder: string }[]).map((field, idx, arr) => (
                      <SettingRow key={field.key} label={field.label} borderless={idx === arr.length - 1}>
                        <Input
                          value={paymentInfo[field.key]}
                          onChange={(e) => setPaymentInfo((p) => ({ ...p, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className={inputClass}
                          style={{ background: "var(--bg-card)" }}
                        />
                      </SettingRow>
                    ))}
                    <SettingRow label="Payment notes" description="Shown at the bottom of the payment page." borderless>
                      <textarea
                        value={paymentInfo.paymentNotes}
                        onChange={(e) => setPaymentInfo((p) => ({ ...p, paymentNotes: e.target.value }))}
                        placeholder="Please include the invoice number as the payment reference."
                        rows={2}
                        className="w-full px-3 py-2 rounded-md text-sm border resize-none outline-none"
                        style={{ background: "var(--bg-card)", borderColor: "var(--border-col)", color: "white" }}
                      />
                    </SettingRow>
                  </div>
                  <SaveBar saving={paymentSaving} saved={paymentSaved} onSave={onSavePaymentInfo} />
                </div>

              </div>
            )}

            {/* ── Developer ──────────────────────────────────────────────── */}
            {active === "developer" && (
              <div>
                <SectionHeader title="Developer Mode" description="Testing utilities for development and feature testing." />

                <div className="rounded-xl p-5 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold">Pro Status (Test Mode)</p>
                      <p className="text-xs text-slate-400 mt-0.5">Toggle your Pro status to test Pro-only features</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newProStatus = !user?.isPro;
                        updateUser({ isPro: newProStatus });
                        toast(newProStatus ? "Pro status enabled" : "Pro status disabled", "success");
                      }}
                      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                      style={{ background: user?.isPro ? "#22C55E" : "var(--border-col)" }}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                        style={{ left: user?.isPro ? "20px" : "2px" }}
                      />
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    <p className="mb-2">Current: <span className="font-semibold">{user?.isPro ? "✨ Pro" : "Free"}</span></p>
                    <p>This setting is for testing only and does not affect billing.</p>
                  </div>
                </div>

                <div className="rounded-xl p-5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-col)" }}>
                  <p className="text-sm font-semibold mb-2">API Info</p>
                  <div className="space-y-2 text-xs text-slate-400">
                    <div><span className="text-slate-500">User ID:</span> {user?.id}</div>
                    <div><span className="text-slate-500">Email:</span> {user?.email}</div>
                    <div><span className="text-slate-500">Currency:</span> {user?.currency}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Danger zone ──────────────────────────────────────────── */}
            {active === "danger" && (
              <div>
                <SectionHeader title="Danger Zone" description="Irreversible actions. Please read carefully before proceeding." />

                <div className="rounded-xl p-5 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
                  <p className="text-sm font-semibold mb-1">Export all your data (GDPR)</p>
                  <p className="text-xs text-slate-400 mb-1">
                    Download a complete copy of everything MyStackd holds about you — profile, clients, invoices, income, expenses, time entries, projects, proposals, and contracts — as a single JSON file.
                  </p>
                  <p className="text-xs text-slate-600 mb-4">Under GDPR Article 20 you have the right to data portability at any time.</p>
                  <Button
                    size="sm"
                    onClick={handleFullExport}
                    disabled={exporting}
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)", color: exported ? "#22C55E" : "#94a3b8" }}
                    className="hover:opacity-80"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {exporting ? "Preparing export…" : exported ? "Downloaded!" : "Download my data"}
                  </Button>
                </div>

                <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid #ef444430" }}>
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Delete account</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        This permanently deletes your account, all income entries, invoices and clients. This cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className={labelClass}>Type <span className="font-mono">DELETE</span> to confirm</Label>
                      <Input
                        placeholder="DELETE"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        className={`${inputClass} mt-1.5 font-mono`}
                        style={{ background: "var(--bg-card)" }}
                      />
                    </div>
                    <Dialog>
                      <DialogTrigger>
                        <Button
                          size="sm"
                          disabled={deleteConfirm !== "DELETE"}
                          className="font-semibold"
                          style={{ background: deleteConfirm === "DELETE" ? "#ef4444" : "var(--border-col)", color: deleteConfirm === "DELETE" ? "#fff" : "#64748b" }}
                        >
                          Delete my account
                        </Button>
                      </DialogTrigger>
                      <DialogContent style={{ background: "var(--bg-card)", border: "1px solid #ef444440" }}>
                        <DialogHeader>
                          <DialogTitle className="text-white">Are you absolutely sure?</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-slate-400">This will permanently delete your account and all data. There is no undo.</p>
                        <div className="space-y-2 mt-4">
                          <Label className={labelClass}>Enter your password to confirm</Label>
                          <Input
                            type="password"
                            placeholder="Your current password"
                            value={deletePassword}
                            onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(""); }}
                            className={`${inputClass} font-mono`}
                            style={{ background: "var(--bg-page)" }}
                          />
                          {deletePasswordError && (
                            <p className="text-xs text-red-400">{deletePasswordError}</p>
                          )}
                        </div>
                        <div className="flex gap-3 mt-4">
                          <Button
                            className="flex-1 font-semibold"
                            style={{ background: "#ef4444", color: "#fff" }}
                            onClick={deleteAccount}
                            disabled={deleting || !deletePassword}
                          >
                            {deleting ? "Verifying…" : "Yes, delete everything"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  );
}
