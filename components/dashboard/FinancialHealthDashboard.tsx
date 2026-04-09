"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { User, IncomeEntry, Expense } from "@/lib/mock-data";
import { calculateTaxEstimate, formatCurrency, getMonthsElapsed } from "@/lib/calculations";

interface FinancialHealthDashboardProps {
  user: User | null;
  entries: IncomeEntry[];
  expenses: Expense[];
}

function getCurrencySymbol(currency: string): string {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(0)
      .replace(/[\d,.\s]/g, "")
      .trim() || currency
  );
}

function CustomTooltip({
  active,
  payload,
  label,
  currency = "EUR",
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
  currency?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-sm"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
      }}
    >
      <p className="font-semibold mb-2 text-xs" style={{ color: "#0f172a" }}>
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs" style={{ color: "#475569" }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold ml-auto pl-4" style={{ color: "#0f172a" }}>
            {formatCurrency(p.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FinancialHealthDashboard({
  user,
  entries,
  expenses,
}: FinancialHealthDashboardProps) {
  const { chartData, thisMonthIncome, thisMonthExpenses, lastMonthIncome, lastMonthExpenses, avgIncome, avgExpenses, quarterlyTax, coverageRatio } = useMemo(() => {
    const now = dayjs();
    const months = Array.from({ length: 12 }, (_, i) =>
      now.subtract(11 - i, "month")
    );

    const chartData = months.map((m) => {
      const monthIncome = entries
        .filter((e) => dayjs(e.date).isSame(m, "month"))
        .reduce((s, e) => s + (e.amountInHomeCurrency ?? e.amount), 0);

      const monthExpenses = expenses
        .filter((e) => dayjs(e.date).isSame(m, "month"))
        .reduce((s, e) => s + e.amount, 0);

      return {
        month: m.format("MMM"),
        income: monthIncome,
        expenses: monthExpenses,
      };
    });

    // Current month
    const thisMonthEntries = entries.filter((e) =>
      dayjs(e.date).isSame(now, "month")
    );
    const thisMonthIncome = thisMonthEntries.reduce(
      (s, e) => s + (e.amountInHomeCurrency ?? e.amount),
      0
    );
    const thisMonthExpenseList = expenses.filter((e) =>
      dayjs(e.date).isSame(now, "month")
    );
    const thisMonthExpenses = thisMonthExpenseList.reduce((s, e) => s + e.amount, 0);

    // Last month
    const lastMonth = now.subtract(1, "month");
    const lastMonthEntries = entries.filter((e) =>
      dayjs(e.date).isSame(lastMonth, "month")
    );
    const lastMonthIncome = lastMonthEntries.reduce(
      (s, e) => s + (e.amountInHomeCurrency ?? e.amount),
      0
    );
    const lastMonthExpenseList = expenses.filter((e) =>
      dayjs(e.date).isSame(lastMonth, "month")
    );
    const lastMonthExpenses = lastMonthExpenseList.reduce((s, e) => s + e.amount, 0);

    // 3-month average
    const last3Months = chartData.slice(-3);
    const avgIncome = last3Months.reduce((s, m) => s + m.income, 0) / 3;
    const avgExpenses = last3Months.reduce((s, m) => s + m.expenses, 0) / 3;

    // Tax estimate for quarterly
    const annualIncome = entries.reduce((s, e) => s + (e.amountInHomeCurrency ?? e.amount), 0);
    const { annualTax } = calculateTaxEstimate(annualIncome, user?.country ?? "US");
    const quarterlyTax = annualTax / 4;

    // Coverage ratio (runway)
    const fixedMonthly =
      (user?.monthlyExpenses.rent ?? 0) +
      (user?.monthlyExpenses.subscriptions ?? 0) +
      (user?.monthlyExpenses.other ?? 0);
    const coverageRatio = fixedMonthly > 0 ? avgIncome / fixedMonthly : 0;

    return {
      chartData,
      thisMonthIncome,
      thisMonthExpenses,
      lastMonthIncome,
      lastMonthExpenses,
      avgIncome,
      avgExpenses,
      quarterlyTax,
      coverageRatio,
    };
  }, [entries, expenses, user]);

  const currency = user?.currency ?? "EUR";
  const avgMonthlyNet = avgIncome - avgExpenses;
  const projected6m = avgMonthlyNet * 6;

  // Coverage status
  const coverageStatus = () => {
    if (coverageRatio >= 3) return { label: "Strong", color: "#22C55E" };
    if (coverageRatio >= 1.5) return { label: "Adequate", color: "#F59E0B" };
    return { label: "Tight", color: "#EF4444" };
  };

  const coverage = coverageStatus();

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-col)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="mb-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Financial Health
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          12-month income vs expenses
        </p>
      </div>

      {/* Area Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={chartData}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickFormatter={(v) => {
              const sym = getCurrencySymbol(currency);
              return v >= 1000 ? `${sym}${(v / 1000).toFixed(0)}k` : `${sym}${v}`;
            }}
          />
          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{ fill: "#0f172a08" }}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#22C55E"
            fillOpacity={1}
            fill="url(#colorIncome)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#EF4444"
            fillOpacity={1}
            fill="url(#colorExpenses)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Sub-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        {/* Cash flow projection */}
        <div
          className="rounded-lg p-3"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            6-month projection
          </p>
          <div className="flex items-center gap-2 mt-1">
            {projected6m >= 0 ? (
              <TrendingUp className="w-4 h-4" style={{ color: "#22C55E" }} />
            ) : (
              <TrendingDown className="w-4 h-4" style={{ color: "#EF4444" }} />
            )}
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {formatCurrency(projected6m, currency)}
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            At current rate
          </p>
        </div>

        {/* Quarterly tax liability */}
        <div
          className="rounded-lg p-3"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Quarterly tax due
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
            {formatCurrency(quarterlyTax, currency)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Per quarter estimate
          </p>
        </div>

        {/* Runway indicator */}
        <div
          className="rounded-lg p-3"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Coverage ratio
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: coverage.color }}>
            {coverageRatio.toFixed(1)}x — {coverage.label}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Monthly income / fixed costs
          </p>
        </div>
      </div>
    </div>
  );
}
