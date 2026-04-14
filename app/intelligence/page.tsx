"use client";

import { useEffect, useState, useRef } from "react";
import dayjs from "dayjs";
import { TrendingUp, TrendingDown, Users, Shield, FileDown, Zap, Star, Info } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProBlurOverlay } from "@/components/dashboard/ProBlurOverlay";
import { useAuth } from "@/lib/context/AuthContext";
import { getInvoices } from "@/lib/data/invoices";
import { getIncomeEntries } from "@/lib/data/income";
import { getExpenses } from "@/lib/data/expenses";
import { getTimeEntries } from "@/lib/data/time";
import { formatCurrency, calculateTaxEstimate } from "@/lib/calculations";
import type { Invoice, IncomeEntry, Expense, TimeEntry } from "@/lib/mock-data";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClientProfitability {
  clientName: string;
  totalIncome: number;
  totalMinutes: number;
  effectiveRate: number; // income per hour
  invoiceCount: number;
}

// ─── CSV export helper ─────────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ children, title, icon: Icon, accent, locked, lockLabel }: {
  children: React.ReactNode;
  title: string;
  icon: React.ElementType;
  accent: string;
  locked?: boolean;
  lockLabel?: string;
}) {
  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border-col)",
        borderRight: "1px solid var(--border-col)",
        borderBottom: "1px solid var(--border-col)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon className="h-4 w-4" style={{ color: accent }} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h2>
      </div>
      {locked ? (
        <ProBlurOverlay label={lockLabel ?? "This section requires Pro"}>{children}</ProBlurOverlay>
      ) : children}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded animate-pulse bg-white/5 ${className ?? ""}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "EUR";
  const country = user?.country ?? "NL";
  const monthlyFixedExpenses =
    (user?.monthlyExpenses.rent ?? 0) +
    (user?.monthlyExpenses.subscriptions ?? 0) +
    (user?.monthlyExpenses.other ?? 0);

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

  // Runway savings input
  const [savings, setSavings] = useState<string>("");

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      getInvoices(user.id),
      getIncomeEntries(user.id),
      getExpenses(user.id),
      getTimeEntries(user.id),
    ]).then(([inv, inc, exp, time]) => {
      setInvoices(inv);
      setIncome(inc);
      setExpenses(exp);
      setTimeEntries(time);
      setLoading(false);
    }).catch((error) => {
      console.error("Failed to load intelligence data:", error);
      setLoading(false);
    });
  }, [user?.id]);

  // ─── Cash Flow Forecast ───────────────────────────────────────────────────

  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const outstandingTotal = outstanding.reduce((s, i) => s + i.total, 0);

  const now = dayjs();
  const threeMonthsAgo = now.subtract(3, "month").format("YYYY-MM-DD");
  const recentIncome = income.filter((e) => e.date >= threeMonthsAgo && e.status === "settled");
  const avgMonthlyIncome = recentIncome.reduce((s, e) => s + e.amount, 0) / 3;

  // 90-day projection: outstanding invoices + 3 months of avg income
  const projectedEarnings = outstandingTotal + avgMonthlyIncome * 3;

  // Month-by-month forecast for the next 3 months
  const forecastMonths = [1, 2, 3].map((offset) => {
    const m = now.add(offset, "month");
    return {
      label: m.format("MMM YYYY"),
      amount: avgMonthlyIncome + (offset === 1 ? outstandingTotal : 0),
    };
  });

  // ─── Client Profitability ─────────────────────────────────────────────────
  // Key by clientId when available; fall back to clientName so renames/dupes don't
  // create phantom entries. We keep a display name map keyed by the same ID.

  const clientMap: Record<string, { income: number; minutes: number; invoiceCount: number; displayName: string }> = {};

  const clientKey = (id: string | undefined, name: string | undefined) =>
    (id || name || "").trim() || "Unknown";

  for (const entry of income) {
    if (!entry.clientName && !entry.clientId) continue;
    const key = clientKey(entry.clientId, entry.clientName);
    if (!clientMap[key]) clientMap[key] = { income: 0, minutes: 0, invoiceCount: 0, displayName: entry.clientName ?? key };
    clientMap[key].income += entry.amount;
    clientMap[key].invoiceCount++;
  }

  // Time entries contribute minutes/hours but not income (income entries are the source of truth)
  for (const entry of timeEntries) {
    if (!entry.clientName) continue;
    const key = clientKey(undefined, entry.clientName);
    if (!clientMap[key]) clientMap[key] = { income: 0, minutes: 0, invoiceCount: 0, displayName: entry.clientName };
    clientMap[key].minutes += entry.durationMinutes;
  }

  const clientProfitability: ClientProfitability[] = Object.entries(clientMap)
    .filter(([, v]) => v.income > 0 || v.minutes > 0)
    .map(([, v]) => ({
      clientName: v.displayName,
      totalIncome: v.income,
      totalMinutes: v.minutes,
      effectiveRate: v.minutes > 0 ? (v.income / (v.minutes / 60)) : 0,
      invoiceCount: v.invoiceCount,
    }))
    .sort((a, b) => b.effectiveRate - a.effectiveRate);

  const bestClientByRate = clientProfitability[0];
  const worstClient = clientProfitability[clientProfitability.length - 1];

  // Best client by total revenue (separate from hourly-rate ranking)
  const bestClientByRevenue = [...clientProfitability].sort((a, b) => b.totalIncome - a.totalIncome)[0] ?? null;

  // ─── Best Month ───────────────────────────────────────────────────────────

  const monthlyIncomeTotals: Record<string, number> = {};
  for (const entry of income) {
    if (entry.status !== "settled") continue;
    const key = dayjs(entry.date).format("YYYY-MM");
    monthlyIncomeTotals[key] = (monthlyIncomeTotals[key] ?? 0) + entry.amount;
  }
  const sortedMonths = Object.entries(monthlyIncomeTotals).sort((a, b) => b[1] - a[1]);
  const bestMonth = sortedMonths[0] ?? null;
  const bestMonthLabel = bestMonth ? dayjs(bestMonth[0]).format("MMMM YYYY") : null;
  const bestMonthAmount = bestMonth ? bestMonth[1] : 0;

  // ─── Income Velocity (month-over-month) ───────────────────────────────────

  const last6Months = Array.from({ length: 6 }, (_, i) =>
    now.subtract(5 - i, "month").format("YYYY-MM")
  );
  const last6Data = last6Months.map((m) => ({
    label: dayjs(m).format("MMM"),
    amount: monthlyIncomeTotals[m] ?? 0,
  }));

  const currentMonthIncome = monthlyIncomeTotals[now.format("YYYY-MM")] ?? 0;
  const prevMonthIncome = monthlyIncomeTotals[now.subtract(1, "month").format("YYYY-MM")] ?? 0;
  const momChange = prevMonthIncome > 0
    ? ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100
    : null;

  // Velocity direction over last 6 months (simple linear regression slope sign)
  const velocityMonths = last6Data.filter((d) => d.amount > 0);
  let velocityTrend: "up" | "down" | "flat" | null = null;
  if (velocityMonths.length >= 3) {
    const n = velocityMonths.length;
    const xMean = (n - 1) / 2;
    const yMean = velocityMonths.reduce((s, d) => s + d.amount, 0) / n;
    let num = 0, den = 0;
    velocityMonths.forEach((d, i) => {
      num += (i - xMean) * (d.amount - yMean);
      den += (i - xMean) ** 2;
    });
    const slope = den > 0 ? num / den : 0;
    velocityTrend = slope > yMean * 0.02 ? "up" : slope < -yMean * 0.02 ? "down" : "flat";
  }

  // ─── Hourly Rate Trend (last 6 months) ────────────────────────────────────

  const monthlyMinutes: Record<string, number> = {};
  for (const entry of timeEntries) {
    const key = dayjs(entry.date).format("YYYY-MM");
    monthlyMinutes[key] = (monthlyMinutes[key] ?? 0) + entry.durationMinutes;
  }

  const hourlyTrend = last6Months.map((m) => {
    const inc = monthlyIncomeTotals[m] ?? 0;
    const mins = monthlyMinutes[m] ?? 0;
    const rate = mins > 0 ? inc / (mins / 60) : 0;
    return { label: dayjs(m).format("MMM"), rate, hasData: mins > 0 };
  });

  const hourlyTrendWithData = hourlyTrend.filter((h) => h.hasData);
  const latestRate = hourlyTrendWithData[hourlyTrendWithData.length - 1]?.rate ?? 0;
  const earliestRate = hourlyTrendWithData[0]?.rate ?? 0;
  const rateTrend: "up" | "down" | "flat" | null =
    hourlyTrendWithData.length >= 2
      ? latestRate > earliestRate * 1.02 ? "up"
        : latestRate < earliestRate * 0.98 ? "down"
        : "flat"
      : null;
  const maxRate = Math.max(...hourlyTrend.map((h) => h.rate), 1);

  // ─── Runway Calculator ────────────────────────────────────────────────────

  const last3MonthsExpenses = expenses.filter((e) => e.date >= threeMonthsAgo);
  const avgMonthlyTrackedExpenses = last3MonthsExpenses.reduce((s, e) => s + e.amount, 0) / 3;
  const totalMonthlyBurn = monthlyFixedExpenses + avgMonthlyTrackedExpenses;

  const savingsNum = parseFloat(savings) || 0;
  const runwayMonths = totalMonthlyBurn > 0 ? savingsNum / totalMonthlyBurn : null;

  // ─── Year-end Report ──────────────────────────────────────────────────────

  const currentYear = now.year();
  const yearIncome = income.filter((e) => dayjs(e.date).year() === currentYear && e.status === "settled");
  const yearExpenses = expenses.filter((e) => dayjs(e.date).year() === currentYear);
  const yearPaidInvoices = invoices.filter((i) => i.status === "paid" && dayjs(i.issueDate).year() === currentYear);

  const totalYearIncome = yearIncome.reduce((s, e) => s + e.amount, 0);
  const totalYearExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0);
  const taxEstimate = calculateTaxEstimate(totalYearIncome, country);
  const netProfit = totalYearIncome - totalYearExpenses - taxEstimate.annualTax;

  function handleDownloadReport() {
    // Income by source
    const incomeBySource: Record<string, number> = {};
    for (const e of yearIncome) {
      incomeBySource[e.source] = (incomeBySource[e.source] ?? 0) + e.amount;
    }

    // Expenses by category
    const expensesByCategory: Record<string, number> = {};
    for (const e of yearExpenses) {
      expensesByCategory[e.category] = (expensesByCategory[e.category] ?? 0) + e.amount;
    }

    // Quarterly breakdown
    const quarterly: Record<string, { income: number; expenses: number }> = {};
    for (const e of yearIncome) {
      const q = `Q${Math.ceil((dayjs(e.date).month() + 1) / 3)} ${currentYear}`;
      if (!quarterly[q]) quarterly[q] = { income: 0, expenses: 0 };
      quarterly[q].income += e.amount;
    }
    for (const e of yearExpenses) {
      const q = `Q${Math.ceil((dayjs(e.date).month() + 1) / 3)} ${currentYear}`;
      if (!quarterly[q]) quarterly[q] = { income: 0, expenses: 0 };
      quarterly[q].expenses += e.amount;
    }

    const rows: string[][] = [];

    rows.push([`MyStackd Year-End Report — ${currentYear}`]);
    rows.push([`Generated: ${dayjs().format("MMMM D, YYYY")}`]);
    rows.push([]);

    rows.push(["SUMMARY"]);
    rows.push(["Total Income", String(totalYearIncome), currency]);
    rows.push(["Total Expenses", String(totalYearExpenses), currency]);
    rows.push(["Estimated Tax", String(taxEstimate.annualTax), currency]);
    rows.push(["Net Profit", String(netProfit), currency]);
    rows.push([]);

    rows.push(["INCOME BY SOURCE"]);
    rows.push(["Source", "Amount", "Currency"]);
    for (const [source, amount] of Object.entries(incomeBySource)) {
      rows.push([source, String(amount), currency]);
    }
    rows.push([]);

    rows.push(["EXPENSES BY CATEGORY"]);
    rows.push(["Category", "Amount", "Currency"]);
    for (const [cat, amount] of Object.entries(expensesByCategory)) {
      rows.push([cat, String(amount), currency]);
    }
    rows.push([]);

    rows.push(["QUARTERLY BREAKDOWN"]);
    rows.push(["Quarter", "Income", "Expenses", "Net"]);
    for (const [q, data] of Object.entries(quarterly)) {
      rows.push([q, String(data.income), String(data.expenses), String(data.income - data.expenses)]);
    }
    rows.push([]);

    rows.push(["TAX BREAKDOWN"]);
    rows.push(["Component", "Amount"]);
    for (const line of taxEstimate.breakdown) {
      rows.push([line.label, String(line.amount)]);
    }
    rows.push(["Effective Rate", `${(taxEstimate.effectiveRate * 100).toFixed(1)}%`]);

    downloadCSV(rows, `mystackd-report-${currentYear}.csv`);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell title="Financial Intelligence">
    <div className="p-5 lg:p-6 max-w-5xl mx-auto space-y-6">

      {/* Performance Insights */}
      <Section title="Performance Insights" icon={Star} accent="#f59e0b">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Best Month */}
            <div className="rounded-lg p-4" style={{ background: "var(--bg-page)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Best Month</p>
              {bestMonth ? (
                <>
                  <p className="text-lg font-bold text-white">{formatCurrency(bestMonthAmount, currency)}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{bestMonthLabel}</p>
                  {sortedMonths.length > 1 && (
                    <p className="text-xs text-slate-600 mt-2">
                      {sortedMonths.length} months tracked
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">No data yet</p>
              )}
            </div>

            {/* Income Velocity */}
            <div className="rounded-lg p-4" style={{ background: "var(--bg-page)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Income Velocity</p>
              {momChange !== null ? (
                <>
                  <div className="flex items-center gap-1.5">
                    {momChange >= 0
                      ? <TrendingUp className="h-5 w-5" style={{ color: "#22C55E" }} />
                      : <TrendingDown className="h-5 w-5" style={{ color: "#ef4444" }} />
                    }
                    <p className="text-lg font-bold" style={{ color: momChange >= 0 ? "#22C55E" : "#ef4444" }}>
                      {momChange >= 0 ? "+" : ""}{momChange.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">vs last month</p>
                  {velocityTrend && (
                    <p className="text-xs mt-2" style={{ color: velocityTrend === "up" ? "#22C55E" : velocityTrend === "down" ? "#ef4444" : "#94a3b8" }}>
                      6-month trend: {velocityTrend === "up" ? "accelerating" : velocityTrend === "down" ? "slowing" : "stable"}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500">Need 2+ months of data</p>
                  {last6Data.some((d) => d.amount > 0) && (
                    <div className="flex items-end gap-1 mt-3 h-8">
                      {last6Data.map((d) => {
                        const max = Math.max(...last6Data.map((x) => x.amount), 1);
                        const pct = (d.amount / max) * 100;
                        return (
                          <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full rounded-sm" style={{ height: `${Math.max(pct, 4)}%`, background: d.amount > 0 ? "#3B82F6" : "var(--border-col)" }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {momChange !== null && (
                <div className="flex items-end gap-1 mt-3 h-8">
                  {last6Data.map((d) => {
                    const max = Math.max(...last6Data.map((x) => x.amount), 1);
                    const pct = (d.amount / max) * 100;
                    return (
                      <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full rounded-sm" style={{ height: `${Math.max(pct, 4)}%`, background: d.amount > 0 ? "#3B82F6" : "var(--border-col)" }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Hourly Rate Trend */}
            <div className="rounded-lg p-4" style={{ background: "var(--bg-page)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Effective Hourly Rate</p>
              {latestRate > 0 ? (
                <>
                  <div className="flex items-center gap-1.5">
                    {rateTrend === "up" && <TrendingUp className="h-5 w-5" style={{ color: "#22C55E" }} />}
                    {rateTrend === "down" && <TrendingDown className="h-5 w-5" style={{ color: "#ef4444" }} />}
                    {rateTrend === "flat" && <Zap className="h-5 w-5 text-slate-400" />}
                    <p className="text-lg font-bold text-white">{formatCurrency(latestRate, currency)}/hr</p>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: rateTrend === "up" ? "#22C55E" : rateTrend === "down" ? "#ef4444" : "#94a3b8" }}>
                    {rateTrend === "up" ? "trending up" : rateTrend === "down" ? "trending down" : "stable"} over 6 months
                  </p>
                  <div className="flex items-end gap-1 mt-3 h-8">
                    {hourlyTrend.map((h) => {
                      const pct = maxRate > 0 ? (h.rate / maxRate) * 100 : 0;
                      return (
                        <div key={h.label} className="flex-1 flex flex-col items-center gap-0.5" title={h.hasData ? `${h.label}: ${formatCurrency(h.rate, currency)}/hr` : `${h.label}: no data`}>
                          <div
                            className="w-full rounded-sm"
                            style={{
                              height: `${Math.max(h.hasData ? pct : 4, 4)}%`,
                              background: h.hasData
                                ? pct > 66 ? "#22C55E" : pct > 33 ? "#f59e0b" : "#ef4444"
                                : "var(--border-col)",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Track time to see your effective hourly rate.</p>
              )}
            </div>

          </div>
        )}

        {/* Best client callout */}
        {!loading && (bestClientByRevenue || bestClientByRate) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bestClientByRevenue && (
              <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: "var(--bg-page)" }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top client by revenue</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{bestClientByRevenue.clientName}</p>
                </div>
                <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>{formatCurrency(bestClientByRevenue.totalIncome, currency)}</p>
              </div>
            )}
            {bestClientByRate && bestClientByRate.effectiveRate > 0 && (
              <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: "var(--bg-page)" }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top client by rate</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{bestClientByRate.clientName}</p>
                </div>
                <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>{formatCurrency(bestClientByRate.effectiveRate, currency)}/hr</p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Cash Flow Forecast */}
      <Section title="90-Day Cash Flow Forecast" icon={TrendingUp} accent="#3B82F6"
        locked={!user?.isPro} lockLabel="Cash flow forecasting is a Pro feature">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <p className="text-3xl font-bold text-white">
                {formatCurrency(projectedEarnings, currency)}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                projected over the next 90 days
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {forecastMonths.map((m) => (
                <div key={m.label} className="rounded-lg p-4" style={{ background: "var(--bg-page)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    {m.label}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(m.amount, currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-4 border-t" style={{ borderColor: "var(--border-col)" }}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Outstanding invoices</span>
                <span className="text-white font-medium">
                  {formatCurrency(outstandingTotal, currency)}
                  <span className="text-slate-500 font-normal ml-1">({outstanding.length})</span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Avg monthly income (3-month)</span>
                <span className="text-white font-medium">{formatCurrency(avgMonthlyIncome, currency)}</span>
              </div>
            </div>

            {outstanding.length === 0 && avgMonthlyIncome === 0 && (
              <p className="text-sm text-slate-500 mt-3 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Add income entries and invoices to see your forecast.
              </p>
            )}
          </>
        )}
      </Section>

      {/* Client Profitability */}
      <Section title="Client Profitability" icon={Users} accent="#22C55E"
        locked={!user?.isPro} lockLabel="Client profitability analysis is a Pro feature">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : clientProfitability.length === 0 ? (
          <p className="text-sm text-slate-500">
            Track time and add income entries to see client profitability.
          </p>
        ) : (
          <>
            {bestClientByRate && worstClient && bestClientByRate !== worstClient && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="rounded-lg p-4" style={{ background: "#22C55E15", border: "1px solid #22C55E30" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#22C55E" }}>
                    Best client
                  </p>
                  <p className="text-base font-semibold text-white">{bestClientByRate.clientName}</p>
                  <p className="text-sm text-slate-300 mt-0.5">
                    {formatCurrency(bestClientByRate.effectiveRate, currency)}/hr effective
                  </p>
                </div>
                <div className="rounded-lg p-4" style={{ background: "#ef444415", border: "1px solid #ef444430" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#fca5a5" }}>
                    Needs attention
                  </p>
                  <p className="text-base font-semibold text-white">{worstClient.clientName}</p>
                  <p className="text-sm text-slate-300 mt-0.5">
                    {worstClient.effectiveRate > 0
                      ? `${formatCurrency(worstClient.effectiveRate, currency)}/hr effective`
                      : "No hours tracked"}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {clientProfitability.map((c, i) => {
                const maxRate = clientProfitability[0].effectiveRate || 1;
                const pct = maxRate > 0 ? (c.effectiveRate / maxRate) * 100 : 0;
                const hours = c.totalMinutes / 60;
                return (
                  <div
                    key={c.clientName}
                    className="rounded-lg px-4 py-3"
                    style={{ background: "var(--bg-page)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                        <span className="text-sm font-medium text-white">{c.clientName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-white">
                          {c.effectiveRate > 0
                            ? `${formatCurrency(c.effectiveRate, currency)}/hr`
                            : "—"}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          {formatCurrency(c.totalIncome, currency)} · {hours > 0 ? `${hours.toFixed(1)}h` : "no hours"}
                        </span>
                      </div>
                    </div>
                    {c.effectiveRate > 0 && (
                      <div className="h-1 rounded-full" style={{ background: "var(--border-col)" }}>
                        <div
                          className="h-1 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct > 66 ? "#22C55E" : pct > 33 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Section>

      {/* Runway Calculator */}
      <Section title="Runway Calculator" icon={Shield} accent="#f59e0b">
        {loading ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
                  Current savings ({currency})
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={savings}
                  onChange={(e) => setSavings(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Fixed monthly costs</span>
                  <span className="text-white">{formatCurrency(monthlyFixedExpenses, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Avg tracked expenses (3-mo)</span>
                  <span className="text-white">{formatCurrency(avgMonthlyTrackedExpenses, currency)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-3" style={{ borderColor: "var(--border-col)" }}>
                  <span className="text-slate-300">Total monthly burn</span>
                  <span className="text-white">{formatCurrency(totalMonthlyBurn, currency)}</span>
                </div>
              </div>
            </div>

            {savingsNum > 0 && runwayMonths !== null && (
              <div
                className="mt-5 rounded-lg p-4 text-center"
                style={{
                  background: runwayMonths >= 6 ? "#22C55E15" : runwayMonths >= 3 ? "#f59e0b15" : "#ef444415",
                  border: `1px solid ${runwayMonths >= 6 ? "#22C55E30" : runwayMonths >= 3 ? "#f59e0b30" : "#ef444430"}`,
                }}
              >
                <p
                  className="text-4xl font-bold"
                  style={{ color: runwayMonths >= 6 ? "#22C55E" : runwayMonths >= 3 ? "#f59e0b" : "#ef4444" }}
                >
                  {runwayMonths.toFixed(1)}
                </p>
                <p className="text-sm text-slate-400 mt-1">months of runway</p>
                {runwayMonths < 3 && (
                  <p className="text-xs mt-2" style={{ color: "#fca5a5" }}>
                    Less than 3 months — consider reducing burn or securing new clients.
                  </p>
                )}
                {runwayMonths >= 6 && (
                  <p className="text-xs mt-2 text-slate-400">
                    You have a comfortable runway. Keep building.
                  </p>
                )}
              </div>
            )}

            {savingsNum === 0 && (
              <p className="text-sm text-slate-500 mt-4 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Enter your current savings to see how long you can operate without new income.
              </p>
            )}
          </>
        )}
      </Section>

      {/* Year-end Report */}
      <Section title={`${currentYear} Year-End Report`} icon={FileDown} accent="#a78bfa">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-8 w-48" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Total income", value: formatCurrency(totalYearIncome, currency), color: "#22C55E" },
                { label: "Total expenses", value: formatCurrency(totalYearExpenses, currency), color: "#f87171" },
                { label: "Est. tax owed", value: formatCurrency(taxEstimate.annualTax, currency), color: "#94a3b8" },
                { label: "Net profit", value: formatCurrency(netProfit, currency), color: netProfit >= 0 ? "#22C55E" : "#f87171" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg p-3" style={{ background: "var(--bg-page)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{s.label}</p>
                  <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Tax breakdown</p>
              {taxEstimate.breakdown.map((line) => (
                <div key={line.label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{line.label}</span>
                  <span className="text-white">{formatCurrency(line.amount, currency)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: "var(--border-col)" }}>
                <span className="text-slate-400">Effective rate</span>
                <span className="text-white">{(taxEstimate.effectiveRate * 100).toFixed(1)}%</span>
              </div>
            </div>

            {taxEstimate.note && (
              <p className="text-xs text-slate-500 mb-5 flex gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                {taxEstimate.note}
              </p>
            )}

            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ background: "#a78bfa20", color: "#a78bfa", border: "1px solid #a78bfa40" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#a78bfa30")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#a78bfa20")}
            >
              <FileDown className="h-4 w-4" />
              Download CSV report
            </button>
          </>
        )}
      </Section>
    </div>
    </AppShell>
  );
}
