"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Bell, Copy, Check, Clock, AlertTriangle, CheckCircle, Trash2, Mail, Zap, Settings2, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProGateModal } from "@/components/ui/pro-gate-modal";
import { getInvoices, updateInvoice } from "@/lib/data/invoices";
import { getReminderLogs, logReminder, deleteReminderLog } from "@/lib/data/reminders";
import { addIncomeEntry } from "@/lib/data/income";
import { useAuth } from "@/lib/context/AuthContext";
import { useAlerts } from "@/lib/context/AlertContext";
import { formatCurrency } from "@/lib/calculations";
import type { Invoice, ReminderLog } from "@/lib/mock-data";

// ── Reminder schedule types ────────────────────────────────────────────────────

interface ReminderRule {
  id: string;
  label: string;
  description: string;
  triggerDays: number; // negative = before due, positive = after due
  enabled: boolean;
}

const DEFAULT_RULES: ReminderRule[] = [
  { id: "before3",  label: "3 days before due",   description: "Friendly heads-up before the due date",          triggerDays: -3,  enabled: false },
  { id: "ondue",    label: "On due date",          description: "Reminder on the day payment is due",             triggerDays:  0,  enabled: true  },
  { id: "after3",   label: "3 days overdue",       description: "First chaser after missed payment",              triggerDays:  3,  enabled: true  },
  { id: "after7",   label: "7 days overdue",       description: "Second chaser for persistent non-payment",       triggerDays:  7,  enabled: false },
  { id: "after14",  label: "14 days overdue",      description: "Final notice before escalation",                 triggerDays: 14,  enabled: false },
];

const SCHEDULE_KEY = "msd_reminder_schedule";

function loadSchedule(): ReminderRule[] {
  if (typeof window === "undefined") return DEFAULT_RULES;
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    if (!raw) return DEFAULT_RULES;
    const saved = JSON.parse(raw) as Record<string, boolean>;
    return DEFAULT_RULES.map((r) => ({ ...r, enabled: saved[r.id] ?? r.enabled }));
  } catch { return DEFAULT_RULES; }
}

function saveSchedule(rules: ReminderRule[]) {
  const map: Record<string, boolean> = {};
  rules.forEach((r) => { map[r.id] = r.enabled; });
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(map));
}

// ─── Reminder email generator ─────────────────────────────────────────────────

function buildReminderEmailParts(inv: Invoice, userName: string, daysOverdue: number): { subject: string; body: string } {
  const isOverdue = daysOverdue > 0;
  const subject = isOverdue
    ? `Payment reminder — Invoice ${inv.invoiceNumber} (${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue)`
    : `Invoice ${inv.invoiceNumber} due soon — ${formatCurrency(inv.total, inv.currency)}`;

  const body = isOverdue
    ? `Hi ${inv.clientName},

I hope you're doing well. I'm following up on Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total, inv.currency)}, which was due on ${dayjs(inv.dueDate).format("MMMM D, YYYY")} — ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago.

Could you let me know when I can expect payment, or if there's anything I can help clarify?

Thank you,
${userName}`
    : `Hi ${inv.clientName},

Just a quick heads-up that Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.total, inv.currency)} is due on ${dayjs(inv.dueDate).format("MMMM D, YYYY")}.

Please let me know if you have any questions before then.

Thank you,
${userName}`;

  return { subject, body };
}

function buildReminderEmail(inv: Invoice, userName: string, daysOverdue: number): string {
  const { subject, body } = buildReminderEmailParts(inv, userName, daysOverdue);
  return `Subject: ${subject}\n\n${body}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: `${color}20`, color }}>{count}</span>
    </div>
  );
}

interface InvoiceCardProps {
  inv: Invoice;
  logs: ReminderLog[];
  daysOverdue: number; // negative means days until due
  userName: string;
  userId: string;
  onReminderSent: (log: ReminderLog) => void;
  onMarkPaid: (invoiceId: string, incomeEntryId: string) => void;
  onDeleteLog: (logId: string) => void;
}

function InvoiceCard({ inv, logs, daysOverdue, userName, userId, onReminderSent, onMarkPaid, onDeleteLog }: InvoiceCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const handleMailto = useCallback(async () => {
    const { subject, body } = buildReminderEmailParts(inv, userName, daysOverdue);
    const mailto = `mailto:${inv.clientEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    const log = await logReminder({
      userId,
      invoiceId: inv.id,
      sentAt: new Date().toISOString(),
      channel: "email",
    });
    onReminderSent(log);
  }, [inv, userName, userId, daysOverdue, onReminderSent]);
  const isOverdue = daysOverdue > 0;
  const lastLog = logs[0] ?? null;
  const daysSinceLastReminder = lastLog
    ? dayjs().diff(dayjs(lastLog.sentAt), "day")
    : null;

  const handleCopy = useCallback(async () => {
    const text = buildReminderEmail(inv, userName, daysOverdue);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback: select a textarea
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    const log = await logReminder({
      userId,
      invoiceId: inv.id,
      sentAt: new Date().toISOString(),
      channel: "copied",
    });
    onReminderSent(log);
  }, [inv, userName, userId, daysOverdue, onReminderSent]);

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      let incomeEntryId = inv.linkedIncomeEntryId;
      if (!incomeEntryId) {
        const entry = await addIncomeEntry(
          {
            amount:     inv.total,
            currency:   inv.currency,
            date:       dayjs().format("YYYY-MM-DD"),
            source:     "manual",
            note:       `Invoice ${inv.invoiceNumber}`,
            clientId:   inv.clientId,
            clientName: inv.clientName,
          },
          userId,
        );
        incomeEntryId = entry.id;
      }
      const paidAt = new Date().toISOString();
      await updateInvoice(inv.id, { status: "paid", paidAt, linkedIncomeEntryId: incomeEntryId });
      onMarkPaid(inv.id, incomeEntryId);
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isOverdue ? "#ef444440" : "var(--border-col)"}`,
      }}
    >
      {/* Main row */}
      <div className="px-5 py-4 flex items-start gap-4">
        {/* Status dot */}
        <div className="mt-0.5 flex-shrink-0">
          {isOverdue ? (
            <AlertTriangle className="h-4 w-4 text-red-400" />
          ) : (
            <Clock className="h-4 w-4 text-amber-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold">{inv.clientName}</p>
              <p className="text-xs text-slate-500 font-mono">{inv.invoiceNumber}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold">{formatCurrency(inv.total, inv.currency)}</p>
              <p className="text-xs" style={{ color: isOverdue ? "#f87171" : "#fbbf24" }}>
                {isOverdue
                  ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`
                  : `Due ${dayjs(inv.dueDate).format("MMM D")}`}
              </p>
            </div>
          </div>

          {/* Last reminder info */}
          {lastLog ? (
            <p className="text-xs text-slate-500 mt-1">
              Last reminder:{" "}
              <span className="text-slate-400">
                {daysSinceLastReminder === 0
                  ? "today"
                  : `${daysSinceLastReminder}d ago`}
              </span>
              {lastLog.note && ` · ${lastLog.note}`}
              {" · "}
              <button
                className="hover:text-slate-300 transition-colors"
                onClick={() => setExpanded((v) => !v)}
              >
                {logs.length} reminder{logs.length === 1 ? "" : "s"} sent {expanded ? "▲" : "▼"}
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-1">No reminders sent yet</p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: copied ? "#22C55E20" : "var(--border-col)",
            color: copied ? "#22C55E" : "#94a3b8",
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy email"}
        </button>
        <button
          onClick={handleMailto}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "var(--border-col)", color: "#94a3b8" }}
        >
          <Mail className="h-3.5 w-3.5" />
          Open in email
        </button>
        <button
          onClick={handleMarkPaid}
          disabled={markingPaid}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 disabled:opacity-40"
          style={{ background: "#22C55E15", color: "#22C55E" }}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {markingPaid ? "Marking…" : "Mark paid"}
        </button>
        <span className="text-xs text-slate-600">
          {daysSinceLastReminder !== null && daysSinceLastReminder < 3
            ? "⚠️ Sent recently — consider waiting"
            : null}
        </span>
      </div>

      {/* Reminder history */}
      {expanded && logs.length > 0 && (
        <div className="border-t px-5 py-3 space-y-2" style={{ borderColor: "var(--border-col)" }}>
          <p className="text-xs font-medium text-slate-500">Reminder history</p>
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {dayjs(log.sentAt).format("MMM D, YYYY [at] HH:mm")}
                {log.note && <span className="text-slate-600"> · {log.note}</span>}
              </span>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: "var(--border-col)", color: "#64748b" }}>
                  {log.channel}
                </span>
                <button
                  onClick={() => onDeleteLog(log.id)}
                  className="text-slate-700 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RemindersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { refresh: refreshAlerts } = useAlerts();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getInvoices(user?.id),
      getReminderLogs(user?.id),
    ]).then(([inv, rem]) => {
      if (!mounted) return;
      setInvoices(inv);
      setLogs(rem);
      setIsLoading(false);
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const today = dayjs();

  // Classify invoices
  const actionable = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "overdue" || inv.status === "sent")
      .map((inv) => ({
        inv,
        daysOverdue: today.diff(dayjs(inv.dueDate), "day"), // negative = future
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue); // most overdue first
  }, [invoices, today]);

  const overdue = actionable.filter((x) => x.daysOverdue > 0);
  const dueSoon = actionable.filter((x) => x.daysOverdue <= 0 && x.daysOverdue >= -14);
  const outstanding = actionable.filter((x) => x.daysOverdue < -14);

  const logsForInvoice = useCallback(
    (invoiceId: string) => logs.filter((l) => l.invoiceId === invoiceId),
    [logs]
  );

  const totalOverdueValue = overdue.reduce((s, x) => s + x.inv.total, 0);
  const currency = user?.currency ?? "EUR";

  const handleReminderSent = (log: ReminderLog) => {
    setLogs((prev) => [log, ...prev]);
  };

  const handleMarkPaid = (invoiceId: string, incomeEntryId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "paid", linkedIncomeEntryId: incomeEntryId }
          : inv,
      ),
    );
    refreshAlerts();
  };

  const handleDeleteLog = (logId: string) => {
    deleteReminderLog(logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  const userName = user?.name ?? "Your name";

  // ── Reminder schedule state ───────────────────────────────────────────────
  const [rules, setRules] = useState<ReminderRule[]>(DEFAULT_RULES);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  useEffect(() => { setRules(loadSchedule()); }, []);

  const toggleRule = (id: string) => {
    setRules((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r);
      saveSchedule(next);
      return next;
    });
  };

  // Invoices that match an enabled rule and haven't had a reminder recently
  const suggestedReminders = useMemo(() => {
    if (!rules.some((r) => r.enabled)) return [];
    return actionable
      .filter(({ inv, daysOverdue }) => {
        const enabledRules = rules.filter((r) => r.enabled);
        const matchesRule  = enabledRules.some((r) => {
          if (r.triggerDays < 0) return daysOverdue <= r.triggerDays && daysOverdue > r.triggerDays - 2;
          return daysOverdue >= r.triggerDays && daysOverdue < r.triggerDays + 2;
        });
        if (!matchesRule) return false;
        const lastLog = logs.filter((l) => l.invoiceId === inv.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
        const hoursSince = lastLog ? dayjs().diff(dayjs(lastLog.sentAt), "hour") : 999;
        return hoursSince >= 23; // don't suggest if reminded in the last day
      })
      .slice(0, 5);
  }, [actionable, rules, logs]);

  return (
    <AppShell title="Payment Reminders">
      <ProGateModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        feature="Automated Payment Reminders"
        description="Set up automatic reminder schedules that trigger payment follow-ups at the right time. Get paid faster with intelligent reminder timing."
      />
      <div className="p-5 lg:p-6 space-y-6">

        {/* Summary banner */}
        {!isLoading && overdue.length > 0 && (
          <div
            className="rounded-xl p-4 flex items-start gap-3 banner-danger"
          >
            <AlertTriangle className="h-5 w-5 banner-danger-icon flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold banner-danger-strong">
                {overdue.length} overdue invoice{overdue.length === 1 ? "" : "s"} · {formatCurrency(totalOverdueValue, currency)} outstanding
              </p>
              <p className="text-xs banner-danger-text mt-0.5">
                Copy a reminder email below and send it from your inbox — it takes 30 seconds.
              </p>
            </div>
          </div>
        )}

        {/* Stat tiles */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-4 space-y-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs text-slate-500">Overdue</p>
              <p className="text-2xl font-bold" style={{ color: overdue.length > 0 ? "#f87171" : "#fff" }}>
                {overdue.length}
              </p>
              <p className="text-xs text-slate-500">
                {overdue.length > 0 ? formatCurrency(totalOverdueValue, currency) : "All clear"}
              </p>
            </div>
            <div className="rounded-xl p-4 space-y-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs text-slate-500">Due in 14 days</p>
              <p className="text-2xl font-bold">{dueSoon.length}</p>
              <p className="text-xs text-slate-500">
                {dueSoon.length > 0
                  ? formatCurrency(dueSoon.reduce((s, x) => s + x.inv.total, 0), currency)
                  : "None upcoming"}
              </p>
            </div>
            <div className="rounded-xl p-4 space-y-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs text-slate-500">Reminders sent</p>
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-slate-500">Total logged</p>
            </div>
            <div className="rounded-xl p-4 space-y-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs text-slate-500">Last reminder</p>
              <p className="text-2xl font-bold">
                {logs.length > 0 ? `${dayjs().diff(dayjs(logs[0].sentAt), "day")}d ago` : "—"}
              </p>
              <p className="text-xs text-slate-500">
                {logs.length > 0 ? dayjs(logs[0].sentAt).format("MMM D") : "No reminders yet"}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl h-28 animate-pulse"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }} />
            ))}
          </div>
        ) : actionable.length === 0 ? (
          <div className="py-20 text-center">
            <Bell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">All invoices are paid or on time</p>
            <p className="text-xs text-slate-500">Nothing to chase right now. Check back when invoices go out.</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Overdue */}
            {overdue.length > 0 && (
              <div>
                <SectionHeader title="Overdue" count={overdue.length} color="#f87171" />
                <div className="space-y-3">
                  {overdue.map(({ inv, daysOverdue }) => (
                    <InvoiceCard
                      key={inv.id}
                      inv={inv}
                      logs={logsForInvoice(inv.id)}
                      daysOverdue={daysOverdue}
                      userName={userName}
                      userId={user?.id ?? "user_mock_001"}
                      onReminderSent={handleReminderSent}
                      onMarkPaid={handleMarkPaid}
                      onDeleteLog={handleDeleteLog}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Due soon */}
            {dueSoon.length > 0 && (
              <div>
                <SectionHeader title="Due within 14 days" count={dueSoon.length} color="#fbbf24" />
                <div className="space-y-3">
                  {dueSoon.map(({ inv, daysOverdue }) => (
                    <InvoiceCard
                      key={inv.id}
                      inv={inv}
                      logs={logsForInvoice(inv.id)}
                      daysOverdue={daysOverdue}
                      userName={userName}
                      userId={user?.id ?? "user_mock_001"}
                      onReminderSent={handleReminderSent}
                      onMarkPaid={handleMarkPaid}
                      onDeleteLog={handleDeleteLog}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sent, not yet due */}
            {outstanding.length > 0 && (
              <div>
                <SectionHeader title="Sent — waiting on payment" count={outstanding.length} color="#60a5fa" />
                <div className="space-y-3">
                  {outstanding.map(({ inv, daysOverdue }) => (
                    <InvoiceCard
                      key={inv.id}
                      inv={inv}
                      logs={logsForInvoice(inv.id)}
                      daysOverdue={daysOverdue}
                      userName={userName}
                      userId={user?.id ?? "user_mock_001"}
                      onReminderSent={handleReminderSent}
                      onMarkPaid={handleMarkPaid}
                      onDeleteLog={handleDeleteLog}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* How it works note */}
        {!isLoading && actionable.length > 0 && (
          <div
            className="rounded-xl px-4 py-3 text-xs text-slate-500 leading-relaxed"
            style={{ background: "var(--bg-sidebar)", border: "1px solid var(--border-col)" }}
          >
            <span className="text-slate-400 font-medium">How reminders work: </span>
            Click "Copy reminder email" to get a ready-to-send message with the correct invoice details.
            Paste it into Gmail, Outlook, or any email client and hit send.
            Each sent reminder is logged here so you can track your follow-up history.
          </div>
        )}

        {/* ── Auto-suggestions ──────────────────────────────────────────── */}
        {!isLoading && suggestedReminders.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #22C55E40", background: "#22C55E08" }}
          >
            <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: "#22C55E30" }}>
              <Zap className="h-4 w-4" style={{ color: "#22C55E" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {suggestedReminders.length} reminder{suggestedReminders.length !== 1 ? "s" : ""} suggested by your schedule
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "#22C55E20" }}>
              {suggestedReminders.map(({ inv, daysOverdue }) => {
                const { subject, body } = buildReminderEmailParts(inv, userName, daysOverdue);
                const mailto = `mailto:${inv.clientEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                return (
                  <div key={inv.id} className="px-5 py-3 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {inv.invoiceNumber} — {inv.clientName}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {daysOverdue > 0
                          ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`
                          : daysOverdue === 0 ? "Due today" : `Due in ${Math.abs(daysOverdue)} days`}
                        {" · "}{formatCurrency(inv.total, inv.currency)}
                      </p>
                    </div>
                    <a
                      href={mailto}
                      target="_blank"
                      rel="noreferrer"
                      onClick={async () => {
                        const log = await logReminder({ userId: user?.id ?? "user_mock_001", invoiceId: inv.id, sentAt: new Date().toISOString(), channel: "email" });
                        handleReminderSent(log);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                      style={{ background: "#22C55E", color: "#0f172a" }}
                    >
                      <Mail className="h-3 w-3" /> Send reminder
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Reminder schedule settings ────────────────────────────────── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          <button
            className="w-full px-5 py-4 flex items-center justify-between gap-3"
            onClick={() => {
              if (!user?.isPro) {
                setShowProModal(true);
              } else {
                setScheduleOpen((v) => !v);
              }
            }}
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Reminder schedule
              </p>
              {!user?.isPro && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#fbbf2430", color: "#fbbf24" }}>
                  <Lock className="h-3 w-3" />
                  Pro
                </span>
              )}
              {user?.isPro && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#22C55E20", color: "#22C55E" }}>
                  {rules.filter((r) => r.enabled).length} active
                </span>
              )}
            </div>
            {scheduleOpen || user?.isPro
              ? <ChevronUp className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              : <ChevronDown className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            }
          </button>

          {scheduleOpen && user?.isPro && (
            <div className="px-5 pb-5 border-t space-y-3" style={{ borderColor: "var(--border-col)" }}>
              <p className="text-xs pt-4" style={{ color: "var(--text-muted)" }}>
                Enable the triggers below. MyStackd will surface matching invoices as suggestions on this page so you can send them in one click.
              </p>
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-col)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{rule.label}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{rule.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className="relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0"
                    style={{ background: rule.enabled ? "#22C55E" : "var(--border-col)" }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ left: rule.enabled ? "20px" : "2px" }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
