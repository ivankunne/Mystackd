"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { ProBlurOverlay } from "./ProBlurOverlay";
import {
  calculateTaxEstimate,
  calculateSafeToSpend,
  getMonthsElapsed,
  formatCurrency,
} from "@/lib/calculations";
import { convertCurrency } from "@/lib/fx";
import type { TaxResult } from "@/lib/calculations";
import type { IncomeEntry, Expense, User } from "@/lib/mock-data";

interface HeroNumbersProps {
  user: User;
  entries: IncomeEntry[];
  expenses?: Expense[];
}

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: string;
  subLabel?: string;
  blurred?: boolean;
  blurLabel?: string;
  momChange?: number | null;
  disclaimer?: string;
}

function MomBadge({ change }: { change: number }) {
  const isPositive = change >= 0;
  const arrow = isPositive ? "↑" : "↓";
  const color = isPositive ? "#16a34a" : "#dc2626";
  const bg    = isPositive ? "#dcfce7"  : "#fee2e2";
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full mt-1"
      style={{ color, background: bg }}
    >
      {arrow} {Math.abs(Math.round(change))}% vs last month
    </span>
  );
}

function DisclaimerTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex items-center transition-colors"
        style={{ color: "var(--text-muted)" }}
        aria-label="Tax estimate disclaimer"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 rounded-xl p-3 text-xs leading-relaxed"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-col)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {text}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1"
            style={{
              background: "var(--bg-card)",
              borderRight: "1px solid var(--border-col)",
              borderBottom: "1px solid var(--border-col)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor = "#16a34a",
  subLabel,
  blurred,
  blurLabel,
  momChange,
  disclaimer,
}: StatCardProps) {
  const content = (
    <div>
      <p className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ color: valueColor }}>
        {value}
      </p>
      {subLabel && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {subLabel}
        </p>
      )}
      {momChange !== null && momChange !== undefined && (
        <MomBadge change={momChange} />
      )}
    </div>
  );

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-col)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
        {disclaimer && <DisclaimerTooltip text={disclaimer} />}
      </div>

      {blurred ? (
        <ProBlurOverlay label={blurLabel}>{content}</ProBlurOverlay>
      ) : (
        content
      )}
    </div>
  );
}

export function HeroNumbers({ user, entries, expenses = [] }: HeroNumbersProps) {
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYearNum = now.getFullYear();

  const totalEarned = useMemo(() => {
    return entries
      .filter((e) => new Date(e.date).getFullYear() === currentYear)
      .reduce((sum, e) => sum + convertCurrency(e.amount, e.currency ?? user.currency, user.currency), 0);
  }, [entries, currentYear, user.currency]);

  const monthsElapsed = getMonthsElapsed();

  const annualizedIncome = useMemo(() => {
    if (monthsElapsed === 0) return 0;
    return (totalEarned / monthsElapsed) * 12;
  }, [totalEarned, monthsElapsed]);

  const taxResult: TaxResult = useMemo(
    () => calculateTaxEstimate(annualizedIncome, user.country),
    [annualizedIncome, user.country]
  );

  const taxSetAsideProRated = useMemo(
    () => taxResult.annualTax * (monthsElapsed / 12),
    [taxResult.annualTax, monthsElapsed]
  );

  const trackedExpensesYTD = useMemo(() => {
    return expenses
      .filter((e) => new Date(e.date).getFullYear() === currentYear)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, currentYear]);

  const safeToSpend = useMemo(() => {
    if (expenses.length > 0) {
      return Math.max(0, totalEarned - taxResult.annualTax * (monthsElapsed / 12) - trackedExpensesYTD);
    }
    return calculateSafeToSpend(
      totalEarned,
      taxResult.annualTax,
      user.monthlyExpenses,
      monthsElapsed
    );
  }, [totalEarned, taxResult.annualTax, user.monthlyExpenses, monthsElapsed, expenses, trackedExpensesYTD]);

  const currentMonthTotal = useMemo(() => {
    return entries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYearNum;
      })
      .reduce((sum, e) => sum + convertCurrency(e.amount, e.currency ?? user.currency, user.currency), 0);
  }, [entries, currentMonth, currentYearNum, user.currency]);

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYearNum - 1 : currentYearNum;
  const prevMonthTotal = useMemo(() => {
    return entries
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear;
      })
      .reduce((sum, e) => sum + convertCurrency(e.amount, e.currency ?? user.currency, user.currency), 0);
  }, [entries, prevMonth, prevMonthYear, user.currency]);

  const momChange = useMemo(() => {
    if (prevMonthTotal === 0) return null;
    return ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
  }, [currentMonthTotal, prevMonthTotal]);

  const incomeGoal = user?.incomeGoal;
  const goalProgress = incomeGoal ? Math.min((totalEarned / incomeGoal) * 100, 100) : null;
  const effectivePct = Math.round(taxResult.effectiveRate * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Earned (YTD)"
          value={formatCurrency(totalEarned, user.currency)}
          valueColor="#16a34a"
          subLabel={`${currentYear} year to date`}
          momChange={momChange}
        />
        <StatCard
          label="Tax Set Aside"
          value={formatCurrency(taxSetAsideProRated, user.currency)}
          valueColor="#64748b"
          subLabel={`${effectivePct}% effective rate · ${user.country}`}
          disclaimer={taxResult.note}
          blurred={!user.isPro}
          blurLabel="Tax estimates are a Pro feature"
        />
        <StatCard
          label="Safe to Spend"
          value={formatCurrency(safeToSpend, user.currency)}
          valueColor="#16a34a"
          subLabel={
            expenses.length > 0
              ? `After tax + ${formatCurrency(trackedExpensesYTD, user.currency)} expenses`
              : "After tax + expenses"
          }
          blurred={!user.isPro}
          blurLabel="Safe to spend is a Pro feature"
        />
      </div>

      {/* Annual Goal Progress Bar */}
      {incomeGoal && goalProgress !== null && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-col)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Annual Goal: {formatCurrency(incomeGoal, user.currency)}
            </span>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {Math.round(goalProgress)}% there
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#dcfce7" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${goalProgress}%`, background: "#16a34a" }}
            />
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {formatCurrency(totalEarned, user.currency)} of {formatCurrency(incomeGoal, user.currency)}
            {goalProgress < 100
              ? ` — ${formatCurrency(incomeGoal - totalEarned, user.currency)} remaining`
              : " — Goal reached! 🎉"}
          </p>
        </div>
      )}

      {/* Tax breakdown detail (Pro only) */}
      {user.isPro && taxResult.breakdown.length > 1 && (
        <div
          className="rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-col)",
          }}
        >
          <span className="text-xs w-full mb-1" style={{ color: "var(--text-muted)" }}>
            Tax breakdown ({user.country}):
          </span>
          {taxResult.breakdown.map((line) => (
            <span key={line.label} className="text-xs" style={{ color: "var(--text-secondary)" }}>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatCurrency(line.amount * (monthsElapsed / 12), user.currency)}
              </span>
              {" "}— {line.label} (YTD)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
