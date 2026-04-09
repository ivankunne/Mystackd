"use client";

import type { IncomeEntry, Expense } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/calculations";
import { useAppearance } from "@/lib/context/AppearanceContext";
import { formatFxLine } from "@/lib/fx";

const SOURCE_COLORS: Record<string, string> = {
  stripe: "#635BFF",
  paypal: "#0070E0",
  upwork: "#14A800",
  fiverr: "#1DBF73",
  manual: "#94a3b8",
};

const SOURCE_LABELS: Record<string, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  upwork: "Upwork",
  fiverr: "Fiverr",
  manual: "Manual",
};

const CATEGORY_LABELS: Record<string, string> = {
  software:  "Software",
  hardware:  "Hardware",
  travel:    "Travel",
  coworking: "Coworking",
  marketing: "Marketing",
  education: "Education",
  fees:      "Fees",
  other:     "Other",
};

type ActivityItem =
  | { kind: "income"; entry: IncomeEntry; sortDate: number }
  | { kind: "expense"; expense: Expense; sortDate: number };

interface RecentTransactionsProps {
  entries: IncomeEntry[];
  expenses?: Expense[];
  limit?: number;
}

export function RecentTransactions({ entries, expenses = [], limit = 10 }: RecentTransactionsProps) {
  const { dateFormat } = useAppearance();

  const activity: ActivityItem[] = [
    ...entries.map((e) => ({
      kind:     "income" as const,
      entry:    e,
      sortDate: new Date(e.date).getTime(),
    })),
    ...expenses.map((e) => ({
      kind:     "expense" as const,
      expense:  e,
      sortDate: new Date(e.date).getTime(),
    })),
  ]
    .sort((a, b) => b.sortDate - a.sortDate)
    .slice(0, limit);

  const title    = expenses.length > 0 ? "Recent Activity" : "Recent Transactions";
  const subTitle = expenses.length > 0 ? `Last ${limit} income & expense entries` : `Last ${limit} entries`;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-col)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border-col)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subTitle}</p>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
              <th className="text-left text-xs font-semibold px-5 py-2.5" style={{ color: "var(--text-muted)" }}>Date</th>
              <th className="text-left text-xs font-semibold px-5 py-2.5" style={{ color: "var(--text-muted)" }}>Type</th>
              <th className="text-left text-xs font-semibold px-5 py-2.5" style={{ color: "var(--text-muted)" }}>Description</th>
              <th className="text-right text-xs font-semibold px-5 py-2.5" style={{ color: "var(--text-muted)" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((item, idx) => {
              const isLast = idx === activity.length - 1;
              if (item.kind === "income") {
                const { entry } = item;
                return (
                  <tr
                    key={`inc-${entry.id}`}
                    className="transition-colors"
                    style={{ borderBottom: !isLast ? "1px solid var(--border-col)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-5 py-3 text-sm whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {formatDate(entry.date, dateFormat)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${SOURCE_COLORS[entry.source]}18`,
                          color: SOURCE_COLORS[entry.source] ?? "#64748b",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: SOURCE_COLORS[entry.source] ?? "#64748b" }} />
                        {SOURCE_LABELS[entry.source] ?? entry.source}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm max-w-[220px] truncate" style={{ color: "var(--text-secondary)" }}>
                      <span className="flex items-center gap-1.5">
                        {entry.clientName
                          ? <>{entry.clientName}{entry.note ? <span style={{ color: "var(--text-muted)" }}>· {entry.note}</span> : null}</>
                          : entry.note || "—"}
                        {entry.isRecurring && (
                          <span
                            title="Recurring"
                            className="text-xs px-1 py-0.5 rounded font-semibold"
                            style={{ background: "#dcfce7", color: "#16a34a" }}
                          >
                            ↻
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div>
                        <span className="text-sm font-semibold" style={{ color: "#16a34a" }}>
                          +{formatCurrency(entry.amount, entry.currency)}
                        </span>
                        {entry.fxRate && entry.currency !== "EUR" && (
                          <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {formatFxLine(entry.amount, entry.currency, "EUR")}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }

              const { expense } = item;
              return (
                <tr
                  key={`exp-${expense.id}`}
                  className="transition-colors"
                  style={{ borderBottom: !isLast ? "1px solid var(--border-col)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-5 py-3 text-sm whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {formatDate(expense.date, dateFormat)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "#fee2e2", color: "#dc2626" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#dc2626" }} />
                      {CATEGORY_LABELS[expense.category] ?? expense.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm max-w-[220px] truncate" style={{ color: "var(--text-secondary)" }}>
                    <span className="flex items-center gap-1.5">
                      {expense.description || "—"}
                      {expense.vendor && (
                        <span style={{ color: "var(--text-muted)" }}>· {expense.vendor}</span>
                      )}
                      {expense.isTaxDeductible && (
                        <span
                          title="Tax deductible"
                          className="text-xs px-1 py-0.5 rounded font-semibold"
                          style={{ background: "#dcfce7", color: "#16a34a" }}
                        >
                          ✓ deductible
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <span className="text-sm font-semibold" style={{ color: "#dc2626" }}>
                      -{formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden divide-y" style={{ borderColor: "var(--border-col)" }}>
        {activity.map((item) => {
          if (item.kind === "income") {
            const { entry } = item;
            return (
              <div key={`inc-${entry.id}`} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `${SOURCE_COLORS[entry.source]}18`,
                        color: SOURCE_COLORS[entry.source] ?? "#64748b",
                      }}
                    >
                      {SOURCE_LABELS[entry.source] ?? entry.source}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDate(entry.date, dateFormat)}
                    </span>
                    {entry.clientName && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {entry.clientName}</span>
                    )}
                    {entry.isRecurring && (
                      <span className="text-xs px-1 py-0.5 rounded font-semibold" style={{ background: "#dcfce7", color: "#16a34a" }}>↻</span>
                    )}
                  </div>
                  <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{entry.note || "—"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: "#16a34a" }}>
                    +{formatCurrency(entry.amount, entry.currency)}
                  </span>
                  {entry.fxRate && entry.currency !== "EUR" && (
                    <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {formatFxLine(entry.amount, entry.currency, "EUR")}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          const { expense } = item;
          return (
            <div key={`exp-${expense.id}`} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#fee2e2", color: "#dc2626" }}
                  >
                    {CATEGORY_LABELS[expense.category] ?? expense.category}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatDate(expense.date, dateFormat)}
                  </span>
                  {expense.vendor && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {expense.vendor}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>{expense.description || "—"}</p>
                  {expense.isTaxDeductible && (
                    <span className="text-xs px-1 py-0.5 rounded font-semibold flex-shrink-0" style={{ background: "#dcfce7", color: "#16a34a" }}>✓</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: "#dc2626" }}>
                  -{formatCurrency(expense.amount, expense.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activity.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No activity yet</p>
        </div>
      )}
    </div>
  );
}
