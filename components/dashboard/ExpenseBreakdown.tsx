"use client";

import { useMemo } from "react";
import type { Expense, ExpenseCategory } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/calculations";

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  software:   "#635BFF",
  hardware:   "#3B82F6",
  travel:     "#F59E0B",
  coworking:  "#10B981",
  marketing:  "#EF4444",
  education:  "#8B5CF6",
  fees:       "#64748B",
  other:      "#94A3B8",
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  software:   "Software",
  hardware:   "Hardware",
  travel:     "Travel",
  coworking:  "Coworking",
  marketing:  "Marketing",
  education:  "Education",
  fees:       "Fees & Charges",
  other:      "Other",
};

interface ExpenseBreakdownProps {
  expenses: Expense[];
  currency?: string;
}

export function ExpenseBreakdown({ expenses, currency = "EUR" }: ExpenseBreakdownProps) {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const { breakdown, totalYtd, deductibleYtd, totalThisMonth } = useMemo(() => {
    const ytd = expenses.filter((e) => new Date(e.date).getFullYear() === currentYear);

    const byCategory: Record<string, { ytd: number; deductible: number; thisMonth: number }> = {};

    for (const e of ytd) {
      if (!byCategory[e.category]) {
        byCategory[e.category] = { ytd: 0, deductible: 0, thisMonth: 0 };
      }
      byCategory[e.category].ytd += e.amount;
      if (e.isTaxDeductible) byCategory[e.category].deductible += e.amount;
      if (new Date(e.date).getMonth() === currentMonth) {
        byCategory[e.category].thisMonth += e.amount;
      }
    }

    const breakdown = Object.entries(byCategory)
      .map(([cat, vals]) => ({ category: cat as ExpenseCategory, ...vals }))
      .sort((a, b) => b.ytd - a.ytd);

    const totalYtd       = breakdown.reduce((s, b) => s + b.ytd, 0);
    const deductibleYtd  = breakdown.reduce((s, b) => s + b.deductible, 0);
    const totalThisMonth = breakdown.reduce((s, b) => s + b.thisMonth, 0);

    return { breakdown, totalYtd, deductibleYtd, totalThisMonth };
  }, [expenses, currentYear, currentMonth]);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-col)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Expenses
        </h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {currentYear} YTD
        </span>
      </div>

      {/* Total + this month */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-2xl font-bold" style={{ color: "#dc2626" }}>
          -{formatCurrency(totalYtd, currency)}
        </span>
        {totalThisMonth > 0 && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            -{formatCurrency(totalThisMonth, currency)} this month
          </span>
        )}
      </div>

      {/* Tax-deductible callout */}
      {deductibleYtd > 0 && totalYtd > 0 && (
        <div
          className="mb-4 px-3 py-2 rounded-lg text-xs flex items-center justify-between"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
        >
          <span style={{ color: "var(--text-secondary)" }}>Tax-deductible</span>
          <span>
            <span className="font-semibold" style={{ color: "#16a34a" }}>
              {formatCurrency(deductibleYtd, currency)}
            </span>
            <span className="ml-1" style={{ color: "var(--text-muted)" }}>
              ({Math.round((deductibleYtd / totalYtd) * 100)}%)
            </span>
          </span>
        </div>
      )}

      {/* Category breakdown */}
      <div className="space-y-4">
        {breakdown.map(({ category, ytd, thisMonth: catMonth }) => {
          const pct   = totalYtd > 0 ? (ytd / totalYtd) * 100 : 0;
          const color = CATEGORY_COLORS[category] ?? "#94a3b8";

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-sm flex-1 font-medium" style={{ color: "var(--text-secondary)" }}>
                  {CATEGORY_LABELS[category] ?? category}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(ytd, currency)}
                  </span>
                  <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>YTD</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {pct.toFixed(0)}% of total
                </span>
                {catMonth > 0 && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatCurrency(catMonth, currency)} this month
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {breakdown.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>
          No expenses tracked yet
        </p>
      )}
    </div>
  );
}
