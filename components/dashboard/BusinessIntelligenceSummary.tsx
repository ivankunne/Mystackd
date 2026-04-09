"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { IncomeEntry, Expense } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/calculations";

interface BusinessIntelligenceSummaryProps {
  entries: IncomeEntry[];
  expenses: Expense[];
  currency: string;
  isPro?: boolean;
}

export function BusinessIntelligenceSummary({
  entries,
  expenses,
  currency,
  isPro,
}: BusinessIntelligenceSummaryProps) {
  const {
    bestMonth,
    bestMonthAmount,
    topClient,
    topClientAmount,
    costPerDollar,
    marginTrend,
    marginTrendPositive,
  } = useMemo(() => {
    // Best month: group income by month, find max
    const monthTotals: Record<string, number> = {};
    entries.forEach((e) => {
      const monthKey = dayjs(e.date).format("MMM YYYY");
      monthTotals[monthKey] =
        (monthTotals[monthKey] ?? 0) + (e.amountInHomeCurrency ?? e.amount);
    });

    const bestMonthEntry = Object.entries(monthTotals).sort((a, b) => b[1] - a[1])[0];
    const bestMonth = bestMonthEntry?.[0] ?? "N/A";
    const bestMonthAmount = bestMonthEntry?.[1] ?? 0;

    // Top client: group income by clientName
    const clientTotals: Record<string, number> = {};
    entries.forEach((e) => {
      const client = e.clientName ?? "Unnamed";
      clientTotals[client] =
        (clientTotals[client] ?? 0) + (e.amountInHomeCurrency ?? e.amount);
    });

    const topClientEntry = Object.entries(clientTotals).sort((a, b) => b[1] - a[1])[0];
    const topClient = topClientEntry?.[0] ?? "N/A";
    const topClientAmount = topClientEntry?.[1] ?? 0;

    // Cost per $1 earned
    const totalIncome = entries.reduce((s, e) => s + (e.amountInHomeCurrency ?? e.amount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const costPerDollar = totalIncome > 0 ? (totalExpenses / totalIncome).toFixed(2) : "0.00";

    // Margin trend: current vs prev month
    const now = dayjs();
    const thisMonth = now;
    const lastMonth = now.subtract(1, "month");

    const thisMonthIncome = entries
      .filter((e) => dayjs(e.date).isSame(thisMonth, "month"))
      .reduce((s, e) => s + (e.amountInHomeCurrency ?? e.amount), 0);
    const thisMonthExpenses = expenses
      .filter((e) => dayjs(e.date).isSame(thisMonth, "month"))
      .reduce((s, e) => s + e.amount, 0);
    const thisMonthMargin = thisMonthIncome > 0 ? ((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100 : 0;

    const lastMonthIncome = entries
      .filter((e) => dayjs(e.date).isSame(lastMonth, "month"))
      .reduce((s, e) => s + (e.amountInHomeCurrency ?? e.amount), 0);
    const lastMonthExpenses = expenses
      .filter((e) => dayjs(e.date).isSame(lastMonth, "month"))
      .reduce((s, e) => s + e.amount, 0);
    const lastMonthMargin = lastMonthIncome > 0 ? ((lastMonthIncome - lastMonthExpenses) / lastMonthIncome) * 100 : 0;

    const marginTrend = (thisMonthMargin - lastMonthMargin).toFixed(1);
    const marginTrendPositive = parseFloat(marginTrend) >= 0;

    return {
      bestMonth,
      bestMonthAmount,
      topClient,
      topClientAmount,
      costPerDollar,
      marginTrend,
      marginTrendPositive,
    };
  }, [entries, expenses]);

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
          Business Intelligence
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Key performance indicators
        </p>
      </div>

      {/* 4 KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Best month */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Best month
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
            {bestMonth}
          </p>
          <p className="text-xs mt-1" style={{ color: "#22C55E" }}>
            {formatCurrency(bestMonthAmount, currency)}
          </p>
        </div>

        {/* Top client */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Top client
          </p>
          <p className="text-sm font-semibold mt-1 truncate" style={{ color: "var(--text-primary)" }}>
            {topClient}
          </p>
          <p className="text-xs mt-1" style={{ color: "#3B82F6" }}>
            {formatCurrency(topClientAmount, currency)}
          </p>
        </div>

        {/* Cost per $1 earned */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Cost per {currency[0]}1
          </p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
            {currency[0]}
            {costPerDollar}
          </p>
          <p className="text-xs mt-1" style={{ color: "#8B5CF6" }}>
            Per {currency[0]}1 earned
          </p>
        </div>

        {/* Margin trend */}
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border-col)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Margin trend
          </p>
          <div className="flex items-center gap-2 mt-1">
            {marginTrendPositive ? (
              <TrendingUp className="w-4 h-4" style={{ color: "#22C55E" }} />
            ) : (
              <TrendingDown className="w-4 h-4" style={{ color: "#EF4444" }} />
            )}
            <p className="text-sm font-semibold" style={{
              color: marginTrendPositive ? "#22C55E" : "#EF4444",
            }}>
              {marginTrendPositive ? "+" : ""}{marginTrend}%
            </p>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            vs last month
          </p>
        </div>
      </div>

      {/* Footer link */}
      <Link href="/intelligence" className="text-xs font-semibold hover:underline"
        style={{ color: "#3B82F6" }}>
        View full intelligence report →
      </Link>
    </div>
  );
}
