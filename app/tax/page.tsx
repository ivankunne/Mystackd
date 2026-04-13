"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { CheckCircle2, Clock, AlertTriangle, Calendar, Download, Lock, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProGateModal } from "@/components/ui/pro-gate-modal";
import { Button } from "@/components/ui/button";
import { getTaxPeriods, getNextTaxDeadline, getQuarterlyTaxEstimate } from "@/lib/tax-calendar";
import { getIncomeEntries } from "@/lib/data/income";
import { getExpenses } from "@/lib/data/expenses";
import { useAuth } from "@/lib/context/AuthContext";
import { formatCurrency } from "@/lib/calculations";
import { getTaxReminders, markTaxReminderPaid } from "@/lib/data/tax-reminders";
import { generateTaxReportPDF } from "@/lib/pdf";
import type { TaxReminder } from "@/lib/mock-data";

export default function TaxPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [entries,   setEntries]   = useState<Awaited<ReturnType<typeof getIncomeEntries>>>([]);
  const [expenses,  setExpenses]  = useState<Awaited<ReturnType<typeof getExpenses>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reminders, setReminders] = useState<TaxReminder[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    if (user?.id) getTaxReminders(user.id).then(setReminders);
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
  }, [user, router]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getIncomeEntries(user?.id),
      getExpenses(user?.id),
    ]).then(([inc, exp]) => {
      if (mounted) { setEntries(inc); setExpenses(exp); setIsLoading(false); }
    });
    return () => { mounted = false; };
  }, [user?.id]);

  const country = user?.country ?? "NO";
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  const taxPeriods = useMemo(() => getTaxPeriods(country, currentYear), [country, currentYear]);
  const nextDeadline = useMemo(() => getNextTaxDeadline(country), [country]);

  // Quarter income calculation
  const quarterlyIncome = useMemo(() => {
    return taxPeriods.map((period) => {
      const qStart = dayjs(`${currentYear}-01-01`)
        .add((period.quarter - 1) * 3, "month")
        .format("YYYY-MM-DD");
      const qEnd = dayjs(`${currentYear}-01-01`)
        .add(period.quarter * 3 - 1, "month")
        .endOf("month")
        .format("YYYY-MM-DD");
      const income = entries
        .filter((e) => e.date >= qStart && e.date <= qEnd)
        .reduce((sum, e) => sum + e.amount, 0);
      return { ...period, income, taxEstimate: getQuarterlyTaxEstimate(income, country) };
    });
  }, [taxPeriods, entries, currentYear, country]);

  const nextDeadlineAmount = nextDeadline
    ? quarterlyIncome.find((q) => q.quarter === nextDeadline.quarter)?.taxEstimate ?? 0
    : 0;

  const handleMarkPaid = async (id: string) => {
    await markTaxReminderPaid(id);
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, isPaid: true } : r)));
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const yearExpenses = expenses.filter((e) => new Date(e.date).getFullYear() === currentYear);
      const totalExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0);
      const deductibleExpenses = yearExpenses.filter((e) => e.isTaxDeductible).reduce((s, e) => s + e.amount, 0);

      const catMap = new Map<string, number>();
      yearExpenses.forEach((e) => {
        catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
      });
      const expensesByCategory = Array.from(catMap.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      const quartersWithStatus = quarterlyIncome.map((q) => {
        const reminder = reminders.find((r) => r.quarter === q.quarter && r.year === currentYear);
        return { ...q, isPaid: reminder?.isPaid ?? false };
      });

      await generateTaxReportPDF({
        year: currentYear,
        userName:           user?.name ?? "",
        userEmail:          user?.email ?? "",
        country,
        currency:           user?.currency ?? "EUR",
        quarters:           quartersWithStatus,
        totalIncome:        quarterlyIncome.reduce((s, q) => s + q.income, 0),
        totalTax:           quarterlyIncome.reduce((s, q) => s + q.taxEstimate, 0),
        totalExpenses,
        deductibleExpenses,
        expensesByCategory,
      });
    } finally {
      setExporting(false);
    }
  };

  const getPeriodStatus = (dueDate: string, isPaid: boolean) => {
    if (isPaid) return "paid";
    if (dueDate < today) return "overdue";
    const daysUntil = dayjs(dueDate).diff(dayjs(today), "day");
    if (daysUntil <= 30) return "soon";
    return "upcoming";
  };

  const statusConfig = {
    paid: { color: "#22C55E", bg: "#22C55E15", border: "#22C55E30", icon: CheckCircle2, label: "Paid" },
    overdue: { color: "#f87171", bg: "#ef444415", border: "#ef444430", icon: AlertTriangle, label: "Overdue" },
    soon: { color: "#fbbf24", bg: "#f59e0b15", border: "#f59e0b30", icon: Clock, label: "Due soon" },
    upcoming: { color: "#94a3b8", bg: "#ffffff08", border: "var(--border-col)", icon: Calendar, label: "Upcoming" },
  };

  return (
    <AppShell title="Tax Calendar">
      <ProGateModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        feature="Advanced Tax Planning"
        description="Get quarterly tax estimates, deadline reminders, and optimization strategies. Stay compliant with local tax regulations and reduce your tax burden."
      />
      <div className="p-5 lg:p-6 space-y-5">

        {/* Page header + export */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Tax Calendar</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Quarterly estimates for {country} · {currentYear}
            </p>
          </div>
          <Button
            onClick={handleExportPDF}
            disabled={isLoading || exporting}
            size="sm"
            className="font-semibold flex items-center gap-1.5"
            style={{ background: "#22C55E", color: "#0f172a" }}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? "Generating…" : "Export for accountant"}
          </Button>
        </div>

        {/* Summary banner */}
        {nextDeadline && (
          <div
            className="rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
          >
            <div>
              <p className="text-xs font-medium mb-1">Next payment due</p>
              <p className="text-base font-semibold text-white">
                {dayjs(nextDeadline.dueDate).format("MMMM D, YYYY")}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                Estimated {formatCurrency(nextDeadlineAmount, user?.currency ?? "EUR")} based on your income so far
              </p>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: "#fbbf2420", border: "1px solid #f59e0b30" }}
            >
              <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-300">
                {dayjs(nextDeadline.dueDate).diff(dayjs(today), "day")} days left
              </span>
            </div>
          </div>
        )}

        {/* Tax Planning (Pro) */}
        <div
          className="rounded-xl p-5 border-l-4"
          style={{ background: "var(--bg-card)", borderColor: "#fbbf24", borderTopColor: "var(--border-col)", borderRightColor: "var(--border-col)", borderBottomColor: "var(--border-col)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: "#fbbf24" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Tax Planning & Optimization</p>
              {!user?.isPro && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#fbbf2430", color: "#fbbf24" }}>
                  <Lock className="h-3 w-3" />
                  Pro
                </span>
              )}
            </div>
            {!user?.isPro && (
              <button
                onClick={() => setShowProModal(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "#fbbf2420", color: "#fbbf24" }}
              >
                Unlock →
              </button>
            )}
          </div>
          {user?.isPro ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Optimize your tax planning with deduction recommendations, quarterly strategy tips, and compliance calendars specific to {country}.
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Get personalized tax optimization strategies, deduction recommendations, and compliance tips for {country}.
            </p>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-3">
          {quarterlyIncome.map((period) => {
            const reminder = reminders.find((r) => r.quarter === period.quarter && r.year === currentYear);
            const isPaid = reminder?.isPaid ?? false;
            const status = getPeriodStatus(period.dueDate, isPaid);
            const cfg = statusConfig[status];
            const Icon = cfg.icon;

            return (
              <div
                key={period.quarter}
                className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                {/* Quarter label + icon */}
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.color}20` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{period.label}</p>
                    <p className="text-xs" style={{ color: cfg.color }}>
                      Due {dayjs(period.dueDate).format("MMMM D, YYYY")} · {cfg.label}
                    </p>
                  </div>
                </div>

                {/* Income + estimate */}
                <div className="sm:text-right space-y-0.5">
                  <p className="text-sm text-slate-400">
                    Income: <span className="text-white font-medium">{formatCurrency(period.income, user?.currency ?? "EUR")}</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    Est. tax: <span className="font-semibold" style={{ color: cfg.color }}>{formatCurrency(period.taxEstimate, user?.currency ?? "EUR")}</span>
                  </p>
                </div>

                {/* Mark paid */}
                {!isPaid && reminder && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--border-col)] hover:border-[var(--border-col)] flex-shrink-0"
                    onClick={() => handleMarkPaid(reminder.id)}
                  >
                    Mark paid
                  </Button>
                )}
                {isPaid && (
                  <span className="text-xs font-medium flex-shrink-0" style={{ color: "#22C55E" }}>
                    Paid
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Breakdown table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-col)" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border-col)" }}>
            <h3 className="text-sm font-semibold text-white">Quarterly breakdown</h3>
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Quarter", "Income earned", "Tax rate", "Set aside", "Due date", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-5 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quarterlyIncome.map((period, idx) => {
                  const reminder = reminders.find((r) => r.quarter === period.quarter && r.year === currentYear);
                  const isPaid = reminder?.isPaid ?? false;
                  const status = getPeriodStatus(period.dueDate, isPaid);
                  const cfg = statusConfig[status];
                  const rate = period.income > 0 ? period.taxEstimate / period.income : getQuarterlyTaxEstimate(1, country);
                  return (
                    <tr
                      key={period.quarter}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: idx < quarterlyIncome.length - 1 ? "1px solid var(--border-col)30" : "none" }}
                    >
                      <td className="px-5 py-3 text-sm font-medium text-white">{period.label}</td>
                      <td className="px-5 py-3 text-sm text-slate-300">{formatCurrency(period.income, user?.currency ?? "EUR")}</td>
                      <td className="px-5 py-3 text-sm text-slate-400">{Math.round(rate * 100)}%</td>
                      <td className="px-5 py-3 text-sm font-semibold text-white">{formatCurrency(period.taxEstimate, user?.currency ?? "EUR")}</td>
                      <td className="px-5 py-3 text-sm text-slate-400">{dayjs(period.dueDate).format("MMM D, YYYY")}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "#ffffff08", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs text-slate-500 leading-relaxed">
            Tax estimates are based on simplified brackets for <strong className="text-slate-400">{country}</strong>.
            Consult a local accountant for exact amounts. MyStackd does not provide tax advice.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
